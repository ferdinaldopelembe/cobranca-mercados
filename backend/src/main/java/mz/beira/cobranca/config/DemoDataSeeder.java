package mz.beira.cobranca.config;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.Market;
import mz.beira.cobranca.models.Payment;
import mz.beira.cobranca.models.Rate;
import mz.beira.cobranca.models.Stall;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.MarketRepository;
import mz.beira.cobranca.repositories.PaymentRepository;
import mz.beira.cobranca.repositories.RateRepository;
import mz.beira.cobranca.repositories.StallRepository;
import mz.beira.cobranca.services.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(1)
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {
    private static final ZoneId MAPUTO = ZoneId.of("Africa/Maputo");
    private static final String DEMO_NAME_PREFIX = "[DEMO] Comerciante Beira ";
    private static final String DEMO_EMAIL_PREFIX = "demo.comerciante.";
    private static final List<Integer> HISTORICAL_PERIOD_OFFSETS = List.of(5, 4, 3);

    private final AccountRepository accounts;
    private final MarketRepository markets;
    private final StallRepository stalls;
    private final RateRepository rates;
    private final PaymentRepository payments;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notifications;
    private final String demoPassword;

    public DemoDataSeeder(
        AccountRepository accounts,
        MarketRepository markets,
        StallRepository stalls,
        RateRepository rates,
        PaymentRepository payments,
        PasswordEncoder passwordEncoder,
        NotificationService notifications,
        @Value("${app.demo-data.password:}") String demoPassword
    ) {
        this.accounts = accounts;
        this.markets = markets;
        this.stalls = stalls;
        this.rates = rates;
        this.payments = payments;
        this.passwordEncoder = passwordEncoder;
        this.notifications = notifications;
        this.demoPassword = demoPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (demoPassword.length() < 12) {
            throw new IllegalStateException(
                "Defina COBRANCA_DEMO_PASSWORD com pelo menos 12 caracteres para carregar os dados demonstrativos."
            );
        }

        List<Rate> demoRates = rates.findAllByOrderByMarketNameAscProductAsc().stream()
            .filter(Rate::isActive)
            .limit(6)
            .toList();
        if (demoRates.isEmpty()) {
            throw new IllegalStateException(
                "Não existem taxas activas para criar comerciantes demonstrativos."
            );
        }

        LocalDateTime now = LocalDateTime.now(MAPUTO);
        List<Account> demoAccounts = new ArrayList<>();
        for (int index = 1; index <= 12; index++) {
            Rate rate = demoRates.get((index - 1) % demoRates.size());
            Account merchant = merchant(index, rate);
            demoAccounts.add(merchant);
            seedPayments(index, merchant, rate, now);
        }

        System.out.printf(
            Locale.ROOT,
            "Dados de demonstração prontos: %d comerciantes e senhas pendentes/expiradas. Nenhum pagamento foi confirmado.%n",
            demoAccounts.size()
        );
    }

    private Account merchant(int index, Rate rate) {
        String suffix = String.format(Locale.ROOT, "%02d", index);
        String email = DEMO_EMAIL_PREFIX + suffix + "@exemplo.test";
        Account existing = accounts.findByEmailIgnoreCase(email).orElse(null);
        if (existing != null) {
            if (!"MERCHANT".equals(existing.getRole())
                || !existing.getName().equals(DEMO_NAME_PREFIX + suffix)
                || existing.getMarket() == null
                || !existing.getMarket().getId().equals(rate.getMarket().getId())
                || !existing.getProduct().equals(rate.getProduct())) {
                throw new IllegalStateException(
                    "O e-mail demonstrativo " + email + " já pertence a uma conta não compatível."
                );
            }
            return existing;
        }

        Stall stall = stalls.findAllByMarketIdOrderByCode(rate.getMarket().getId()).stream()
            .filter(candidate -> accounts.findByStallId(candidate.getId()).isEmpty())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException(
                "Não há bancas livres no mercado " + rate.getMarket().getName()
                    + " para os dados demonstrativos."
            ));
        stall.setProduct(rate.getProduct());
        return accounts.save(new Account(
            DEMO_NAME_PREFIX + suffix,
            email,
            null,
            passwordEncoder.encode(demoPassword),
            "MERCHANT",
            rate.getMarket(),
            stall,
            rate.getProduct()
        ));
    }

    private void seedPayments(int merchantNumber, Account merchant, Rate rate, LocalDateTime now) {
        for (int offset : HISTORICAL_PERIOD_OFFSETS) {
            LocalDate periodDate = periodDate(rate.getPeriodicity(), now.toLocalDate(), offset);
            LocalDate[] period = period(rate.getPeriodicity(), periodDate);
            String reference = ticketReference(merchantNumber, offset);
            if (payments.findByPaymentReferenceIgnoreCase(reference).isPresent()) continue;

            LocalDateTime issuedAt = period[0].atTime(9, 0);
            Payment payment = new Payment(
                reference,
                reference.replace("DEMO-PAG", "DEMO-TRX"),
                merchant,
                rate.getMarket(),
                merchant.getStall(),
                rate.getProduct(),
                rate.getPeriodicity(),
                period[0],
                period[1],
                rate.getAmount(),
                "Numerário",
                issuedAt,
                issuedAt.plusHours(48)
            );
            payment.expireIfDue(now);
            payments.save(payment);
            if ("Expirada".equals(payment.getStatus())) {
                notifications.notify(
                    merchant,
                    "Senha expirada · demonstração",
                    "A senha demonstrativa " + reference
                        + " expirou sem qualquer pagamento real."
                );
            }
        }

        LocalDate[] currentPeriod = period(rate.getPeriodicity(), now.toLocalDate());
        String currentReference = ticketReference(merchantNumber, 0);
        if (payments.findByPaymentReferenceIgnoreCase(currentReference).isEmpty()) {
            LocalDateTime issuedAt = now.minusHours(1);
            Payment pending = new Payment(
                currentReference,
                currentReference.replace("DEMO-PAG", "DEMO-TRX"),
                merchant,
                rate.getMarket(),
                merchant.getStall(),
                rate.getProduct(),
                rate.getPeriodicity(),
                currentPeriod[0],
                currentPeriod[1],
                rate.getAmount(),
                "Numerário",
                issuedAt,
                issuedAt.plusHours(48)
            );
            payments.save(pending);
            notifications.notify(
                merchant,
                "Senha emitida · demonstração",
                "A senha demonstrativa " + currentReference
                    + " está pendente. Nenhum dinheiro foi recebido."
            );
        }
    }

    private String ticketReference(int merchantNumber, int periodOffset) {
        return String.format(
            Locale.ROOT, "DEMO-PAG-M%02d-T%02d", merchantNumber, periodOffset
        );
    }

    private LocalDate periodDate(String periodicity, LocalDate today, int offset) {
        return switch (periodicity) {
            case "Diária" -> today.minusDays(offset);
            case "Semanal" -> today.minusWeeks(offset);
            case "Mensal" -> today.minusMonths(offset);
            default -> throw new IllegalStateException(
                "Periodicidade inválida para os dados demonstrativos: " + periodicity
            );
        };
    }

    private LocalDate[] period(String periodicity, LocalDate date) {
        return switch (periodicity) {
            case "Diária" -> new LocalDate[] {date, date};
            case "Semanal" -> {
                LocalDate start = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new LocalDate[] {start, start.plusDays(6)};
            }
            case "Mensal" -> new LocalDate[] {
                date.withDayOfMonth(1), date.with(TemporalAdjusters.lastDayOfMonth())
            };
            default -> throw new IllegalStateException(
                "Periodicidade inválida para os dados demonstrativos: " + periodicity
            );
        };
    }
}
