package mz.beira.cobranca.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PaymentRequest(
    @NotBlank String method,
    @Size(max = 30) @Pattern(regexp = "\\+?[0-9][0-9\\s-]{6,23}") String phone
) {
    public PaymentRequest(String method) {
        this(method, null);
    }
}
