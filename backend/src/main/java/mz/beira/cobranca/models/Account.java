package mz.beira.cobranca.models;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.Locale;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "accounts", uniqueConstraints = {
    @UniqueConstraint(columnNames = "email"),
    @UniqueConstraint(columnNames = "phone"),
    @UniqueConstraint(columnNames = "nuit"),
    @UniqueConstraint(columnNames = "stall_id")
})
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String passwordHash;
    private String role;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_id")
    private Market market;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stall_id")
    private Stall stall;
    private String product;
    private String nuit;
    private String status = "Regular";
    private String statusReason;
    private LocalDateTime statusUpdatedAt;
    private LocalDateTime createdAt = LocalDateTime.now();

    protected Account() {}

    public Account(String name, String email, String phone, String passwordHash, String role,
                   Market market, Stall stall, String product) {
        this(name, email, phone, passwordHash, role, market, stall, product, null);
    }

    public Account(String name, String email, String phone, String passwordHash, String role,
                   Market market, Stall stall, String product, String nuit) {
        this.name = name;
        this.email = email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        this.phone = phone == null || phone.isBlank() ? null : phone.trim();
        this.passwordHash = passwordHash;
        this.role = role;
        this.market = market;
        this.stall = stall;
        this.product = product;
        this.nuit = nuit;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public Market getMarket() { return market; }
    public Stall getStall() { return stall; }
    public String getProduct() { return product; }
    public String getNuit() { return nuit; }
    public String getStatus() { return status; }
    public String getStatusReason() { return statusReason; }
    public LocalDateTime getStatusUpdatedAt() { return statusUpdatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void associateBusiness(Market market, Stall stall, String product) {
        this.market = market;
        this.stall = stall;
        this.product = product;
    }

    public void updateMerchant(String name, String nuit, String phone, String email,
                               Market market, Stall stall, String product) {
        this.name = name;
        this.nuit = nuit;
        this.phone = phone;
        this.email = email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        associateBusiness(market, stall, product);
    }

    public void setStatus(String status, String reason) {
        this.status = status;
        this.statusReason = reason;
        this.statusUpdatedAt = LocalDateTime.now(ZoneId.of("Africa/Maputo"));
    }

    public void setNuit(String nuit) {
        this.nuit = nuit;
    }
}
