package mz.beira.cobranca.repositories;

import java.util.List;
import mz.beira.cobranca.models.AppNotification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findAllByAccountIdOrderByCreatedAtDesc(Long accountId);

    @Modifying
    @Query("delete from AppNotification notification where notification.account.id = :accountId")
    int deleteAllByAccountId(@Param("accountId") Long accountId);
}
