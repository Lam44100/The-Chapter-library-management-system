package com.portfolio.library;

import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.*;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class LibraryStore {
  @PersistenceContext EntityManager em;
  final StateRepository states;
  final Clock clock;

  LibraryStore(StateRepository states, Clock clock) {
    this.states = states;
    this.clock = clock;
  }

  public LibraryState lock() {
    return states.lock();
  }

  public <T> T get(Class<T> type, long id) {
    T entity = em.find(type, id);
    if (entity == null)
      throw new LibraryException(404, "That record no longer exists. Refresh and try again.");
    return entity;
  }

  public <T> List<T> all(Class<T> type) {
    return em.createQuery("from " + type.getSimpleName() + " order by id", type).getResultList();
  }

  public <T> T save(T value) {
    em.persist(value);
    return value;
  }

  public Account actor(Authentication auth, Role... allowed) {
    LibraryState state = lock();
    if (auth == null
        || !(auth.getPrincipal() instanceof Principal p)
        || p.generation() != state.generation)
      throw new LibraryException(401, "Your demo session ended. Please choose a role again.");
    Account account = em.find(Account.class, p.id());
    if (account == null || account.archived || account.status == AccountStatus.CLOSED)
      throw new LibraryException(401, "This account is closed.");
    if (allowed.length > 0 && Arrays.stream(allowed).noneMatch(r -> r == account.role))
      throw new LibraryException(403, "Your role cannot perform this action.");
    return account;
  }

  public Account eligible(long id) {
    Account a = get(Account.class, id);
    if (a.archived || a.role != Role.MEMBER || a.status != AccountStatus.ACTIVE)
      throw LibraryException.conflict("Borrowing requires an active member account.");
    return a;
  }

  public long activeLoans(long borrowerId) {
    return em.createQuery(
            "select count(l) from Loan l where l.borrower.id=:id and l.returnDate is null",
            Long.class)
        .setParameter("id", borrowerId)
        .getSingleResult();
  }

  public List<Reservation> activeReservations() {
    return em.createQuery(
            "from Reservation r where r.status in ('WAITING','READY') order by r.createdAt,r.id",
            Reservation.class)
        .getResultList();
  }

  public void capacity(Class<?> type) {
    if (em.createQuery("select count(x) from " + type.getSimpleName() + " x", Long.class)
            .getSingleResult()
        >= 1000)
      throw LibraryException.conflict(
          "The demo record limit has been reached. Try again after the daily reset.");
  }

  public void activity(Account actor, String message) {
    Activity a = new Activity();
    a.actor = actor == null ? "System" : actor.name;
    a.message = message;
    a.createdAt = clock.instant();
    save(a);
    em.createNativeQuery(
            "delete from activities where id not in (select id from activities order by id desc"
                + " limit 500)")
        .executeUpdate();
  }

  public User user(Account a) {
    return new User(a.id, a.name, a.email, a.role, a.status, a.protectedAccount);
  }

  public Book book(Title t) {
    List<CopyView> copies =
        em
            .createQuery(
                "from Copy c where c.title.id=:id and c.archived=false order by c.barcode",
                Copy.class)
            .setParameter("id", t.id)
            .getResultList()
            .stream()
            .map(c -> new CopyView(c.id, c.barcode, c.status))
            .toList();
    return new Book(
        t.id,
        t.isbn,
        t.title,
        t.genre,
        t.publisher,
        t.description,
        t.authors.stream().map(a -> new AuthorView(a.id, a.name)).toList(),
        copies,
        copies.stream().filter(c -> c.status() == CopyStatus.AVAILABLE).count());
  }

  public LoanView loan(Loan l) {
    LocalDate today = LoanPolicy.today(clock);
    return new LoanView(
        l.id,
        l.borrower.id,
        l.borrower.name,
        l.copy.title.id,
        l.copy.title.title,
        l.copy.id,
        l.copy.barcode,
        l.issueDate,
        l.dueDate,
        l.returnDate,
        l.renewals,
        l.finalFine == null ? LoanPolicy.fine(l.dueDate, l.returnDate, today) : l.finalFine,
        l.returnDate == null && today.isAfter(l.dueDate));
  }

  public ReservationView reservation(Reservation r) {
    long position = 0;
    if (r.status == ReservationStatus.WAITING) {
      for (Reservation x : activeReservations())
        if (x.title.id.equals(r.title.id) && x.status == ReservationStatus.WAITING) {
          position++;
          if (x.id.equals(r.id)) break;
        }
    }
    return new ReservationView(
        r.id,
        r.borrower.id,
        r.borrower.name,
        r.title.id,
        r.title.title,
        r.status,
        r.createdAt,
        r.expiresAt,
        r.copy == null ? null : r.copy.barcode,
        position);
  }
}
