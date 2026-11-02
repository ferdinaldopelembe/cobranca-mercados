package mz.beira.cobranca.controllers;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleResponseStatusException(
        ResponseStatusException exception
    ) {
        ProblemDetail problem = ProblemDetail.forStatus(exception.getStatusCode());
        String reason = exception.getReason();
        if (reason != null && !reason.isBlank()) {
            problem.setDetail(reason);
        }
        return ResponseEntity.status(exception.getStatusCode()).body(problem);
    }
}
