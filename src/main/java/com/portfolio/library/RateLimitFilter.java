package com.portfolio.library;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private record Window(long minute, int count) {}

  private final Map<String, Window> windows = new HashMap<>();
  private final Clock clock;

  RateLimitFilter(Clock clock) {
    this.clock = clock;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    if (req.getRequestURI().startsWith("/api/")
        && !Set.of("GET", "HEAD", "OPTIONS").contains(req.getMethod())) {
      boolean login = req.getRequestURI().startsWith("/api/v1/auth/");
      String key = req.getRemoteAddr() + ":" + (login ? "auth" : "write");
      long minute = clock.instant().getEpochSecond() / 60;
      boolean rejected;
      synchronized (windows) {
        windows.entrySet().removeIf(e -> e.getValue().minute() < minute);
        Window old = windows.getOrDefault(key, new Window(minute, 0));
        rejected = old.count() >= (login ? 20 : 120) || windows.size() >= 10000;
        if (!rejected) windows.put(key, new Window(minute, old.count() + 1));
      }
      if (rejected) {
        res.setStatus(429);
        res.setHeader("Retry-After", "60");
        res.setContentType("application/json");
        res.getWriter()
            .write("{\"message\":\"Too many requests. Please wait a minute and try again.\"}");
        return;
      }
    }
    chain.doFilter(req, res);
  }
}
