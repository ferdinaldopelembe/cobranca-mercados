package mz.beira.cobranca.repositories;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;
import mz.beira.cobranca.models.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByAccountIdOrderByIdDesc(Long accountId);
    List<Payment> findAllByOrderByIdDesc();
    boolean existsByCashierId(Long cashierId);
    boolean existsByConfirmedById(Long confirmedById);
    List<Payment> findAllByPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtDesc(
        LocalDateTime from, LocalDateTime until
    );
    Optional<Payment> findByPaymentReferenceIgnoreCase(String paymentReference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select payment from Payment payment where payment.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);
}
