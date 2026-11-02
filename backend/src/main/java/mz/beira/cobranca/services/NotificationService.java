package mz.beira.cobranca.services;

import java.util.List;
import mz.beira.cobranca.dto.NotificationResponse;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.AppNotification;
import mz.beira.cobranca.repositories.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Account account) {
        return notifications.findAllByAccountIdOrderByCreatedAtDesc(account.getId()).stream()
            .map(NotificationResponse::from)
            .toList();
    }

    @Transactional
    public NotificationResponse markRead(Long id, Account account) {
        AppNotification notification = notifications.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));
        if (!notification.getAccount().getId().equals(account.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A notificação pertence a outra conta.");
        }
        notification.markRead();
        return NotificationResponse.from(notification);
    }

    @Transactional
    public void notify(Account account, String title, String message) {
        notifications.save(new AppNotification(account, title, message));
    }
}
