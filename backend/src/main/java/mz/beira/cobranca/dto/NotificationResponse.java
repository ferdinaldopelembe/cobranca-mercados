package mz.beira.cobranca.dto;

import java.time.LocalDateTime;
import mz.beira.cobranca.models.AppNotification;

public record NotificationResponse(
    Long id, String title, String message, LocalDateTime createdAt, LocalDateTime readAt
) {
    public static NotificationResponse from(AppNotification notification) {
        return new NotificationResponse(
            notification.getId(), notification.getTitle(), notification.getMessage(),
            notification.getCreatedAt(), notification.getReadAt()
        );
    }
}
