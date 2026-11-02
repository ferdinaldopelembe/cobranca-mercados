package mz.beira.cobranca;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.is;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.Market;
import mz.beira.cobranca.models.Payment;
import mz.beira.cobranca.models.Stall;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.MarketRepository;
import mz.beira.cobranca.repositories.PaymentRepository;
import mz.beira.cobranca.repositories.StallRepository;
import mz.beira.cobranca.services.SessionAccountService;
import mz.beira.cobranca.services.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:cobranca-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "app.admin.password=admin123456789"
})
@AutoConfigureMockMvc
class PaymentApiTests {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private MarketRepository markets;
    @Autowired private StallRepository stalls;
    @Autowired private AccountRepository accounts;
    @Autowired private PaymentRepository payments;
    @Autowired private PaymentService paymentService;

    @Test
    void administratorCanDeleteStaffWithoutPaymentHistory() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        MockHttpSession adminSession = adminLogin();
        String prefix = "delete-staff-" + UUID.randomUUID();
        createStaffAndLogin(adminSession, market.getId(), "FISCAL", prefix);
        Long staffId = accounts.findByEmailIgnoreCase(prefix + "@example.test")
            .orElseThrow()
            .getId();

        mvc.perform(delete("/api/admin/users/" + staffId).session(adminSession))
            .andExpect(status().isNoContent());

