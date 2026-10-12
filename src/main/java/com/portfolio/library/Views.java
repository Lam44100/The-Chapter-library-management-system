package com.portfolio.library;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import com.portfolio.library.Domain.*;
public final class Views {
    private Views() {}
    public record Principal(long id,long generation) implements java.io.Serializable {}
    public record User(long id,String name,String email,Role role,AccountStatus status,boolean protectedAccount) {}
    public record AuthorView(long id,String name) {}
    public record CopyView(long id,String barcode,CopyStatus status) {}
    public record Book(long id,String isbn,String title,String genre,String publisher,String description,List<AuthorView> authors,List<CopyView> copies,long available) {}
    public record Page<T>(List<T> items,long total,int page,int size) {}
    public record LoanView(long id,long borrowerId,String borrower,long titleId,String title,long copyId,String barcode,LocalDate issueDate,LocalDate dueDate,LocalDate returnDate,int renewals,BigDecimal fine,boolean overdue) {}
    public record ReservationView(long id,long borrowerId,String borrower,long titleId,String title,ReservationStatus status,Instant createdAt,Instant expiresAt,String barcode,long queuePosition) {}
    public record ActivityView(long id,String actor,String message,Instant createdAt) {}
    public record Dashboard(long titles,long available,long activeLoans,long members,List<LoanView> overdue,List<ReservationView> pickups,List<ActivityView> activity) {}
    public record Demo(boolean enabled,Instant lastReset,Instant nextReset,long generation) {}
}
