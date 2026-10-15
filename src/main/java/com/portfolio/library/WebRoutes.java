package com.portfolio.library;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebRoutes {
  @GetMapping({
    "/catalog",
    "/catalog/{id}",
    "/loans",
    "/reservations",
    "/dashboard",
    "/admin",
    "/login"
  })
  String application() {
    return "forward:/index.html";
  }
}
