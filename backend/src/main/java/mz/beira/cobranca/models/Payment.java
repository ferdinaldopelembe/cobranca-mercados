package mz.beira.cobranca.models;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String paymentReference;
    @Column(unique = true, nullable = false)
    private String transactionReference;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_id", nullable = false)
    private Market market;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stall_id", nullable = false)
    private Stall stall;
    private String product;
    private String periodicity;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private BigDecimal amount;
    @Column(name = "payment_method")
    private String method;
    @Column(name = "wallet_phone", length = 30)
    private String walletPhone;
    private String status;
    private LocalDateTime issuedAt;
    private LocalDateTime paidAt;
    private LocalDateTime expiresAt;
    private LocalDateTime reminderSentAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id")
    private Account cashier;
    private LocalDateTime cashReceivedAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_id")
    private Account confirmedBy;
    private LocalDateTime confirmedAt;
    @Column(length = 500)
    private String rejectionReason;

    protected Payment() {}

    public Payment(String paymentReference, String transactionReference, Account account, Market market,
                   Stall stall, String product, String periodicity, LocalDate periodStart,
                   LocalDate periodEnd, BigDecimal amount, String method, LocalDateTime issuedAt,
                   LocalDateTime expiresAt) {
        this.paymentReference = paymentReference;
        this.transactionReference = transactionReference;
        this.account = account;
        this.market = market;
        this.stall = stall;
        this.product = product;
        this.periodicity = periodicity;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.amount = amount;
        this.method = method;
        this.status = "Pendente";
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public String getPaymentReference() { return paymentReference; }
    public String getTransactionReference() { return transactionReference; }
    public Account getAccount() { return account; }
    public Market getMarket() { return market; }
    public Stall getStall() { return stall; }
    public String getProduct() { return product; }
    public String getPeriodicity() { return periodicity; }
    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public BigDecimal getAmount() { return amount; }
    public String getMethod() { return method; }
    public String getWalletPhone() { return walletPhone; }
    public String getStatus() { return status; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getReminderSentAt() { return reminderSentAt; }
    public Account getCashier() { return cashier; }
    public LocalDateTime getCashReceivedAt() { return cashReceivedAt; }
    public Account getConfirmedBy() { return confirmedBy; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public String getRejectionReason() { return rejectionReason; }

    public void expireIfDue(LocalDateTime now) {
        if ("Pendente".equals(status) && expiresAt != null && !expiresAt.isAfter(now)) {
            status = "Expirada";
        }
    }

    public void registerCash(Account fiscal, LocalDateTime receivedAt) {
        status = "Aguardando confirmação";
        method = "Numerário";
        cashier = fiscal;
        cashReceivedAt = receivedAt;
    }

    public void confirm(Account manager, LocalDateTime confirmationTime) {
        status = "Pago";
        confirmedBy = manager;
        confirmedAt = confirmationTime;
        paidAt = confirmationTime;
        rejectionReason = null;
    }

    public void reject(String reason) {
        status = "Rejeitado";
        rejectionReason = reason;
    }

    public void confirmWallet(LocalDateTime confirmationTime) {
        status = "Pago";
        paidAt = confirmationTime;
        rejectionReason = null;
    }

    public void setWalletPhone(String walletPhone) {
        this.walletPhone = walletPhone;
    }

    public void markReminderSent(LocalDateTime sentAt) {
        reminderSentAt = sentAt;
    }
}
