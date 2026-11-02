package mz.beira.cobranca.controllers;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import mz.beira.cobranca.dto.NotificationResponse;
import mz.beira.cobranca.services.NotificationService;
import mz.beira.cobranca.services.SessionAccountService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    private final SessionAccountService sessionAccounts;

    public NotificationController(
        NotificationService notifications, SessionAccountService sessionAccounts
    ) {
        this.notifications = notifications;
        this.sessionAccounts = sessionAccounts;
    }

    @GetMapping
    public List<NotificationResponse> list(HttpSession session) {
        return notifications.list(sessionAccounts.getAccount(session));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id, HttpSession session) {
        return notifications.markRead(id, sessionAccounts.getAccount(session));
    }
}
