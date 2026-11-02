package mz.beira.cobranca.models;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "app_notifications")
public class AppNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    private String title;
    private String message;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    protected AppNotification() {}

    public AppNotification(Account account, String title, String message) {
        this.account = account;
        this.title = title;
        this.message = message;
        this.createdAt = LocalDateTime.now(ZoneId.of("Africa/Maputo"));
    }

    public Long getId() { return id; }
    public Account getAccount() { return account; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }

    public void markRead() {
        if (readAt == null) readAt = LocalDateTime.now(ZoneId.of("Africa/Maputo"));
    }
}
