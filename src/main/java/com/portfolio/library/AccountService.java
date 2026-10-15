package com.portfolio.library;

import static com.portfolio.library.Domain.Role.*;
import static com.portfolio.library.LibraryException.conflict;

import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountService {
  final LibraryStore s;
  final PasswordEncoder passwords;
  final CirculationService circulation;
  final boolean demo;

  AccountService(
      LibraryStore s,
      PasswordEncoder passwords,
      CirculationService circulation,
      @Value("${library.demo}") boolean demo) {
    this.s = s;
    this.passwords = passwords;
    this.circulation = circulation;
    this.demo = demo;
  }

  public Principal login(Requests.Login input) {
    validatePassword(input.password());
    LibraryState state = s.lock();
    Account a =
        s.all(Account.class).stream()
            .filter(x -> x.email.equalsIgnoreCase(input.email().trim()))
            .findFirst()
            .orElse(null);
    if (a == null
        || !passwords.matches(input.password(), a.passwordHash)
        || a.archived
        || a.status == AccountStatus.CLOSED)
      throw new LibraryException(401, "Email or password is incorrect, or the account is closed.");
    return new Principal(a.id, state.generation);
  }

  public Principal demoLogin(Role role) {
    LibraryState state = s.lock();
    if (!demo) throw new LibraryException(404, "Demo entry is disabled.");
    Account a =
        s.all(Account.class).stream()
            .filter(x -> x.protectedAccount && x.role == role && !x.archived)
            .findFirst()
            .orElseThrow(
                () -> new LibraryException(503, "The demo is preparing. Please try again."));
    return new Principal(a.id, state.generation);
  }

  public User me(Authentication auth) {
    return s.user(s.actor(auth));
  }

  public List<User> users(Authentication auth) {
    s.actor(auth, ADMIN, LIBRARIAN);
    return s.all(Account.class).stream().filter(a -> !a.archived).map(s::user).toList();
  }

  public User save(Authentication auth, Long id, Requests.UserInput input) {
    Account actor = s.actor(auth, ADMIN);
    Account a;
    if (id == null) {
      s.capacity(Account.class);
      a = new Account();
      if (input.password() == null)
        throw new LibraryException(400, "A password of at least eight characters is required.");
    } else {
      a = s.get(Account.class, id);
      if (a.protectedAccount) throw conflict("Seeded demo accounts cannot be changed.");
      if (a.archived) throw conflict("This account is archived.");
    }
    String email = input.email().trim().toLowerCase(Locale.ROOT);
    if (s.all(Account.class).stream()
        .anyMatch(x -> x.email.equals(email) && !Objects.equals(x.id, id)))
      throw conflict("That email is already registered.");
    if (id != null
        && a.id.equals(actor.id)
        && (input.status() != AccountStatus.ACTIVE || input.role() != ADMIN))
      throw conflict("You cannot disable or demote your own account.");
    if (id != null && (input.role() != a.role || input.status() == AccountStatus.CLOSED))
      checkUnencumbered(a);
    a.name = input.name().trim();
    a.email = email;
    a.role = input.role();
    a.status = input.status();
    if (input.password() != null) {
      validatePassword(input.password());
      a.passwordHash = passwords.encode(input.password());
    }
    if (id == null) s.save(a);
    circulation.allocate();
    s.activity(actor, "Saved account " + a.name);
    return s.user(a);
  }

  public void archive(Authentication auth, long id) {
    Account actor = s.actor(auth, ADMIN);
    Account a = s.get(Account.class, id);
    if (a.protectedAccount || a.id.equals(actor.id))
      throw conflict("Seeded accounts and your current account cannot be archived.");
    checkUnencumbered(a);
    a.archived = true;
    a.status = AccountStatus.CLOSED;
    circulation.allocate();
    s.activity(actor, "Archived account " + a.name);
  }

  private void checkUnencumbered(Account a) {
    if (s.activeLoans(a.id) > 0
        || s.activeReservations().stream()
            .anyMatch(r -> r.borrower.id.equals(a.id) && r.status == ReservationStatus.READY))
      throw conflict("Resolve this member's active loans and pickup holds first.");
  }

  private void validatePassword(String password) {
    if (password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new LibraryException(
          400, "Password must fit within 72 UTF-8 bytes; use fewer characters.");
  }
}
