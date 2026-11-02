package mz.beira.cobranca.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;
import mz.beira.cobranca.dto.AdminDtos;
import mz.beira.cobranca.dto.MarketResponse;
import mz.beira.cobranca.dto.PaymentResponse;
import mz.beira.cobranca.dto.RateResponse;
import mz.beira.cobranca.dto.StallResponse;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.AppSetting;
import mz.beira.cobranca.models.AuditEvent;
import mz.beira.cobranca.models.Fiscal;
import mz.beira.cobranca.models.Market;
import mz.beira.cobranca.models.Payment;
import mz.beira.cobranca.models.Rate;
import mz.beira.cobranca.models.Stall;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.AppSettingRepository;
import mz.beira.cobranca.repositories.AuditEventRepository;
import mz.beira.cobranca.repositories.FiscalRepository;
import mz.beira.cobranca.repositories.MarketRepository;
import mz.beira.cobranca.repositories.NotificationRepository;
import mz.beira.cobranca.repositories.PaymentRepository;
import mz.beira.cobranca.repositories.RateRepository;
import mz.beira.cobranca.repositories.StallRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class AdminService {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AccountRepository accounts;
    private final MarketRepository markets;
    private final StallRepository stalls;
    private final RateRepository rates;
    private final PaymentRepository payments;
    private final FiscalRepository fiscals;
    private final AuditEventRepository auditEvents;
    private final NotificationRepository notifications;
    private final AppSettingRepository settings;
    private final PasswordEncoder passwordEncoder;
    private final CatalogService catalog;
    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    public AdminService(
        AccountRepository accounts,
        MarketRepository markets,
        StallRepository stalls,
        RateRepository rates,
        PaymentRepository payments,
        FiscalRepository fiscals,
        AuditEventRepository auditEvents,
        NotificationRepository notifications,
        AppSettingRepository settings,
        PasswordEncoder passwordEncoder,
        CatalogService catalog,
        PaymentService paymentService,
        ObjectMapper objectMapper
    ) {
        this.accounts = accounts;
        this.markets = markets;
        this.stalls = stalls;
        this.rates = rates;
        this.payments = payments;
        this.fiscals = fiscals;
        this.auditEvents = auditEvents;
        this.notifications = notifications;
        this.settings = settings;
        this.passwordEncoder = passwordEncoder;
        this.catalog = catalog;
        this.paymentService = paymentService;
        this.objectMapper = objectMapper;
    }

    private void validateTicketValidity(Map<String, Object> billing) {
        if (billing == null || billing.get("validadeSenhaHoras") == null) return;
        Object configured = billing.get("validadeSenhaHoras");
        long hours;
        try {
            hours = configured instanceof Number number
                ? number.longValue()
                : Long.parseLong(configured.toString());
        } catch (NumberFormatException exception) {
            throw badRequest("A validade das senhas deve ser um número inteiro.");
        }
        if (hours < 1 || hours > 720) {
            throw badRequest("A validade das senhas deve estar entre 1 e 720 horas.");
        }
    }

    @Transactional(readOnly = true)
    public List<MarketResponse> markets() {
        return catalog.getAdminMarkets();
    }

    @Transactional(readOnly = true)
    public List<MarketResponse> markets(Long marketId) {
        return catalog.getAdminMarkets().stream()
            .filter(market -> marketId == null || marketId.equals(market.id()))
            .toList();
    }

    @Transactional
    public MarketResponse createMarket(AdminDtos.MarketInput input, Account actor, String ip) {
        if (markets.existsByNameIgnoreCase(input.name().trim())) {
            throw conflict("Já existe um mercado com esse nome.");
        }
        Market market = markets.save(new Market(
            input.name().trim(), clean(input.location()), clean(input.manager()), input.active()
        ));
        audit(actor, "Criação", "Mercado", "Registou o mercado " + market.getName() + ".", ip);
        return marketResponse(market);
    }

    @Transactional
    public MarketResponse updateMarket(Long id, AdminDtos.MarketInput input, Account actor, String ip) {
        Market market = market(id);
        markets.findByName(input.name().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> { throw conflict("Já existe um mercado com esse nome."); });
        market.update(input.name().trim(), clean(input.location()), clean(input.manager()), input.active());
        market = markets.save(market);
        audit(actor, "Edição", "Mercado", "Actualizou o mercado " + market.getName() + ".", ip);
        return marketResponse(market);
    }

    @Transactional
    public StallResponse createStall(AdminDtos.StallInput input, Account actor, String ip) {
        Market market = market(input.marketId());
        if (stalls.existsByMarketIdAndCode(market.getId(), input.code().trim().toUpperCase())) {
            throw conflict("Já existe uma banca com esse código neste mercado.");
        }
        Stall stall = stalls.save(new Stall(
            input.code().trim().toUpperCase(), market, input.product().trim()
        ));
        audit(actor, "Criação", "Banca", "Registou a banca " + stall.getCode() + " no mercado " + market.getName() + ".", ip);
        return StallResponse.from(stall);
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.MerchantResponse> merchants() {
        return accounts.findAllByRoleOrderByNameAsc("MERCHANT").stream()
            .map(this::merchantResponse)
            .toList();
    }

    @Transactional
    public AdminDtos.MerchantResponse createMerchant(AdminDtos.MerchantInput input, Account actor, String ip) {
        assertUniqueMerchant(input.nuit(), input.phone(), input.email(), null);
        Market market = activeMarket(input.marketId());
        Stall stall = merchantStall(input.stallId(), market);
        validateActiveRate(market, input.product());
        Account account = new Account(
            input.name().trim(), normalizeEmail(input.email()), input.phone().trim(),
            passwordEncoder.encode(input.password()), "MERCHANT", market, stall,
            input.product().trim(), input.nuit().trim()
        );
        stall.setProduct(input.product().trim());
        account = accounts.save(account);
        audit(actor, "Criação", "Comerciante", "Registou o comerciante " + account.getName() + ".", ip);
        return merchantResponse(account);
    }

    @Transactional
    public AdminDtos.MerchantResponse updateMerchant(
        Long id, AdminDtos.MerchantUpdate input, Account actor, String ip
    ) {
        Account account = merchant(id);
        assertUniqueMerchant(input.nuit(), input.phone(), input.email(), id);
        Market market = activeMarket(input.marketId());
        Stall stall = merchantStall(input.stallId(), market, id);
        validateActiveRate(market, input.product());
        account.updateMerchant(
            input.name().trim(), input.nuit().trim(), input.phone().trim(),
            normalizeEmail(input.email()), market, stall, input.product().trim()
        );
        stall.setProduct(input.product().trim());
        account = accounts.save(account);
        audit(actor, "Edição", "Comerciante", "Actualizou o registo de " + account.getName() + ".", ip);
        return merchantResponse(account);
    }

    @Transactional
    public AdminDtos.MerchantResponse setMerchantStatus(
        Long id, AdminDtos.StatusInput input, Account actor, String ip
    ) {
        Account account = merchant(id);
        if (!List.of("Regular", "Bloqueado").contains(input.status())) {
            throw badRequest("Estado do comerciante inválido.");
        }
        String reason = clean(input.reason());
        if (reason == null) {
            reason = "Bloqueado".equals(input.status())
                ? "Bloqueio efectuado pela administração"
                : "Regularização autorizada pela administração";
        }
        account.setStatus(input.status(), reason);
        audit(
            actor,
            "Bloqueado".equals(input.status()) ? "Bloqueio" : "Regularização",
            "Comerciante",
            "Actualizou o estado de " + account.getName() + " para " + input.status()
                + ". Motivo: " + reason + ".",
            ip
        );
        return merchantResponse(accounts.save(account));
    }

    @Transactional(readOnly = true)
    public List<RateResponse> rates() {
        return rates.findAllByOrderByMarketNameAscProductAsc().stream()
            .map(this::rateResponse)
            .toList();
    }

    @Transactional
    public RateResponse createRate(AdminDtos.RateInput input, Account actor, String ip) {
        Market market = market(input.marketId());
        if (rates.existsByMarketIdAndProductIgnoreCase(market.getId(), input.product().trim())) {
            throw conflict("Já existe uma taxa para este produto e mercado.");
        }
        Rate rate = rates.save(new Rate(
            market, input.product().trim(), validatePeriodicity(input.periodicity()),
            input.amount(), input.active()
        ));
        rate.update(market, rate.getProduct(), rate.getPeriodicity(), rate.getAmount(),
            rate.isActive(), clean(input.description()));
        audit(actor, "Criação", "Taxa", "Criou a taxa " + rate.getProduct() + " para " + market.getName() + ".", ip);
        return rateResponse(rate);
    }

    @Transactional
    public RateResponse updateRate(Long id, AdminDtos.RateInput input, Account actor, String ip) {
        Rate rate = rates.findById(id).orElseThrow(() -> notFound("Taxa não encontrada."));
        Market market = market(input.marketId());
        rates.findByMarketIdAndProductIgnoreCase(market.getId(), input.product().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> { throw conflict("Já existe uma taxa activa para este produto e mercado."); });
        rate.update(market, input.product().trim(), validatePeriodicity(input.periodicity()),
            input.amount(), input.active(), clean(input.description()));
        rate = rates.save(rate);
        audit(actor, "Edição", "Taxa", "Actualizou a taxa " + rate.getProduct() + " de " + market.getName() + ".", ip);
        return rateResponse(rate);
    }

    @Transactional
    public RateResponse setRateStatus(Long id, boolean active, Account actor, String ip) {
        Rate rate = rates.findById(id).orElseThrow(() -> notFound("Taxa não encontrada."));
        rate.update(rate.getMarket(), rate.getProduct(), rate.getPeriodicity(), rate.getAmount(), active, rate.getDescription());
        rate = rates.save(rate);
        audit(actor, active ? "Edição" : "Suspensão", "Taxa",
            (active ? "Activou" : "Suspendeu") + " a taxa " + rate.getProduct() + ".", ip);
        return rateResponse(rate);
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.FiscalResponse> fiscals() {
        return fiscals.findAllByOrderByNameAsc().stream().map(this::fiscalResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.StaffResponse> staffUsers() {
        return accounts.findAll().stream()
            .filter(account -> List.of("FISCAL", "FINANCIAL_MANAGER").contains(account.getRole()))
            .sorted(Comparator.comparing(Account::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::staffResponse)
            .toList();
    }

    @Transactional
    public AdminDtos.StaffResponse createStaff(
        AdminDtos.StaffInput input, Account actor, String ip
    ) {
        String role = input.role().trim();
        if (!List.of("FISCAL", "FINANCIAL_MANAGER").contains(role)) {
            throw badRequest("O perfil de equipa seleccionado não é permitido.");
        }
        String email = normalizeEmail(input.email());
        String phone = input.phone().trim();
        if (accounts.existsByEmailIgnoreCase(email) || accounts.existsByPhone(phone)) {
            throw conflict("O e-mail ou telefone já está associado a uma conta.");
        }
        Market market = null;
        if (input.marketId() != null) {
            market = market(input.marketId());
            if (!market.isActive()) throw badRequest("O mercado seleccionado está inactivo.");
        }
        if ("FISCAL".equals(role) && market == null) {
            throw badRequest("Associe o fiscal a um mercado.");
        }
        Account account = accounts.save(new Account(
            input.name().trim(), email, phone, passwordEncoder.encode(input.password()),
            role, market, null, null
        ));
        audit(actor, "Criação", "Utilizador", "Criou a conta de " + role + " para " + account.getName() + ".", ip);
        return staffResponse(account);
    }

    @Transactional
    public void deleteStaff(Long id, Account actor, String ip) {
        Account account = accounts.findById(id)
            .orElseThrow(() -> notFound("Utilizador de equipa não encontrado."));
        if (!List.of("FISCAL", "FINANCIAL_MANAGER").contains(account.getRole())) {
            throw badRequest("Só é possível eliminar fiscais ou gestores financeiros.");
        }
        if (payments.existsByCashierId(id) || payments.existsByConfirmedById(id)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Não é possível eliminar este utilizador porque está associado ao histórico de pagamentos."
            );
        }

        audit(
            actor,
            "Eliminação",
            "Utilizador",
            "Eliminou a conta de " + account.getRole() + " de " + account.getName() + ".",
            ip
        );
        notifications.deleteAllByAccountId(id);
        accounts.delete(account);
    }

    @Transactional
    public AdminDtos.FiscalResponse createFiscal(
        AdminDtos.FiscalInput input, Account actor, String ip
    ) {
        uniqueFiscal(input, null);
        Fiscal fiscal = new Fiscal(
            input.name().trim(), input.nuit().trim(), input.phone().trim(),
            input.email().trim().toLowerCase(), market(input.marketId()),
            input.zone().trim(), input.shift().trim()
        );
        fiscal = fiscals.save(fiscal);
        audit(actor, "Criação", "Fiscal", "Registou o fiscal " + fiscal.getName() + ".", ip);
        return fiscalResponse(fiscal);
    }

    @Transactional
    public AdminDtos.FiscalResponse updateFiscal(
        Long id, AdminDtos.FiscalInput input, Account actor, String ip
    ) {
        Fiscal fiscal = fiscals.findById(id).orElseThrow(() -> notFound("Fiscal não encontrado."));
        uniqueFiscal(input, id);
        fiscal.update(
            input.name().trim(), input.nuit().trim(), input.phone().trim(),
            input.email().trim().toLowerCase(), market(input.marketId()),
            input.zone().trim(), input.shift().trim()
        );
        audit(actor, "Edição", "Fiscal", "Actualizou o registo de " + fiscal.getName() + ".", ip);
        return fiscalResponse(fiscals.save(fiscal));
    }

    @Transactional
    public AdminDtos.FiscalResponse setFiscalStatus(
        Long id, boolean active, String reason, Account actor, String ip
    ) {
        Fiscal fiscal = fiscals.findById(id).orElseThrow(() -> notFound("Fiscal não encontrado."));
        fiscal.setActive(active, active ? null : clean(reason));
        audit(actor, active ? "Edição" : "Bloqueio", "Fiscal",
            (active ? "Activou" : "Desactivou") + " o fiscal " + fiscal.getName() + ".", ip);
        return fiscalResponse(fiscals.save(fiscal));
    }

    @Transactional(readOnly = true)
    public AdminDtos.DashboardResponse dashboard(LocalDate from, LocalDate to, Long marketId) {
        List<Payment> periodPayments = payments(from, to, marketId);
        List<Payment> priorPayments = payments(from.minusDays(to.toEpochDay() - from.toEpochDay() + 1), from.minusDays(1), marketId);
        BigDecimal revenue = sumPayments(periodPayments);
        long count = periodPayments.size();
        long merchants = periodPayments.stream().map(p -> p.getAccount().getId()).distinct().count();
        BigDecimal average = count == 0 ? BigDecimal.ZERO : revenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        List<AdminDtos.DailyRevenue> daily = daily(periodPayments);
        List<AdminDtos.MarketRevenue> byMarket = marketRevenue(periodPayments);
        List<AdminDtos.MethodRevenue> byMethod = methodRevenue(periodPayments);
        List<AdminDtos.MerchantRecent> recentMerchants = accounts.findAllByRoleOrderByNameAsc("MERCHANT").stream()
            .sorted(Comparator.comparing(Account::getCreatedAt).reversed())
            .limit(5)
            .map(a -> new AdminDtos.MerchantRecent(
                a.getId(), a.getName(), a.getMarket() == null ? "" : a.getMarket().getName(),
                a.getProduct(), a.getStatus(), a.getCreatedAt()
            )).toList();
        List<PaymentResponse> recentPayments = periodPayments.stream()
            .limit(8).map(PaymentResponse::from).toList();
        return new AdminDtos.DashboardResponse(
            revenue, count, merchants, average, null, sumPayments(priorPayments),
            daily, byMarket, byMethod, recentMerchants, recentPayments
        );
    }

    @Transactional(readOnly = true)
    public AdminDtos.ReportResponse report(LocalDate from, LocalDate to, Long marketId) {
        List<Payment> periodPayments = payments(from, to, marketId);
        long merchants = periodPayments.stream().map(p -> p.getAccount().getId()).distinct().count();
        return new AdminDtos.ReportResponse(
            sumPayments(periodPayments), periodPayments.size(), merchants,
            marketRevenue(periodPayments), daily(periodPayments),
            periodPayments.stream().map(PaymentResponse::from).toList()
        );
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.TicketResponse> tickets() {
        return payments.findAllByOrderByIdDesc().stream()
            .filter(payment -> "Pago".equals(payment.getStatus()))
            .map(payment ->
            new AdminDtos.TicketResponse(
                payment.getPaymentReference(), payment.getId(), payment.getAccount().getName(),
                payment.getAccount().getNuit(), payment.getMarket().getName(),
                payment.getStall().getCode(), payment.getPeriodicity(), payment.getAmount(),
                payment.getPeriodStart(), payment.getPeriodEnd(), payment.getPaidAt(),
                payment.getStatus(), payment.getMethod()
            )
        ).toList();
    }

    @Transactional(readOnly = true)
    public AdminDtos.SettingsResponse getSettings() {
        return new AdminDtos.SettingsResponse(
            setting("geral", defaultGeneral()),
            setting("cobranca", defaultBilling()),
            setting("notificacoes", defaultNotifications()),
            setting("seguranca", defaultSecurity())
        );
    }

    @Transactional
    public AdminDtos.SettingsResponse saveSettings(
        AdminDtos.SettingsInput input, Account actor, String ip
    ) {
        validateTicketValidity(input.cobranca());
        saveSetting("geral", input.geral());
        saveSetting("cobranca", input.cobranca());
        saveSetting("notificacoes", input.notificacoes());
        saveSetting("seguranca", input.seguranca());
        audit(actor, "Edição", "Configurações", "Actualizou as configurações do sistema.", ip);
        return getSettings();
    }

    @Transactional
    public AdminDtos.SettingsResponse resetSettings(Account actor, String ip) {
        settings.deleteAll();
        audit(actor, "Edição", "Configurações", "Restaurou as configurações predefinidas.", ip);
        return getSettings();
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AuditResponse> auditEvents() {
        return auditEvents.findAllByOrderByOccurredAtDesc().stream()
            .map(event -> new AdminDtos.AuditResponse(
                event.getId(), event.getOccurredAt(), event.getActorId(), event.getActorName(),
                switch (event.getRole()) {
                    case "ADMIN" -> "Administrador";
                    case "FISCAL" -> "Fiscal";
                    case "FINANCIAL_MANAGER" -> "Gestor Financeiro";
                    case "SYSTEM" -> "Sistema";
                    default -> "Comerciante";
                },
                event.getAction(), event.getEntity(), event.getDescription(), event.getIpAddress()
            )).toList();
    }

    @Transactional
    public PaymentResponse recordPayment(Long merchantId, String method, Account actor, String ip) {
        if (!"Numerário".equals(method)) {
            throw badRequest("As carteiras móveis devem ser simuladas pelo próprio comerciante.");
        }
        Account merchant = merchant(merchantId);
        PaymentResponse result = paymentService.makePayment(
            merchant, new mz.beira.cobranca.dto.PaymentRequest(method)
        );
        audit(actor, "Emissão", "Senha",
            "Emitiu a senha " + result.paymentReference() + " para " + merchant.getName() + ".", ip);
        return result;
    }

    public void audit(Account actor, String action, String entity, String description, String ip) {
        auditEvents.save(new AuditEvent(actor, action, entity, description, ip));
    }

    private MarketResponse marketResponse(Market market) {
        List<StallResponse> stallResponses = stalls.findAllByMarketIdOrderByCode(market.getId()).stream()
            .map(stall -> accounts.findByStallId(stall.getId())
                .map(account -> StallResponse.from(stall, account.getName(), account.getProduct()))
                .orElseGet(() -> StallResponse.from(stall, null, null)))
            .toList();
        return MarketResponse.from(
            market, stallResponses, accounts.countByMarketIdAndRole(market.getId(), "MERCHANT")
        );
    }

    private AdminDtos.MerchantResponse merchantResponse(Account account) {
        Rate rate = account.getMarket() == null || account.getProduct() == null ? null
            : rates.findByMarketIdAndProductIgnoreCaseAndActiveTrue(
                account.getMarket().getId(), account.getProduct()
            ).orElse(null);
        return new AdminDtos.MerchantResponse(
            account.getId(), account.getName(), account.getNuit(), account.getPhone(),
            account.getEmail(), account.getMarket() == null ? null : account.getMarket().getId(),
            account.getMarket() == null ? null : account.getMarket().getName(),
            account.getStall() == null ? null : account.getStall().getId(),
            account.getStall() == null ? null : account.getStall().getCode(),
            account.getProduct(), rate == null ? null : rate.getPeriodicity(),
            rate == null ? null : rate.getAmount(), account.getStatus(), account.getStatusReason()
        );
    }

    private RateResponse rateResponse(Rate rate) {
        return RateResponse.from(
            rate,
            accounts.countByMarketIdAndProductIgnoreCaseAndRole(
                rate.getMarket().getId(), rate.getProduct(), "MERCHANT"
            )
        );
    }

    private AdminDtos.FiscalResponse fiscalResponse(Fiscal fiscal) {
        return new AdminDtos.FiscalResponse(
            fiscal.getId(), fiscal.getName(), fiscal.getNuit(), fiscal.getPhone(),
            fiscal.getEmail(), fiscal.getMarket().getId(), fiscal.getMarket().getName(),
            fiscal.getZone(), fiscal.getShift(), fiscal.isActive() ? "Activo" : "Inactivo",
            fiscal.getStatusReason()
        );
    }

    private AdminDtos.StaffResponse staffResponse(Account account) {
        return new AdminDtos.StaffResponse(
            account.getId(), account.getName(), account.getEmail(), account.getPhone(),
            account.getRole(), account.getMarket() == null ? null : account.getMarket().getId(),
            account.getMarket() == null ? null : account.getMarket().getName(), account.getStatus()
        );
    }

    private Account merchant(Long id) {
        Account account = accounts.findById(id).orElseThrow(() -> notFound("Comerciante não encontrado."));
        if (!"MERCHANT".equals(account.getRole())) {
            throw badRequest("A conta seleccionada não é de um comerciante.");
        }
        return account;
    }

    private Market market(Long id) {
        return markets.findById(id).orElseThrow(() -> notFound("Mercado não encontrado."));
    }

    private Market activeMarket(Long id) {
        Market market = market(id);
        if (!market.isActive()) throw badRequest("O mercado seleccionado está inactivo.");
        return market;
    }

    private Stall merchantStall(Long stallId, Market market) {
        return merchantStall(stallId, market, null);
    }

    private Stall merchantStall(Long stallId, Market market, Long currentAccountId) {
        Stall stall = stalls.findByIdAndMarketId(stallId, market.getId())
            .orElseThrow(() -> badRequest("A banca não pertence ao mercado seleccionado."));
        accounts.findByStallId(stallId)
            .filter(existing -> !Objects.equals(existing.getId(), currentAccountId))
            .ifPresent(existing -> { throw conflict("Esta banca já está associada a um comerciante."); });
        return stall;
    }

    private void validateActiveRate(Market market, String product) {
        if (rates.findByMarketIdAndProductIgnoreCaseAndActiveTrue(market.getId(), product.trim()).isEmpty()) {
            throw badRequest("Não existe uma taxa activa para este produto neste mercado.");
        }
    }

    private void assertUniqueMerchant(String nuit, String phone, String email, Long exceptId) {
        if (accounts.existsByNuit(nuit.trim()) && !ownsNuit(nuit.trim(), exceptId)) {
            throw conflict("Este NUIT já está registado.");
        }
        if (accounts.existsByPhone(phone.trim()) && !ownsPhone(phone.trim(), exceptId)) {
            throw conflict("Este telefone já está registado.");
        }
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail != null && accounts.existsByEmailIgnoreCase(normalizedEmail)
            && !ownsEmail(normalizedEmail, exceptId)) {
            throw conflict("Este e-mail já está registado.");
        }
    }

    private boolean ownsNuit(String nuit, Long id) {
        return id != null && accounts.findById(id).map(a -> nuit.equals(a.getNuit())).orElse(false);
    }

    private boolean ownsPhone(String phone, Long id) {
        return id != null && accounts.findByPhone(phone).map(a -> a.getId().equals(id)).orElse(false);
    }

    private boolean ownsEmail(String email, Long id) {
        return id != null && accounts.findByEmailIgnoreCase(email).map(a -> a.getId().equals(id)).orElse(false);
    }

    private void uniqueFiscal(AdminDtos.FiscalInput input, Long exceptId) {
        fiscals.findAll().stream()
            .filter(f -> !Objects.equals(f.getId(), exceptId))
            .filter(f -> f.getNuit().equals(input.nuit().trim())
                || f.getEmail().equalsIgnoreCase(input.email().trim()))
            .findFirst()
            .ifPresent(f -> { throw conflict("O NUIT ou e-mail já está associado a outro fiscal."); });
    }

    private String validatePeriodicity(String periodicity) {
        if (!List.of("Diária", "Semanal", "Mensal").contains(periodicity)) {
            throw badRequest("Periodicidade da taxa inválida.");
        }
        return periodicity;
    }

    private List<Payment> payments(LocalDate from, LocalDate to, Long marketId) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<Payment> result = payments.findAllByPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtDesc(start, end);
        return result.stream()
            .filter(payment -> "Pago".equals(payment.getStatus()))
            .filter(payment -> marketId == null || marketId.equals(payment.getMarket().getId()))
            .toList();
    }

    private BigDecimal sumPayments(List<Payment> payments) {
        return payments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<AdminDtos.DailyRevenue> daily(List<Payment> payments) {
        Map<LocalDate, List<Payment>> byDate = payments.stream()
            .collect(Collectors.groupingBy(p -> p.getPaidAt().toLocalDate(), TreeMap::new, Collectors.toList()));
        return byDate.entrySet().stream().map(entry -> new AdminDtos.DailyRevenue(
            entry.getKey(), sumPayments(entry.getValue()), entry.getValue().size()
        )).toList();
    }

    private List<AdminDtos.MarketRevenue> marketRevenue(List<Payment> payments) {
        Map<Long, List<Payment>> byMarket = payments.stream()
            .collect(Collectors.groupingBy(p -> p.getMarket().getId(), LinkedHashMap::new, Collectors.toList()));
        return byMarket.entrySet().stream().map(entry -> {
            List<Payment> rows = entry.getValue();
            return new AdminDtos.MarketRevenue(
                entry.getKey(), rows.get(0).getMarket().getName(), sumPayments(rows), rows.size(),
                rows.stream().map(p -> p.getAccount().getId()).distinct().count()
            );
        }).sorted(Comparator.comparing(AdminDtos.MarketRevenue::revenue).reversed()).toList();
    }

    private List<AdminDtos.MethodRevenue> methodRevenue(List<Payment> payments) {
        Map<String, List<Payment>> byMethod = payments.stream()
            .collect(Collectors.groupingBy(Payment::getMethod, LinkedHashMap::new, Collectors.toList()));
        return byMethod.entrySet().stream().map(entry -> new AdminDtos.MethodRevenue(
            entry.getKey(), sumPayments(entry.getValue()), entry.getValue().size()
        )).toList();
    }

    private Map<String, Object> setting(String key, Map<String, Object> fallback) {
        return settings.findById(key).map(value -> parseSetting(value.getSettingValue())).orElse(fallback);
    }

    private void saveSetting(String key, Map<String, Object> value) {
        if (value == null) throw badRequest("Configuração incompleta: " + key + ".");
        String encoded;
        try {
            encoded = objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Não foi possível serializar as configurações.", exception);
        }
        AppSetting setting = settings.findById(key).orElseGet(() -> new AppSetting(key, encoded));
        setting.setSettingValue(encoded);
        settings.save(setting);
    }

    private Map<String, Object> parseSetting(String value) {
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Uma configuração persistida está inválida.", exception);
        }
    }

    private Map<String, Object> defaultGeneral() {
        return Map.of(
            "nomeSistema", "Cobrança Beira", "municipio", "Beira", "provincia", "Sofala",
            "moeda", "MZN", "idioma", "Português (Moçambique)",
            "fusoHorario", "Africa/Maputo", "nomeResponsavel", "", "emailContacto", ""
        );
    }

    private Map<String, Object> defaultBilling() {
        return Map.of(
            "moeda", "MZN", "ivaAtivo", false, "ivaPercentagem", 16,
            "diasParaBloqueio", 3, "arredondamento", "Nenhum",
            "numeracaoSenha", "Automática", "emitirReciboAutomatico", true,
            "limiteSenhasPorOperador", 200, "validadeSenhaHoras", 48
        );
    }

    private Map<String, Object> defaultNotifications() {
        return Map.of(
            "alertaDivida", true, "alertaBloqueio", true, "resumoDiarioEmail", false,
            "emailResumo", "", "alertaSMS", false, "numeroSMS", "", "notificarNovaTaxa", true
        );
    }

    private Map<String, Object> defaultSecurity() {
        return Map.of(
            "autenticacaoDoisFatores", false, "expiracaoSessaoMinutos", 30,
            "minimoCaracteresPassword", 8, "exigirMaiusculas", false,
            "exigirNumeros", false, "exigirSimbolos", false,
            "maxTentativasLogin", 5, "bloquearAposTentativas", true
        );
    }

    private String normalizeEmail(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase();
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
