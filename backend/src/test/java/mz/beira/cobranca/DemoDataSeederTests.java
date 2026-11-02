package mz.beira.cobranca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.Payment;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.PaymentRepository;
import mz.beira.cobranca.config.DemoDataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:cobranca-demo-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "app.demo-data.enabled=true",
    "app.demo-data.password=demonstracao-segura-123",
    "app.admin.email=admin@beira.gov.mz",
    "app.admin.password=admin-demo-password-123"
})
class DemoDataSeederTests {
    @Autowired private AccountRepository accounts;
    @Autowired private PaymentRepository payments;
    @Autowired private DemoDataSeeder demoDataSeeder;

    @Test
    void seedsIdempotentDemoMerchantsAndUnpaidTicketHistory() throws Exception {
        List<Account> demoMerchants = accounts.findAllByRoleOrderByNameAsc("MERCHANT").stream()
            .filter(account -> account.getName().startsWith("[DEMO]"))
            .toList();
        List<Payment> demoPayments = payments.findAllByOrderByIdDesc().stream()
            .filter(payment -> payment.getPaymentReference().startsWith("DEMO-PAG-"))
            .toList();

        assertEquals(12, demoMerchants.size());
        assertEquals(48, demoPayments.size());
        assertEquals(36, demoPayments.stream()
            .filter(payment -> "Expirada".equals(payment.getStatus()))
            .count());
        assertEquals(12, demoPayments.stream()
            .filter(payment -> "Pendente".equals(payment.getStatus()))
            .count());
        demoPayments.forEach(payment -> {
            assertNull(payment.getPaidAt());
            assertEquals("Numerário", payment.getMethod());
        });

        demoDataSeeder.run();

        assertEquals(12, accounts.findAllByRoleOrderByNameAsc("MERCHANT").stream()
            .filter(account -> account.getName().startsWith("[DEMO]"))
            .count());
        assertEquals(48, payments.findAllByOrderByIdDesc().stream()
            .filter(payment -> payment.getPaymentReference().startsWith("DEMO-PAG-"))
            .count());
    }
}
