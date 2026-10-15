package com.portfolio.library;

import com.portfolio.library.Views.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ApiController {
  final CatalogService catalog;
  final CirculationService circulation;
  final AccountService accounts;
  final DemoService demo;
  final HttpSessionSecurityContextRepository contexts;

  ApiController(
      CatalogService catalog,
      CirculationService circulation,
      AccountService accounts,
      DemoService demo,
      HttpSessionSecurityContextRepository contexts) {
    this.catalog = catalog;
    this.circulation = circulation;
    this.accounts = accounts;
    this.demo = demo;
    this.contexts = contexts;
  }

  @ModelAttribute
  void maintainDemo() {
    demo.maintain();
  }

  @GetMapping("/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/auth/login")
  User login(
      @Valid @RequestBody Requests.Login input, HttpServletRequest req, HttpServletResponse res) {
    return establish(accounts.login(input), req, res);
  }

  @PostMapping("/auth/demo")
  User demoLogin(
      @Valid @RequestBody Requests.DemoLogin input,
      HttpServletRequest req,
      HttpServletResponse res) {
    return establish(accounts.demoLogin(input.role()), req, res);
  }

  private User establish(Principal principal, HttpServletRequest req, HttpServletResponse res) {
    if (req.getSession(false) != null) req.changeSessionId();
    var authentication = new UsernamePasswordAuthenticationToken(principal, null, List.of());
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, req, res);
    new HttpSessionCsrfTokenRepository().saveToken(null, req, res);
    return accounts.me(authentication);
  }

  @GetMapping("/auth/me")
  User me(Authentication a) {
    return accounts.me(a);
  }

  @PostMapping("/auth/logout")
  void logout(HttpServletRequest req) {
    if (req.getSession(false) != null) req.getSession(false).invalidate();
    SecurityContextHolder.clearContext();
  }

  @GetMapping("/demo")
  Demo demo() {
    return demo.status();
  }

  @GetMapping("/catalog")
  Page<Book> catalog(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String genre,
      @RequestParam(defaultValue = "false") boolean available,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "12") int size) {
    return catalog.catalog(q, genre, available, page, size);
  }

  @GetMapping("/catalog/{id}")
  Book book(@PathVariable long id) {
    return catalog.detail(id);
  }

  @GetMapping("/authors")
  List<AuthorView> authors() {
    return catalog.authors();
  }

  @GetMapping("/users")
  List<User> users(Authentication a) {
    return accounts.users(a);
  }

  @PostMapping("/admin/users")
  User createUser(Authentication a, @Valid @RequestBody Requests.UserInput i) {
    return accounts.save(a, null, i);
  }

  @PutMapping("/admin/users/{id}")
  User updateUser(
      Authentication a, @PathVariable long id, @Valid @RequestBody Requests.UserInput i) {
    return accounts.save(a, id, i);
  }

  @DeleteMapping("/admin/users/{id}")
  void archiveUser(Authentication a, @PathVariable long id) {
    accounts.archive(a, id);
  }

  @PostMapping("/admin/authors")
  AuthorView createAuthor(Authentication a, @Valid @RequestBody Requests.AuthorInput i) {
    return catalog.author(a, null, i);
  }

  @PutMapping("/admin/authors/{id}")
  AuthorView updateAuthor(
      Authentication a, @PathVariable long id, @Valid @RequestBody Requests.AuthorInput i) {
    return catalog.author(a, id, i);
  }

  @PostMapping("/admin/titles")
  Book createTitle(Authentication a, @Valid @RequestBody Requests.TitleInput i) {
    return catalog.title(a, null, i);
  }

  @PutMapping("/admin/titles/{id}")
  Book updateTitle(
      Authentication a, @PathVariable long id, @Valid @RequestBody Requests.TitleInput i) {
    return catalog.title(a, id, i);
  }

  @PostMapping("/admin/copies")
  CopyView createCopy(Authentication a, @Valid @RequestBody Requests.CopyInput i) {
    return catalog.copy(a, null, i);
  }

  @PutMapping("/admin/copies/{id}")
  CopyView updateCopy(
      Authentication a, @PathVariable long id, @Valid @RequestBody Requests.CopyInput i) {
    return catalog.copy(a, id, i);
  }

  @DeleteMapping("/admin/{type:titles|authors|copies}/{id}")
  void archive(Authentication a, @PathVariable String type, @PathVariable long id) {
    catalog.archive(a, type, id);
  }

  @GetMapping("/loans")
  List<LoanView> loans(Authentication a, @RequestParam(required = false) Long borrowerId) {
    return circulation.loans(a, borrowerId);
  }

  @PostMapping("/loans")
  LoanView issue(Authentication a, @Valid @RequestBody Requests.Issue i) {
    return circulation.issue(a, i);
  }

  @PostMapping("/loans/{id}/return")
  LoanView returnLoan(Authentication a, @PathVariable long id) {
    return circulation.returnLoan(a, id);
  }

  @PostMapping("/loans/{id}/renew")
  LoanView renew(Authentication a, @PathVariable long id) {
    return circulation.renew(a, id);
  }

  @GetMapping("/reservations")
  List<ReservationView> reservations(Authentication a) {
    return circulation.reservations(a);
  }

  @PostMapping("/reservations")
  ReservationView reserve(Authentication a, @Valid @RequestBody Requests.Reserve i) {
    return circulation.reserve(a, i.titleId());
  }

  @PostMapping("/reservations/{id}/cancel")
  void cancel(Authentication a, @PathVariable long id) {
    circulation.cancel(a, id);
  }

  @GetMapping("/dashboard")
  Dashboard dashboard(Authentication a) {
    return circulation.dashboard(a);
  }
}
