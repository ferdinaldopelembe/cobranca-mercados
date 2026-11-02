package mz.beira.cobranca.config;

import java.math.BigDecimal;
import java.util.List;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.Market;
import mz.beira.cobranca.models.Rate;
import mz.beira.cobranca.models.Stall;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.MarketRepository;
import mz.beira.cobranca.repositories.RateRepository;
import mz.beira.cobranca.repositories.StallRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class InitialData {
    private record RateSeed(String market, String product, String periodicity, String amount) {}

    private static final List<String[]> MARKET_SEEDS = List.of(
        new String[] {"Mercado do Maquinino", "MQ", "12"},
        new String[] {"Mercado do Goto", "GT", "21"},
        new String[] {"Mercado do Chota", "CH", "12"},
        new String[] {"Mercado da Manga", "MG", "8"},
        new String[] {"Mercado do Esturro", "ES", "10"},
        new String[] {"Mercado de Inhamizua", "IN", "8"}
    );

    private static final List<RateSeed> RATE_SEEDS = List.of(
        new RateSeed("Mercado do Maquinino", "Peixe", "Diária", "50"),
        new RateSeed("Mercado do Maquinino", "Roupa", "Semanal", "350"),
        new RateSeed("Mercado do Maquinino", "Fruta", "Diária", "30"),
        new RateSeed("Mercado do Goto", "Hortaliças", "Diária", "40"),
        new RateSeed("Mercado do Chota", "Carne", "Diária", "80"),
        new RateSeed("Mercado da Manga", "Cereais", "Mensal", "1200")
    );

    @Bean
    @Order(0)
    CommandLineRunner seedInitialData(
        MarketRepository markets,
        StallRepository stalls,
        RateRepository rates,
        AccountRepository accounts,
        PasswordEncoder passwordEncoder,
        @Value("${app.admin.email}") String adminEmail,
        @Value("${app.admin.password}") String adminPassword
    ) {
        return args -> {
            for (String[] seed : MARKET_SEEDS) {
                Market market = markets.findAll().stream()
                    .filter(existing -> existing.getName().equals(seed[0]))
                    .findFirst()
                    .orElseGet(() -> markets.save(new Market(seed[0])));
                int stallCount = Integer.parseInt(seed[2]);
                for (int number = 1; number <= stallCount; number++) {
                    String code = seed[1] + "-" + String.format("%03d", number);
                    if (!stalls.existsByMarketIdAndCode(market.getId(), code)) {
                        stalls.save(new Stall(code, market));
                    }
                }
            }
            for (RateSeed rateSeed : RATE_SEEDS) {
                Market market = markets.findAll().stream()
                    .filter(existing -> existing.getName().equals(rateSeed.market()))
                    .findFirst()
                    .orElseThrow();
                if (!rates.existsByMarketIdAndProductIgnoreCase(market.getId(), rateSeed.product())) {
                    rates.save(new Rate(
                        market,
                        rateSeed.product(),
                        rateSeed.periodicity(),
                        new BigDecimal(rateSeed.amount()),
                        true
                    ));
            }
            }

            if (!accounts.existsByEmailIgnoreCase(adminEmail)) {
                if (adminPassword == null || adminPassword.length() < 12) {
                    throw new IllegalStateException(
                        "Defina COBRANCA_ADMIN_PASSWORD com pelo menos 12 caracteres para criar a conta administrativa."
                    );
                }
                accounts.save(new Account(
                    "Administrador",
                    adminEmail,
                    null,
                    passwordEncoder.encode(adminPassword),
                    "ADMIN",
                    null,
                    null,
                    null
                ));
            }
        };
    }
}
