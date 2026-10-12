package com.portfolio.library;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Persistence models stay inside the backend; HTTP responses use Views records. */
public final class Domain {
    private Domain() {}
    public enum Role { ADMIN, LIBRARIAN, MEMBER }
    public enum AccountStatus { ACTIVE, BLACKLISTED, CLOSED }
    public enum CopyStatus { AVAILABLE, LOANED, HELD, LOST, REFERENCE_ONLY }
    public enum ReservationStatus { WAITING, READY, FULFILLED, CANCELLED, EXPIRED }
    @MappedSuperclass public static abstract class Record {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    }
    @Entity(name="Account") @Table(name="accounts") public static class Account extends Record {
        public String name, email;
        @Column(name="password_hash") public String passwordHash;
        @Enumerated(EnumType.STRING) public Role role;
        @Enumerated(EnumType.STRING) public AccountStatus status = AccountStatus.ACTIVE;
        public boolean protectedAccount, archived;
    }
    @Entity(name="Author") @Table(name="authors") public static class Author extends Record {
        public String name;
        public boolean archived;
    }
    @Entity(name="Title") @Table(name="titles") public static class Title extends Record {
        public String isbn, title, genre, publisher;
        @Column(length=2000) public String description;
        public boolean archived;
        @ManyToMany @JoinTable(name="title_authors", joinColumns=@JoinColumn(name="title_id"), inverseJoinColumns=@JoinColumn(name="author_id"))
        public Set<Author> authors = new LinkedHashSet<>();
    }
    @Entity(name="Copy") @Table(name="copies") public static class Copy extends Record {
        public String barcode;
        @ManyToOne(optional=false) @JoinColumn(name="title_id") public Title title;
        @Enumerated(EnumType.STRING) public CopyStatus status = CopyStatus.AVAILABLE;
        public boolean archived;
    }
    @Entity(name="Loan") @Table(name="loans") public static class Loan extends Record {
        @ManyToOne(optional=false) @JoinColumn(name="borrower_id") public Account borrower;
        @ManyToOne(optional=false) @JoinColumn(name="copy_id") public Copy copy;
        public LocalDate issueDate, dueDate, returnDate;
        public int renewals;
        @Column(precision=10,scale=2) public BigDecimal finalFine;
    }
    @Entity(name="Reservation") @Table(name="reservations") public static class Reservation extends Record {
        @ManyToOne(optional=false) @JoinColumn(name="borrower_id") public Account borrower;
        @ManyToOne(optional=false) @JoinColumn(name="title_id") public Title title;
        @ManyToOne @JoinColumn(name="copy_id") public Copy copy;
        @Enumerated(EnumType.STRING) public ReservationStatus status = ReservationStatus.WAITING;
        public Instant createdAt, expiresAt;
    }
    @Entity(name="Activity") @Table(name="activities") public static class Activity extends Record {
        public String actor, message;
        public Instant createdAt;
    }
    @Entity(name="LibraryState") @Table(name="library_state") public static class LibraryState {
        @Id public Long id;
        public long generation;
        public Instant lastReset;
    }
}
