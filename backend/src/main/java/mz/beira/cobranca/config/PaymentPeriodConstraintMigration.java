package mz.beira.cobranca.config;

import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PaymentPeriodConstraintMigration implements ApplicationRunner {
    private static final String LEGACY_CONSTRAINTS = """
        SELECT tc.CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
         AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.TABLE_SCHEMA = CURRENT_SCHEMA()
          AND tc.TABLE_NAME = 'PAYMENTS'
          AND tc.CONSTRAINT_TYPE = 'UNIQUE'
        GROUP BY tc.CONSTRAINT_NAME
        HAVING COUNT(*) = 3
           AND COUNT(DISTINCT kcu.COLUMN_NAME) = 3
           AND SUM(CASE WHEN kcu.COLUMN_NAME IN ('ACCOUNT_ID', 'PERIOD_START', 'PERIOD_END')
                        THEN 1 ELSE 0 END) = 3
        """;

    private final JdbcTemplate jdbc;

    public PaymentPeriodConstraintMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        List<String> constraints = jdbc.queryForList(LEGACY_CONSTRAINTS, String.class);
        for (String constraint : constraints) {
            String quotedConstraint = "\"" + constraint.replace("\"", "\"\"") + "\"";
            jdbc.execute("ALTER TABLE PAYMENTS DROP CONSTRAINT " + quotedConstraint);
        }
    }
}
