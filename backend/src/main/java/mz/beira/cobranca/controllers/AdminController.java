package mz.beira.cobranca.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import mz.beira.cobranca.dto.AdminDtos;
import mz.beira.cobranca.dto.MarketResponse;
import mz.beira.cobranca.dto.PaymentResponse;
import mz.beira.cobranca.dto.RateResponse;
import mz.beira.cobranca.dto.StallResponse;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.services.AdminService;
import mz.beira.cobranca.services.SessionAccountService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private static final ZoneId MAPUTO = ZoneId.of("Africa/Maputo");
    private final AdminService admin;
    private final SessionAccountService sessionAccounts;

    public AdminController(AdminService admin, SessionAccountService sessionAccounts) {
        this.admin = admin;
        this.sessionAccounts = sessionAccounts;
    }

    @GetMapping("/markets")
    public List<MarketResponse> markets(HttpSession session) {
        Account account = sessionAccounts.getAccount(session);
        if ("ADMIN".equals(account.getRole())) return admin.markets();
        if ("FINANCIAL_MANAGER".equals(account.getRole())) {
            return admin.markets(account.getMarket() == null ? null : account.getMarket().getId());
        }
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Acesso reservado à administração e à gestão financeira."
        );
    }

    @PostMapping("/markets")
    public MarketResponse createMarket(
        @Valid @RequestBody AdminDtos.MarketInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createMarket(input, administrator(session), request.getRemoteAddr());
    }

    @PutMapping("/markets/{id}")
    public MarketResponse updateMarket(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.MarketInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.updateMarket(id, input, administrator(session), request.getRemoteAddr());
    }

    @PostMapping("/stalls")
    public StallResponse createStall(
        @Valid @RequestBody AdminDtos.StallInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createStall(input, administrator(session), request.getRemoteAddr());
    }

    @GetMapping("/merchants")
    public List<AdminDtos.MerchantResponse> merchants(HttpSession session) {
        administrator(session);
        return admin.merchants();
    }

    @PostMapping("/merchants")
    public AdminDtos.MerchantResponse createMerchant(
        @Valid @RequestBody AdminDtos.MerchantInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createMerchant(input, administrator(session), request.getRemoteAddr());
    }

    @PutMapping("/merchants/{id}")
    public AdminDtos.MerchantResponse updateMerchant(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.MerchantUpdate input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.updateMerchant(id, input, administrator(session), request.getRemoteAddr());
    }

    @PatchMapping("/merchants/{id}/status")
    public AdminDtos.MerchantResponse setMerchantStatus(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.StatusInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        Account actor = administrator(session);
        return admin.setMerchantStatus(id, input, actor, request.getRemoteAddr());
    }

    @GetMapping("/rates")
    public List<RateResponse> rates(HttpSession session) {
        administrator(session);
        return admin.rates();
    }

    @PostMapping("/rates")
    public RateResponse createRate(
        @Valid @RequestBody AdminDtos.RateInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createRate(input, administrator(session), request.getRemoteAddr());
    }

    @PutMapping("/rates/{id}")
    public RateResponse updateRate(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.RateInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.updateRate(id, input, administrator(session), request.getRemoteAddr());
    }

    @PatchMapping("/rates/{id}/status")
    public RateResponse setRateStatus(
        @PathVariable Long id,
        @RequestBody AdminDtos.StatusInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        boolean active = "Activa".equals(input.status());
        if (!active && !"Suspensa".equals(input.status()) && !"Inactiva".equals(input.status())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Estado da taxa inválido."
            );
        }
        return admin.setRateStatus(id, active, administrator(session), request.getRemoteAddr());
    }

    @GetMapping("/fiscals")
    public List<AdminDtos.FiscalResponse> fiscals(HttpSession session) {
        administrator(session);
        return admin.fiscals();
    }

    @GetMapping("/users")
    public List<AdminDtos.StaffResponse> staffUsers(HttpSession session) {
        administrator(session);
        return admin.staffUsers();
    }

    @PostMapping("/users")
    public AdminDtos.StaffResponse createStaff(
        @Valid @RequestBody AdminDtos.StaffInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createStaff(input, administrator(session), request.getRemoteAddr());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteStaff(
        @PathVariable Long id,
        HttpSession session,
        HttpServletRequest request
    ) {
        admin.deleteStaff(id, administrator(session), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/fiscals")
    public AdminDtos.FiscalResponse createFiscal(
        @Valid @RequestBody AdminDtos.FiscalInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.createFiscal(input, administrator(session), request.getRemoteAddr());
    }

    @PutMapping("/fiscals/{id}")
    public AdminDtos.FiscalResponse updateFiscal(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.FiscalInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.updateFiscal(id, input, administrator(session), request.getRemoteAddr());
    }

    @PatchMapping("/fiscals/{id}/status")
    public AdminDtos.FiscalResponse setFiscalStatus(
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.StatusInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        if (!List.of("Activo", "Inactivo").contains(input.status())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Estado do fiscal inválido."
            );
        }
        return admin.setFiscalStatus(
            id, "Activo".equals(input.status()), input.reason(), administrator(session),
            request.getRemoteAddr()
        );
    }

    @GetMapping("/dashboard")
    public AdminDtos.DashboardResponse dashboard(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(required = false) Long marketId,
        HttpSession session
    ) {
        administrator(session);
        LocalDate until = to == null ? LocalDate.now(MAPUTO) : to;
        LocalDate start = from == null ? until.minusDays(6) : from;
        validateRange(start, until);
        return admin.dashboard(start, until, marketId);
    }

    @GetMapping("/reports")
    public AdminDtos.ReportResponse reports(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(required = false) Long marketId,
        HttpSession session
    ) {
        Account actor = financialReporter(session);
        LocalDate until = to == null ? LocalDate.now(MAPUTO) : to;
        LocalDate start = from == null ? until.minusDays(29) : from;
        validateRange(start, until);
        return admin.report(start, until, reportMarket(actor, marketId));
    }

    @GetMapping("/tickets")
    public List<AdminDtos.TicketResponse> tickets(HttpSession session) {
        administrator(session);
        return admin.tickets();
    }

    @PostMapping("/payments")
    public PaymentResponse recordPayment(
        @Valid @RequestBody AdminDtos.PaymentInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.recordPayment(
            input.merchantId(), input.method(), administrator(session), request.getRemoteAddr()
        );
    }

    @GetMapping("/settings")
    public AdminDtos.SettingsResponse settings(HttpSession session) {
        administrator(session);
        return admin.getSettings();
    }

    @PutMapping("/settings")
    public AdminDtos.SettingsResponse saveSettings(
        @RequestBody AdminDtos.SettingsInput input,
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.saveSettings(input, administrator(session), request.getRemoteAddr());
    }

    @PostMapping("/settings/reset")
    public AdminDtos.SettingsResponse resetSettings(
        HttpSession session,
        HttpServletRequest request
    ) {
        return admin.resetSettings(administrator(session), request.getRemoteAddr());
    }

    @GetMapping("/audit")
    public List<AdminDtos.AuditResponse> audit(HttpSession session) {
        administrator(session);
        return admin.auditEvents();
    }

    private Account administrator(HttpSession session) {
        return sessionAccounts.getAdministrator(session);
    }

    private Account financialReporter(HttpSession session) {
        Account account = sessionAccounts.getAccount(session);
        if (!List.of("ADMIN", "FINANCIAL_MANAGER").contains(account.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Acesso reservado à administração e à gestão financeira."
            );
        }
        return account;
    }

    private Long reportMarket(Account actor, Long requestedMarketId) {
        if (!"FINANCIAL_MANAGER".equals(actor.getRole()) || actor.getMarket() == null) {
            return requestedMarketId;
        }
        Long assignedMarketId = actor.getMarket().getId();
        if (requestedMarketId != null && !assignedMarketId.equals(requestedMarketId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "O relatório está fora do seu mercado autorizado."
            );
        }
        return assignedMarketId;
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "A data inicial não pode ser posterior à data final."
            );
        }
        if (to.isAfter(LocalDate.now(MAPUTO))) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "A data final não pode estar no futuro."
            );
        }
    }
}
