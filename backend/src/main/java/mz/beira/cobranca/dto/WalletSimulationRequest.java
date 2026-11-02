package mz.beira.cobranca.dto;

import jakarta.validation.constraints.NotNull;

public record WalletSimulationRequest(@NotNull Outcome outcome) {
    public enum Outcome {
        CONFIRMED,
        REJECTED,
        TIMEOUT
    }
}
