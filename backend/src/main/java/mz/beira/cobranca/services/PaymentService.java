package mz.beira.cobranca.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.scheduling.annotation.Scheduled;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import mz.beira.cobranca.dto.PaymentRequest;
import mz.beira.cobranca.dto.PaymentResponse;
import mz.beira.cobranca.dto.WalletSimulationRequest;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.AppSetting;
import mz.beira.cobranca.models.AuditEvent;
import mz.beira.cobranca.models.Payment;
import mz.beira.cobranca.models.Rate;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.AppSettingRepository;
import mz.beira.cobranca.repositories.AuditEventRepository;
import mz.beira.cobranca.repositories.PaymentRepository;
import mz.beira.cobranca.repositories.RateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {
    private static final ZoneId MAPUTO = ZoneId.of("Africa/Maputo");
    private static final List<String> MOBILE_WALLETS = List.of("M-Pesa", "e-Mola", "Mkesh");
    private static final String SIMULATED_CALLBACK_SOURCE = "INTERNAL_WALLET_SIMULATOR";
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final PaymentRepository payments;
    private final RateRepository rates;
    private final AccountRepository accounts;
    private final AppSettingRepository settings;
    private final AuditEventRepository auditEvents;
    private final ObjectMapper objectMapper;
    private final NotificationService notifications;

    public PaymentService(
        PaymentRepository payments,
        RateRepository rates,
        AccountRepository accounts,
        AppSettingRepository settings,
        AuditEventRepository auditEvents,
        ObjectMapper objectMapper,
        NotificationService notifications
    ) {
        this.payments = payments;
        this.rates = rates;
        this.accounts = accounts;
        this.settings = settings;
        this.auditEvents = auditEvents;
        this.objectMapper = objectMapper;
        this.notifications = notifications;
    }

    @Transactional
    public List<PaymentResponse> getPayments(Account account) {
        if (!List.of("ADMIN", "MERCHANT", "FISCAL", "FINANCIAL_MANAGER").contains(account.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil sem acesso a pagamentos.");
        }
        LocalDateTime now = now();
        List<Payment> all = payments.findAllByOrderByIdDesc();
        expireAndBlock(all, now);
        List<Payment> visible = all.stream().filter(payment -> canView(account, payment)).toList();
        return visible.stream().map(PaymentResponse::from).toList();
    }

    @Scheduled(fixedDelayString = "${app.payments.maintenance-interval-ms:300000}")
    @Transactional
    public void maintainPaymentsAndReminders() {
        LocalDateTime current = now();
        List<Payment> all = payments.findAllByOrderByIdDesc();
        expireAndBlock(all, current);
        for (Payment payment : all) {
            LocalDateTime expiresAt = payment.getExpiresAt();
            if (!"Pendente".equals(payment.getStatus())
                || payment.getReminderSentAt() != null
                || expiresAt == null
                || !expiresAt.isAfter(current)
                || expiresAt.isAfter(current.plusHours(24))) {
                continue;
            }
            notifications.notify(
                payment.getAccount(),
                "Lembrete de pagamento",
                "A senha " + payment.getPaymentReference() + " continua por pagar e expira em "
                    + expiresAt + "."
            );
            payment.markReminderSent(current);
        }
    }

    @Transactional
    public PaymentResponse makePayment(Account account, PaymentRequest request) {
        String method = request.method() == null ? "" : request.method().trim();
        if (!"Numerário".equals(method) && !MOBILE_WALLETS.contains(method)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Seleccione numerário ou uma carteira móvel disponível."
            );
        }
        Account lockedAccount = accounts.findByIdForUpdate(account.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida."));
        if (!"MERCHANT".equals(lockedAccount.getRole())
            || lockedAccount.getMarket() == null
            || lockedAccount.getStall() == null
            || lockedAccount.getProduct() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A conta não está associada a um comerciante.");
        }
        if ("Bloqueado".equals(lockedAccount.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O comerciante está bloqueado para novas senhas.");
        }
        String walletPhone = null;
        if (MOBILE_WALLETS.contains(method)) {
            walletPhone = request.phone() == null || request.phone().isBlank()
                ? lockedAccount.getPhone()
                : request.phone().trim();
            if (walletPhone == null || !walletPhone.matches("\\+?[0-9][0-9\\s-]{6,23}")) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Indique um número de telefone válido para a carteira móvel."
                );
            }
        }
        if (!lockedAccount.getMarket().isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O mercado está inactivo e não aceita pagamentos.");
        }

        Rate rate = rates.findByMarketIdAndProductIgnoreCaseAndActiveTrue(
                lockedAccount.getMarket().getId(),
                lockedAccount.getProduct()
            )
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Não existe taxa activa para este negócio."));

        LocalDate today = LocalDate.now(MAPUTO);
        LocalDate start;
        LocalDate end;
        switch (rate.getPeriodicity()) {
            case "Diária" -> {
                start = today;
                end = today;
            }
            case "Semanal" -> {
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = start.plusDays(6);
            }
            case "Mensal" -> {
                start = today.withDayOfMonth(1);
                end = today.with(TemporalAdjusters.lastDayOfMonth());
            }
            default -> throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "A taxa deste comerciante está configurada com um período inválido. Contacte a administração."
            );
        }
        LocalDateTime issuedAt = now();
        List<Payment> previousPayments = payments.findAllByAccountIdOrderByIdDesc(lockedAccount.getId());
        expireAndBlock(previousPayments, issuedAt);
        if ("Bloqueado".equals(lockedAccount.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O comerciante está bloqueado para novas senhas.");
        }
        for (Payment previous : previousPayments) {
            if (start.equals(previous.getPeriodStart())
                && end.equals(previous.getPeriodEnd())
                && !List.of("Expirada", "Cancelada", "Rejeitado").contains(previous.getStatus())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já foi emitida uma senha para este período. Consulte os pagamentos para ver o estado e a validade."
                );
            }
        }

        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        int year = today.getYear();
        Payment payment = new Payment(
            "PAG-" + year + "-" + suffix,
            "TRX-" + year + "-" + suffix,
            lockedAccount,
            lockedAccount.getMarket(),
            lockedAccount.getStall(),
            lockedAccount.getProduct(),
            rate.getPeriodicity(),
            start,
            end,
            rate.getAmount(),
            method,
            issuedAt,
            issuedAt.plusHours(ticketValidityHours())
        );
        payment.setWalletPhone(walletPhone);
        Payment saved = payments.save(payment);
        notifications.notify(
            lockedAccount, "Senha emitida",
            "A senha " + saved.getPaymentReference() + " foi emitida e é válida até "
                + saved.getExpiresAt() + "."
        );
        return PaymentResponse.from(saved);
    }

    @Transactional
    public PaymentResponse simulateWalletCallback(
        Long paymentId,
        WalletSimulationRequest.Outcome outcome,
        Account merchant
    ) {
        requireRole(merchant, "MERCHANT", "Apenas comerciantes podem simular o pagamento da sua senha.");
        Payment payment = lockedPayment(paymentId);
        if (!merchant.getId().equals(payment.getAccount().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A senha não pertence à sua conta.");
        }
        if (!MOBILE_WALLETS.contains(payment.getMethod())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta senha não utiliza uma carteira móvel.");
        }
        expireAndRejectIfDue(payment);
        if (!"Pendente".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta transacção já foi processada.");
        }

        SimulatedWalletCallback callback =
            new SimulatedWalletCallback(payment.getPaymentReference(), outcome, SIMULATED_CALLBACK_SOURCE);
        return processWalletCallback(payment, callback);
    }

    private PaymentResponse processWalletCallback(Payment payment, SimulatedWalletCallback callback) {
        if (!SIMULATED_CALLBACK_SOURCE.equals(callback.source())
            || !payment.getPaymentReference().equals(callback.paymentReference())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A origem da confirmação não é válida.");
        }
        if (callback.outcome() == WalletSimulationRequest.Outcome.CONFIRMED) {
            payment.confirmWallet(now());
            notifications.notify(
                payment.getAccount(), "Pagamento confirmado",
                "A simulação da carteira móvel confirmou a senha " + payment.getPaymentReference() + "."
            );
        } else if (callback.outcome() == WalletSimulationRequest.Outcome.REJECTED) {
            payment.reject("A carteira móvel simulada rejeitou a transacção.");
            notifications.notify(
                payment.getAccount(), "Pagamento rejeitado",
                "A simulação da carteira móvel rejeitou a senha " + payment.getPaymentReference() + "."
            );
        }
        return PaymentResponse.from(payment);
    }

    private record SimulatedWalletCallback(
        String paymentReference,
        WalletSimulationRequest.Outcome outcome,
        String source
    ) {}

    @Transactional
    public PaymentResponse registerCashPayment(Long paymentId, Account fiscal) {
        requireRole(fiscal, "FISCAL", "Apenas fiscais podem registar recebimentos em numerário.");
        Payment payment = lockedPayment(paymentId);
        expireAndRejectIfDue(payment);
        requireMarketAccess(fiscal, payment);
        if (!"Numerário".equals(payment.getMethod())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Esta senha foi emitida para uma carteira móvel e não pode ser registada em numerário."
            );
        }
        if (!"Pendente".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A senha não está pendente de pagamento.");
        }
        payment.registerCash(fiscal, now());
        notifyManagers(payment, "Pagamento a confirmar",
            "O fiscal " + fiscal.getName() + " registou numerário para a senha "
                + payment.getPaymentReference() + ".");
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse confirmCashPayment(Long paymentId, Account manager) {
        requireRole(manager, "FINANCIAL_MANAGER", "Apenas o Gestor Financeiro pode confirmar pagamentos.");
        Payment payment = lockedPayment(paymentId);
        requireMarketAccess(manager, payment);
        if (!"Aguardando confirmação".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O pagamento não está à espera de confirmação.");
        }
        if (payment.getCashier() == null || payment.getCashier().getId().equals(manager.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O responsável pelo registo não pode confirmar o mesmo pagamento.");
        }
        payment.confirm(manager, now());
        notifications.notify(
            payment.getAccount(), "Pagamento confirmado",
            "O pagamento da senha " + payment.getPaymentReference() + " foi confirmado."
        );
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse rejectCashPayment(Long paymentId, String reason, Account manager) {
        requireRole(manager, "FINANCIAL_MANAGER", "Apenas o Gestor Financeiro pode rejeitar pagamentos.");
        Payment payment = lockedPayment(paymentId);
        requireMarketAccess(manager, payment);
        if (!"Aguardando confirmação".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O pagamento não está à espera de confirmação.");
        }
        if (payment.getCashier() == null || payment.getCashier().getId().equals(manager.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O responsável pelo registo não pode rejeitar o mesmo pagamento.");
        }
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o motivo da rejeição.");
        }
        payment.reject(reason.trim());
        notifications.notify(
            payment.getAccount(), "Pagamento rejeitado",
            "O pagamento da senha " + payment.getPaymentReference() + " foi rejeitado. Motivo: "
                + reason.trim()
        );
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse findByReference(String reference, Account account) {
        Payment payment = payments.findByPaymentReferenceIgnoreCase(reference.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Senha não encontrada."));
        expireAndBlock(List.of(payment), now());
        if ("Expirada".equals(payment.getStatus())) payments.save(payment);
        requireMarketAccess(account, payment);
        if ("MERCHANT".equals(account.getRole()) && !account.getId().equals(payment.getAccount().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A senha não pertence à sua conta.");
        }
        return PaymentResponse.from(payment);
    }

    private Payment lockedPayment(Long paymentId) {
        return payments.findByIdForUpdate(paymentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pagamento não encontrado."));
    }

    private void expireAndRejectIfDue(Payment payment) {
        payment.expireIfDue(now());
        if ("Expirada".equals(payment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A senha expirou e não pode ser paga.");
        }
    }

    private boolean canView(Account account, Payment payment) {
        if ("ADMIN".equals(account.getRole())) return true;
        if ("MERCHANT".equals(account.getRole())) {
            return account.getId().equals(payment.getAccount().getId());
        }
        if ("FISCAL".equals(account.getRole())) {
            return account.getMarket() != null
                && account.getMarket().getId().equals(payment.getMarket().getId());
        }
        return "FINANCIAL_MANAGER".equals(account.getRole())
            && (account.getMarket() == null
                || account.getMarket().getId().equals(payment.getMarket().getId()));
    }

    private void requireMarketAccess(Account actor, Payment payment) {
        if (!canView(actor, payment)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A senha não pertence ao seu mercado autorizado.");
        }
    }

    private void requireRole(Account actor, String role, String message) {
        if (!role.equals(actor.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(MAPUTO);
    }

    private void expireAndBlock(List<Payment> tickets, LocalDateTime now) {
        for (Payment payment : tickets) {
            boolean wasPending = "Pendente".equals(payment.getStatus());
            payment.expireIfDue(now);
            if (wasPending && "Expirada".equals(payment.getStatus())) {
                notifications.notify(
                    payment.getAccount(), "Senha expirada",
                    "A senha " + payment.getPaymentReference() + " expirou sem pagamento confirmado."
                );
            }
        }
        Map<Account, Long> expiredByMerchant = tickets.stream()
            .filter(payment -> "Expirada".equals(payment.getStatus()))
            .filter(payment -> {
                LocalDateTime statusUpdatedAt = payment.getAccount().getStatusUpdatedAt();
                return statusUpdatedAt == null || payment.getExpiresAt().isAfter(statusUpdatedAt);
            })
            .collect(Collectors.groupingBy(Payment::getAccount, Collectors.counting()));
        for (Map.Entry<Account, Long> entry : expiredByMerchant.entrySet()) {
            Account merchant = entry.getKey();
            if (entry.getValue() > 3 && !"Bloqueado".equals(merchant.getStatus())) {
                merchant.setStatus("Bloqueado", "Mais de três senhas expiradas e não pagas.");
                accounts.save(merchant);
                auditEvents.save(new AuditEvent(
                    "Sistema", "Bloqueio automático", "Comerciante",
                    "Bloqueou o comerciante " + merchant.getName() + " (ID " + merchant.getId()
                        + ") após " + entry.getValue() + " senhas expiradas."
                ));
                notifications.notify(
                    merchant, "Comerciante bloqueado",
                    "A conta foi bloqueada após mais de três senhas expiradas e não pagas."
                );
            }
        }
    }

    private void notifyManagers(Payment payment, String title, String message) {
        accounts.findAllByRoleOrderByNameAsc("FINANCIAL_MANAGER").stream()
            .filter(manager -> manager.getMarket() == null
                || manager.getMarket().getId().equals(payment.getMarket().getId()))
            .forEach(manager -> notifications.notify(manager, title, message));
    }

    private long ticketValidityHours() {
        AppSetting setting = settings.findById("cobranca").orElse(null);
        if (setting == null) return 48;
        Map<String, Object> values;
        try {
            values = objectMapper.readValue(setting.getSettingValue(), MAP_TYPE);
        } catch (JacksonException exception) {
            throw new IllegalStateException("A configuração de cobrança não pôde ser lida.", exception);
        }
        Object configured = values.get("validadeSenhaHoras");
        if (configured == null) return 48;
        long hours;
        try {
            hours = configured instanceof Number number
                ? number.longValue()
                : Long.parseLong(configured.toString());
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("A validade das senhas deve ser um número inteiro.", exception);
        }
        if (hours < 1 || hours > 720) {
            throw new IllegalStateException("A validade das senhas deve estar entre 1 e 720 horas.");
        }
        return hours;
    }
}
