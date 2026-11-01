package mz.beira.cobranca;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CobrancaApplication {

	public static void main(String[] args) {
		configureDatabasePath();
		SpringApplication.run(CobrancaApplication.class, args);
	}

	static void configureDatabasePath() {
		if (System.getProperty("spring.datasource.url") != null
			|| System.getenv("SPRING_DATASOURCE_URL") != null
			|| System.getenv("COBRANCA_DB_URL") != null) {
			return;
		}

		Path dataDirectory = databaseDirectoryFor(Path.of(""));
		try {
			Files.createDirectories(dataDirectory);
		} catch (IOException exception) {
			throw new IllegalStateException("Não foi possível criar a pasta de dados do backend: " + dataDirectory, exception);
		}

		String databasePath = dataDirectory.resolve("cobranca").toString().replace('\\', '/');
		System.setProperty(
			"spring.datasource.url",
			"jdbc:h2:file:" + databasePath + ";DB_CLOSE_ON_EXIT=FALSE"
		);
	}

	static Path databaseDirectoryFor(Path workingDirectory) {
		Path normalized = workingDirectory.toAbsolutePath().normalize();
		Path backendDirectory = Files.isRegularFile(normalized.resolve("backend/pom.xml"))
			? normalized.resolve("backend")
			: normalized;
		return backendDirectory.resolve("data");
	}

}
