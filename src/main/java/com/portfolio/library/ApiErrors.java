package com.portfolio.library;

import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiErrors {
  public record Error(String message, Map<String, String> fields) {}

  @ExceptionHandler(LibraryException.class)
  ResponseEntity<Error> business(LibraryException e) {
    return ResponseEntity.status(e.status).body(new Error(e.getMessage(), Map.of()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Error> invalid(MethodArgumentNotValidException e) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getBindingResult()
        .getFieldErrors()
        .forEach(f -> fields.put(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest()
        .body(new Error("Please check the highlighted fields.", fields));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Error> integrity() {
    return ResponseEntity.status(409)
        .body(
            new Error(
                "This change conflicts with an existing record. Refresh and try again.", Map.of()));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<Error> unreadable() {
    return ResponseEntity.badRequest()
        .body(new Error("The request contains an invalid value.", Map.of()));
  }
}
