package mz.beira.cobranca.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class AdminDtos {
    private AdminDtos() {}

    public record MarketInput(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 200) String location,
        @Size(max = 120) String manager,
        boolean active
    ) {}

    public record StallInput(
        @NotNull Long marketId,
        @NotBlank @Size(max = 24) String code,
        @NotBlank @Size(max = 80) String product
    ) {}

    public record MerchantInput(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Pattern(regexp = "\\d{9}") String nuit,
        @NotBlank @Size(max = 32) String phone,
        @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull Long marketId,
        @NotNull Long stallId,
        @NotBlank String product
    ) {}

    public record MerchantUpdate(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Pattern(regexp = "\\d{9}") String nuit,
        @NotBlank @Size(max = 32) String phone,
        @Email String email,
        @NotNull Long marketId,
        @NotNull Long stallId,
        @NotBlank String product
    ) {}

    public record StatusInput(@NotBlank String status, String reason) {}
    public record PaymentInput(@NotNull Long merchantId, @NotBlank String method) {}

    public record MerchantResponse(
        Long id, String name, String nuit, String phone, String email,
        Long marketId, String market, Long stallId, String stall, String product,
        String periodicity, BigDecimal amount, String status, String statusReason
    ) {}

    public record RateInput(
        @NotNull Long marketId,
        @NotBlank String product,
        @NotBlank String periodicity,
        @NotNull @Positive BigDecimal amount,
        boolean active,
        String description
    ) {}

    public record FiscalInput(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Pattern(regexp = "\\d{9}") String nuit,
        @NotBlank @Size(max = 32) String phone,
        @NotBlank @Email String email,
        @NotNull Long marketId,
        @NotBlank String zone,
        @NotBlank String shift
    ) {}

    public record FiscalResponse(
        Long id, String name, String nuit, String phone, String email,
        Long marketId, String market, String zone, String shift,
        String status, String statusReason
    ) {}

    public record StaffInput(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 32) String phone,
        @NotBlank @Size(min = 12, max = 72) String password,
        @NotBlank String role,
        Long marketId
    ) {}

    public record StaffResponse(
        Long id, String name, String email, String phone, String role,
        Long marketId, String market, String status
    ) {}

    public record AuditResponse(
        Long id, LocalDateTime data, Long userId, String utilizador, String perfil,
        String accao, String entidade, String descricao, String ip
    ) {}

    public record DailyRevenue(LocalDate date, BigDecimal revenue, long transactions) {}
    public record MarketRevenue(Long marketId, String market, BigDecimal revenue, long transactions,
                                long merchants) {}
    public record MethodRevenue(String method, BigDecimal revenue, long transactions) {}
    public record MerchantRecent(Long id, String name, String market, String product,
                                 String status, LocalDateTime createdAt) {}
    public record DashboardResponse(BigDecimal revenue, long transactions, long merchants,
                                   BigDecimal average, BigDecimal collectionRate,
                                   BigDecimal previousRevenue, List<DailyRevenue> daily,
                                   List<MarketRevenue> markets, List<MethodRevenue> methods,
                                   List<MerchantRecent> recentMerchants,
                                   List<PaymentResponse> recentPayments) {}
    public record ReportResponse(BigDecimal revenue, long transactions, long merchants,
                                 List<MarketRevenue> markets, List<DailyRevenue> daily,
                                 List<PaymentResponse> payments) {}
    public record TicketResponse(String numero, Long id, String comerciante, String nuit,
                                 String mercado, String banca, String tipoTaxa, BigDecimal valor,
                                 LocalDate periodoInicio, LocalDate periodoFim, LocalDateTime dataEmissao,
                                 String estado, String metodoPagamento) {}
    public record SettingsInput(Map<String, Object> geral, Map<String, Object> cobranca,
                                Map<String, Object> notificacoes, Map<String, Object> seguranca) {}
    public record SettingsResponse(Map<String, Object> geral, Map<String, Object> cobranca,
                                   Map<String, Object> notificacoes, Map<String, Object> seguranca) {}
}
