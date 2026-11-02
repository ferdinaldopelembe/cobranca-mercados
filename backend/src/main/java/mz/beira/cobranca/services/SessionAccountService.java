package mz.beira.cobranca.services;

import jakarta.servlet.http.HttpSession;
import mz.beira.cobranca.models.Account;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessionAccountService {
    public static final String ACCOUNT_SESSION_KEY = "accountId";
    private final AccountService accounts;

    public SessionAccountService(AccountService accounts) {
        this.accounts = accounts;
    }

    public Account getAccount(HttpSession session) {
        Object accountId = session.getAttribute(ACCOUNT_SESSION_KEY);
        if (!(accountId instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicie sessão para continuar.");
        }
        Account account = accounts.findById(id);
        if ("Bloqueado".equals(account.getStatus()) && !"MERCHANT".equals(account.getRole())) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A conta está bloqueada. Contacte a administração.");
        }
        return account;
    }

    public Account getAdministrator(HttpSession session) {
        Account account = getAccount(session);
        if (!"ADMIN".equals(account.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso reservado à administração.");
        }
        return account;
    }
}