        org.junit.jupiter.api.Assertions.assertTrue(accounts.findById(staffId).isEmpty());
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new LoginPayload(prefix + "@example.test", "staffPassword123")
                )))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void merchantPaymentsArePrivateAndServerCalculatesReferencesAndAmount() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        Stall firstStall = availableStall(market);
        MockHttpSession firstSession = register(market, firstStall, "first");
        mvc.perform(get("/api/admin/markets").session(firstSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments")
                .session(firstSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"POS\"}"))
            .andExpect(status().isBadRequest());

        mvc.perform(post("/api/payments")
                .session(firstSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.amount").value(50))
            .andExpect(jsonPath("$.status").value("Pendente"))
            .andExpect(jsonPath("$.paidAt").doesNotExist())
            .andExpect(jsonPath("$.paymentReference", matchesPattern("PAG-\\d{4}-[A-F0-9]{10}")))
            .andExpect(jsonPath("$.transactionReference", matchesPattern("TRX-\\d{4}-[A-F0-9]{10}")))
            .andExpect(jsonPath("$.stall").value(firstStall.getCode()));

        mvc.perform(post("/api/payments")
                .session(firstSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.detail").value(
                "Já foi emitida uma senha para este período. Consulte os pagamentos para ver o estado e a validade."
            ));

        Stall secondStall = availableStall(market);
        MockHttpSession secondSession = register(market, secondStall, "second");
        mvc.perform(post("/api/payments")
                .session(secondSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk());

        mvc.perform(get("/api/payments").session(firstSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].stall").value(firstStall.getCode()));

        MvcResult adminLogin = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identifier\":\"admin@beira.gov.mz\",\"password\":\"admin123456789\"}"))
            .andExpect(status().isOk())
            .andReturn();
        MockHttpSession adminSession =
            (MockHttpSession) adminLogin.getRequest().getSession(false);
        mvc.perform(get("/api/payments").session(adminSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @Transactional
    void merchantCannotRegisterCashOrApprovePayments() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        MockHttpSession merchantSession = register(market, availableStall(market), "merchant-role");
        MvcResult issued = mvc.perform(post("/api/payments")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk())
            .andReturn();
        PaymentPayload payment = objectMapper.readValue(
            issued.getResponse().getContentAsString(), PaymentPayload.class
        );

        mvc.perform(post("/api/payments/" + payment.id() + "/cash").session(merchantSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/" + payment.id() + "/confirm").session(merchantSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/" + payment.id() + "/reject")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Não autorizado\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/markets")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Mercado não autorizado\",\"active\":true}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void fiscalWithoutAssignedMarketCannotViewOrCollectPayments() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        MockHttpSession merchantSession = register(market, availableStall(market), "unassigned-fiscal");
        MvcResult issued = mvc.perform(post("/api/payments")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk())
            .andReturn();
        PaymentPayload payment = objectMapper.readValue(
            issued.getResponse().getContentAsString(), PaymentPayload.class
        );

        String suffix = UUID.randomUUID().toString();
        Account fiscal = accounts.save(new Account(
            "Fiscal sem mercado",
            "unassigned-fiscal-" + suffix + "@example.test",
            "+258 84 " + Math.abs(suffix.hashCode() % 1_000_000_000),
            "unused",
            "FISCAL",
            null,
            null,
            null
        ));
        MockHttpSession fiscalSession = new MockHttpSession();
        fiscalSession.setAttribute(SessionAccountService.ACCOUNT_SESSION_KEY, fiscal.getId());

        mvc.perform(get("/api/payments").session(fiscalSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/payments/reference/" + payment.paymentReference()).session(fiscalSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/" + payment.id() + "/cash").session(fiscalSession))
            .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void simulatedWalletCallbacksAreScopedAndIdempotent() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        MockHttpSession merchantSession = register(market, availableStall(market), "wallet-confirm");
        MvcResult issued = mvc.perform(post("/api/payments")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"M-Pesa\",\"phone\":\"+258 84 111 2233\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pendente"))
            .andExpect(jsonPath("$.method").value("M-Pesa"))
            .andExpect(jsonPath("$.walletPhone").value("+258 84 111 2233"))
            .andReturn();
        PaymentPayload payment = objectMapper.readValue(
            issued.getResponse().getContentAsString(), PaymentPayload.class
        );

        MockHttpSession otherMerchant = register(market, availableStall(market), "wallet-other");
        mvc.perform(post("/api/payments/" + payment.id() + "/wallet/simulation/callback")
                .session(otherMerchant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"CONFIRMED\"}"))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/payments/" + payment.id() + "/wallet/simulation/callback")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"TIMEOUT\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pendente"))
            .andExpect(jsonPath("$.paidAt").doesNotExist());
        mvc.perform(post("/api/payments/" + payment.id() + "/wallet/simulation/callback")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"CONFIRMED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pago"))
            .andExpect(jsonPath("$.paidAt").exists());
        mvc.perform(post("/api/payments/" + payment.id() + "/wallet/simulation/callback")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"CONFIRMED\"}"))
            .andExpect(status().isConflict());

        MockHttpSession rejectedMerchant = register(
            market, availableStall(market), "wallet-reject"
        );
        MvcResult rejectedIssued = mvc.perform(post("/api/payments")
                .session(rejectedMerchant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Mkesh\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pendente"))
            .andReturn();
        PaymentPayload rejectedPayment = objectMapper.readValue(
            rejectedIssued.getResponse().getContentAsString(), PaymentPayload.class
        );
        mvc.perform(post("/api/payments/" + rejectedPayment.id() + "/wallet/simulation/callback")
                .session(rejectedMerchant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"REJECTED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Rejeitado"))
            .andExpect(jsonPath("$.rejectionReason").value(
                "A carteira móvel simulada rejeitou a transacção."
            ));
        mvc.perform(post("/api/payments")
                .session(rejectedMerchant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Mkesh\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pendente"));
    }

    @Test
    void cashCollectionRequiresFiscalAndSeparateFinancialConfirmation() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        Stall stall = availableStall(market);
        MockHttpSession merchantSession = register(market, stall, "workflow");
        MvcResult issued = mvc.perform(post("/api/payments")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pendente"))
            .andReturn();
        PaymentPayload payment = objectMapper.readValue(
            issued.getResponse().getContentAsString(), PaymentPayload.class
        );

        MockHttpSession adminSession = adminLogin();
        mvc.perform(get("/api/admin/tickets").session(adminSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.numero == '" + payment.paymentReference() + "')]").isEmpty());
        mvc.perform(get("/api/notifications").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Senha emitida"));

        String suffix = UUID.randomUUID().toString();
        MockHttpSession fiscalSession = createStaffAndLogin(
            adminSession, market.getId(), "FISCAL", "fiscal-" + suffix
        );
        MockHttpSession managerSession = createStaffAndLogin(
            adminSession, market.getId(), "FINANCIAL_MANAGER", "manager-" + suffix
        );

        mvc.perform(post("/api/payments/" + payment.id() + "/confirm").session(fiscalSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/" + payment.id() + "/cash").session(fiscalSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Aguardando confirmação"));
        Long fiscalAccountId = accounts.findByEmailIgnoreCase(
            "fiscal-" + suffix + "@example.test"
        ).orElseThrow().getId();
        mvc.perform(delete("/api/admin/users/" + fiscalAccountId).session(adminSession))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.detail").value(
                "Não é possível eliminar este utilizador porque está associado ao histórico de pagamentos."
            ));
        mvc.perform(get("/api/notifications").session(managerSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Pagamento a confirmar"));
        mvc.perform(post("/api/payments/" + payment.id() + "/cash").session(fiscalSession))
            .andExpect(status().isConflict());

        mvc.perform(post("/api/payments/" + payment.id() + "/confirm").session(managerSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Pago"))
            .andExpect(jsonPath("$.confirmedBy").value("manager-" + suffix))
            .andExpect(jsonPath("$.paidAt").exists());
        mvc.perform(post("/api/payments/" + payment.id() + "/confirm").session(managerSession))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/notifications").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Pagamento confirmado"));

        mvc.perform(get("/api/payments").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].status", is("Pago")));

        Stall secondStall = availableStall(market);
        MockHttpSession secondMerchantSession = register(market, secondStall, "reject");
        MvcResult secondIssued = mvc.perform(post("/api/payments")
                .session(secondMerchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isOk())
            .andReturn();
        PaymentPayload secondPayment = objectMapper.readValue(
            secondIssued.getResponse().getContentAsString(), PaymentPayload.class
        );
        mvc.perform(post("/api/payments/" + secondPayment.id() + "/cash").session(managerSession))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/" + secondPayment.id() + "/cash").session(fiscalSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Aguardando confirmação"));
        mvc.perform(post("/api/payments/" + secondPayment.id() + "/reject")
                .session(managerSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Valor recebido não confere\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Rejeitado"))
            .andExpect(jsonPath("$.rejectionReason").value("Valor recebido não confere"));
        mvc.perform(get("/api/payments").session(secondMerchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].status").value("Rejeitado"));
    }

    @Test
    void expiredUnpaidTicketsAreMarkedAndBlockMerchantAfterFour() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        Stall stall = availableStall(market);
        MockHttpSession merchantSession = register(market, stall, "expired");
        Long accountId = (Long) merchantSession.getAttribute("accountId");
        Account merchant = accounts.findById(accountId).orElseThrow();
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Maputo"));
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Africa/Maputo"));
        for (int day = 1; day <= 4; day++) {
            LocalDate period = today.minusDays(day);
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            payments.save(new Payment(
                "PAG-" + suffix, "TRX-" + suffix, merchant, market, stall, "Peixe", "Diária",
                period, period, new BigDecimal("50"), "Numerário",
                now.minusHours(49), now.minusHours(1)
            ));
        }

        mvc.perform(get("/api/payments").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].status").value("Expirada"));
        org.junit.jupiter.api.Assertions.assertEquals("Bloqueado", accounts.findById(accountId).orElseThrow().getStatus());
        mvc.perform(get("/api/auth/me").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Bloqueado"))
            .andExpect(jsonPath("$.statusReason").exists());
        mvc.perform(post("/api/payments")
                .session(merchantSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"Numerário\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.detail").value("O comerciante está bloqueado para novas senhas."));

        Account blockedMerchant = accounts.findById(accountId).orElseThrow();
        MockHttpSession blockedLogin = (MockHttpSession) mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new LoginPayload(blockedMerchant.getPhone(), "password123")
                )))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Bloqueado"))
            .andReturn()
            .getRequest()
            .getSession(false);
        mvc.perform(get("/api/payments").session(blockedLogin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4));

        MockHttpSession adminSession = adminLogin();
        mvc.perform(patch("/api/admin/merchants/" + accountId + "/status")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"Regular\",\"reason\":\"Regularização comprovada\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Regular"))
            .andExpect(jsonPath("$.statusReason").value("Regularização comprovada"));

        Account regularizedMerchant = accounts.findById(accountId).orElseThrow();
        MockHttpSession regularizedSession = (MockHttpSession) mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new LoginPayload(regularizedMerchant.getEmail(), "password123")
                )))
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession(false);
        mvc.perform(get("/api/payments").session(regularizedSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4));
        org.junit.jupiter.api.Assertions.assertEquals(
            "Regular",
            accounts.findById(accountId).orElseThrow().getStatus()
        );
    }

    @Test
    @Transactional
    void scheduledMaintenanceSendsOnePaymentReminderBeforeExpiry() throws Exception {
        Market market = markets.findByName("Mercado do Maquinino").orElseThrow();
        MockHttpSession merchantSession = register(market, availableStall(market), "reminder");
        Account merchant = accounts.findById(
            (Long) merchantSession.getAttribute(SessionAccountService.ACCOUNT_SESSION_KEY)
        ).orElseThrow();
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Maputo"));
        LocalDateTime current = LocalDateTime.now(ZoneId.of("Africa/Maputo"));
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        Payment payment = payments.save(new Payment(
            "PAG-" + suffix, "TRX-" + suffix, merchant, market, merchant.getStall(),
            merchant.getProduct(), "Diária", today, today,
            new BigDecimal("50"), "M-Pesa", current.minusHours(24), current.plusHours(23)
        ));

        paymentService.maintainPaymentsAndReminders();
        mvc.perform(get("/api/notifications").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Lembrete de pagamento"))
            .andExpect(jsonPath("$[0].message").value(
                org.hamcrest.Matchers.containsString(payment.getPaymentReference())
            ));
        org.junit.jupiter.api.Assertions.assertNotNull(
            payments.findById(payment.getId()).orElseThrow().getReminderSentAt()
        );

        paymentService.maintainPaymentsAndReminders();
        mvc.perform(get("/api/notifications").session(merchantSession))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    private MockHttpSession register(Market market, Stall stall, String prefix) throws Exception {
        String unique = prefix + "-" + UUID.randomUUID();
        String request = objectMapper.writeValueAsString(new RegisterPayload(
            "Comerciante " + prefix,
            unique + "@example.test",
            "+258 84 " + Math.abs(unique.hashCode() % 1_000_000_000),
            "password123",
            market.getId(),
            stall.getId(),
            "Peixe"
        ));
        MvcResult result = mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isOk())
            .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private Stall availableStall(Market market) {
        return stalls.findAllByMarketIdOrderByCode(market.getId()).stream()
            .filter(stall -> accounts.findByStallId(stall.getId()).isEmpty())
            .findFirst()
            .orElseThrow();
    }

    private MockHttpSession adminLogin() throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identifier\":\"admin@beira.gov.mz\",\"password\":\"admin123456789\"}"))
            .andExpect(status().isOk())
            .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private MockHttpSession createStaffAndLogin(
        MockHttpSession adminSession, Long marketId, String role, String prefix
    ) throws Exception {
        String email = prefix + "@example.test";
        String phone = "+258 84 " + Math.abs(prefix.hashCode() % 1_000_000_000);
        mvc.perform(post("/api/admin/users")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new StaffPayload(
                    prefix, email, phone, "staffPassword123", role, marketId
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value(role));

        MvcResult login = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginPayload(email, "staffPassword123"))))
            .andExpect(status().isOk())
            .andReturn();
        return (MockHttpSession) login.getRequest().getSession(false);
    }

    private record RegisterPayload(
        String name,
        String email,
        String phone,
        String password,
        Long marketId,
        Long stallId,
        String product
    ) {}

    private record StaffPayload(
        String name, String email, String phone, String password, String role, Long marketId
    ) {}

    private record LoginPayload(String identifier, String password) {}

    private record PaymentPayload(Long id, String status, String paymentReference) {}
}
