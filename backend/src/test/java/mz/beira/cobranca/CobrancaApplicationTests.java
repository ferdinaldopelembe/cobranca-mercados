package mz.beira.cobranca;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import mz.beira.cobranca.models.Account;
import mz.beira.cobranca.repositories.AccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"spring.datasource.url=jdbc:h2:mem:cobranca-context-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
	"app.admin.password=admin123456789"
})
class CobrancaApplicationTests {
	@Autowired private AccountRepository accounts;
	@Autowired
	@Qualifier("seedInitialData")
	private CommandLineRunner seedInitialData;

	@Test
	void contextLoads() {
	}

	@Test
	void databaseDirectoryIsStableWhenStartedFromProjectRootOrBackend() {
		Path currentDirectory = Path.of("").toAbsolutePath().normalize();
		Path projectRoot = currentDirectory.getFileName().toString().equals("backend")
			? currentDirectory.getParent()
			: currentDirectory;

		assertEquals(
			CobrancaApplication.databaseDirectoryFor(projectRoot),
			CobrancaApplication.databaseDirectoryFor(projectRoot.resolve("backend"))
		);
	}

	@Test
	void adminSeedDoesNotConflictWithAnExistingPhone() throws Exception {
		Account admin = accounts.findAllByRoleOrderByNameAsc("ADMIN").get(0);
		accounts.delete(admin);
		accounts.save(new Account(
			"Comerciante existente",
			"comerciante@example.test",
			"+258 84 123 4567",
			"test-hash",
			"MERCHANT",
			null,
			null,
			null
		));

		seedInitialData.run(new String[0]);

		Account recreatedAdmin = accounts.findByEmailIgnoreCase(admin.getEmail()).orElseThrow();
		assertNotNull(recreatedAdmin.getPasswordHash());
		assertNull(recreatedAdmin.getPhone());
	}

}
