package mz.beira.cobranca.services;

import java.util.Locale;
import mz.beira.cobranca.dto.LoginRequest;
import mz.beira.cobranca.dto.BusinessProfileRequest;
import mz.beira.cobranca.dto.RegisterRequest;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.models.Market;
import mz.beira.cobranca.models.Stall;
import mz.beira.cobranca.repositories.AccountRepository;
import mz.beira.cobranca.repositories.MarketRepository;
import mz.beira.cobranca.repositories.RateRepository;
import mz.beira.cobranca.repositories.StallRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
    private final AccountRepository accounts;
    private final MarketRepository markets;
    private final StallRepository stalls;
    private final RateRepository rates;
    private final PasswordEncoder passwordEncoder;

    public AccountService(AccountRepository accounts, MarketRepository markets, StallRepository stalls,
                          RateRepository rates, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.markets = markets;
        this.stalls = stalls;
        this.rates = rates;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Account register(RegisterRequest request) {
        String email = normalize(request.email());
        String phone = normalize(request.phone());
        if (email == null && phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um e-mail ou telefone.");
        }
        if (email != null && accounts.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está registado.");
        }
        if (phone != null && accounts.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este telefone já está registado.");
        }
        String nuit = normalize(request.nuit());
        if (nuit != null && accounts.existsByNuit(nuit)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este NUIT já está registado.");
        }

        Market market = markets.findById(request.marketId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado inválido."));
        if (!market.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O mercado seleccionado está inactivo.");
        }
        Stall stall = stalls.findByIdAndMarketId(request.stallId(), market.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "A banca não pertence ao mercado seleccionado."));
        if (accounts.findByStallId(stall.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta banca já está associada a uma conta.");
        }
        String product = request.product().trim();
        if (rates.findByMarketIdAndProductIgnoreCaseAndActiveTrue(market.getId(), product).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não existe uma taxa activa para este produto neste mercado.");
        }

        stall.setProduct(product);
        return accounts.save(new Account(
            request.name().trim(),
            email,
            phone,
            passwordEncoder.encode(request.password()),
            "MERCHANT",
            market,
            stall,
            product,
            nuit
        ));
    }

    public Account authenticate(LoginRequest request) {
        String identifier = request.identifier().trim();
        Account account = (identifier.contains("@")
            ? accounts.findByEmailIgnoreCase(identifier.toLowerCase(Locale.ROOT))
            : accounts.findByPhone(identifier))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas."));
        if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas.");
        }
        if ("Bloqueado".equals(account.getStatus()) && !"MERCHANT".equals(account.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A conta está bloqueada. Contacte a administração.");
        }
        return account;
    }

    public Account findById(Long id) {
        return accounts.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida."));
    }

    @Transactional
    public Account updateBusinessProfile(Account account, BusinessProfileRequest request) {
        Market market = markets.findById(request.marketId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado inválido."));
        if (!market.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O mercado seleccionado está inactivo.");
        }
        Stall stall = stalls.findByIdAndMarketId(request.stallId(), market.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "A banca não pertence ao mercado seleccionado."));
        accounts.findByStallId(stall.getId())
            .filter(existing -> !existing.getId().equals(account.getId()))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta banca já está associada a uma conta.");
            });
        String product = request.product().trim();
        if (rates.findByMarketIdAndProductIgnoreCaseAndActiveTrue(market.getId(), product).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não existe uma taxa activa para este produto neste mercado.");
        }
        account.associateBusiness(market, stall, product);
        stall.setProduct(product);
        return accounts.save(account);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
