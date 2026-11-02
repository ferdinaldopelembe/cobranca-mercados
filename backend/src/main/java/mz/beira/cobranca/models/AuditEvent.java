package mz.beira.cobranca.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDateTime occurredAt;
    private Long actorId;
    private String actorName;
    private String role;
    private String action;
    private String entity;
    private String description;
    private String ipAddress;

    protected AuditEvent() {}

    public AuditEvent(Account actor, String action, String entity, String description, String ipAddress) {
        this.occurredAt = LocalDateTime.now(java.time.ZoneId.of("Africa/Maputo"));
        this.actorId = actor.getId();
        this.actorName = actor.getName();
        this.role = actor.getRole();
        this.action = action;
        this.entity = entity;
        this.description = description;
        this.ipAddress = ipAddress;
    }

    public AuditEvent(String actorName, String action, String entity, String description) {
        this.occurredAt = LocalDateTime.now(java.time.ZoneId.of("Africa/Maputo"));
        this.actorName = actorName;
        this.role = "SYSTEM";
        this.action = action;
        this.entity = entity;
        this.description = description;
    }

    public Long getId() { return id; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public Long getActorId() { return actorId; }
    public String getActorName() { return actorName; }
    public String getRole() { return role; }
    public String getAction() { return action; }
    public String getEntity() { return entity; }
    public String getDescription() { return description; }
    public String getIpAddress() { return ipAddress; }
}
