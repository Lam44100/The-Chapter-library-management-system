package com.portfolio.library;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  HttpSessionSecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http, HttpSessionSecurityContextRepository repository)
      throws Exception {
    return http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/v1/auth/login",
                        "/api/v1/auth/demo",
                        "/api/v1/auth/csrf",
                        "/api/v1/demo",
                        "/api/v1/catalog/**",
                        "/api/v1/authors",
                        "/actuator/health",
                        "/",
                        "/index.html",
                        "/assets/**",
                        "/favicon.svg",
                        "/catalog",
                        "/catalog/**",
                        "/loans",
                        "/reservations",
                        "/dashboard",
                        "/admin",
                        "/login",
                        "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .securityContext(c -> c.securityContextRepository(repository))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, ex) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter()
                              .write(
                                  "{\"message\":\"This action was not allowed. Refresh the page and"
                                      + " try again.\"}");
                        }))
        .logout(l -> l.disable())
        .requestCache(c -> c.disable())
        .build();
  }
}
