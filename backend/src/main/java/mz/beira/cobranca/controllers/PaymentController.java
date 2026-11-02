package mz.beira.cobranca.controllers;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import mz.beira.cobranca.dto.PaymentRequest;
import mz.beira.cobranca.dto.PaymentResponse;
import mz.beira.cobranca.dto.WalletSimulationRequest;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.services.SessionAccountService;
import mz.beira.cobranca.services.PaymentService;
import mz.beira.cobranca.services.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService payments;
    private final SessionAccountService sessionAccounts;
    private final AdminService admin;

    public PaymentController(
        PaymentService payments,
        SessionAccountService sessionAccounts,
        AdminService admin
    ) {
        this.payments = payments;
        this.sessionAccounts = sessionAccounts;
        this.admin = admin;
    }

    @GetMapping
    @Transactional
    public List<PaymentResponse> list(HttpSession session) {
        Account account = sessionAccounts.getAccount(session);
        return payments.getPayments(account);
    }

    @PostMapping
    @Transactional
    public PaymentResponse create(
        @Valid @RequestBody PaymentRequest request,
        HttpSession session,
        HttpServletRequest servletRequest
    ) {
        Account account = sessionAccounts.getAccount(session);
        PaymentResponse response = payments.makePayment(account, request);
        admin.audit(
            account, "Emissão", "Senha",
            "Emitiu a senha " + response.paymentReference() + ".", servletRequest.getRemoteAddr()
        );
        return response;
    }

    @GetMapping("/reference/{reference}")
    @Transactional
    public PaymentResponse findByReference(@PathVariable String reference, HttpSession session) {
        return payments.findByReference(reference, sessionAccounts.getAccount(session));
    }

    @PostMapping("/{paymentId}/cash")
    @Transactional
    public PaymentResponse registerCashPayment(
        @PathVariable Long paymentId,
        HttpSession session,
        HttpServletRequest request
    ) {
        Account fiscal = sessionAccounts.getAccount(session);
        PaymentResponse response = payments.registerCashPayment(paymentId, fiscal);
        admin.audit(
            fiscal, "Registo", "Pagamento",
            "Registou o recebimento em numerário da senha " + response.paymentReference() + ".",
            request.getRemoteAddr()
        );
        return response;
    }

    @PostMapping("/{paymentId}/confirm")
    @Transactional
    public PaymentResponse confirmCashPayment(
        @PathVariable Long paymentId,
        HttpSession session,
        HttpServletRequest request
    ) {
        Account manager = sessionAccounts.getAccount(session);
        PaymentResponse response = payments.confirmCashPayment(paymentId, manager);
        admin.audit(
            manager, "Confirmação", "Pagamento",
            "Confirmou o pagamento " + response.paymentReference() + ".", request.getRemoteAddr()
        );
        return response;
    }

    @PostMapping("/{paymentId}/reject")
    @Transactional
    public PaymentResponse rejectCashPayment(
        @PathVariable Long paymentId,
        @Valid @RequestBody RejectionRequest rejection,
        HttpSession session,
        HttpServletRequest request
    ) {
        Account manager = sessionAccounts.getAccount(session);
        PaymentResponse response = payments.rejectCashPayment(paymentId, rejection.reason(), manager);
        admin.audit(
            manager, "Rejeição", "Pagamento",
            "Rejeitou o pagamento " + response.paymentReference() + ": " + rejection.reason().trim(),
            request.getRemoteAddr()
        );
        return response;
    }

    @PostMapping("/{paymentId}/wallet/simulation/callback")
    @Transactional
    public PaymentResponse simulateWalletCallback(
        @PathVariable Long paymentId,
        @Valid @RequestBody WalletSimulationRequest simulation,
        HttpSession session,
        HttpServletRequest request
    ) {
        Account merchant = sessionAccounts.getAccount(session);
        PaymentResponse response = payments.simulateWalletCallback(
            paymentId, simulation.outcome(), merchant
        );
        admin.audit(
            merchant, "Simulação", "Pagamento",
            "Processou o callback simulado " + simulation.outcome()
                + " da senha " + response.paymentReference() + ".",
            request.getRemoteAddr()
        );
        return response;
    }

    public record RejectionRequest(@NotBlank @Size(max = 500) String reason) {}
}
