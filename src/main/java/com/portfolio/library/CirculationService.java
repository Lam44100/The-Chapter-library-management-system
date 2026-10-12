package com.portfolio.library;
import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import java.time.*;
import java.util.*;
import static com.portfolio.library.Domain.Role.*;
import static com.portfolio.library.Domain.ReservationStatus.*;
import static com.portfolio.library.LibraryException.conflict;

@Service @Transactional
public class CirculationService {
    final LibraryStore s;
    CirculationService(LibraryStore s) { this.s=s; }
    public List<LoanView> loans(Authentication auth,Long borrowerId) {
        Account a=s.actor(auth);
        long filter=a.role==MEMBER?a.id:borrowerId==null?0:borrowerId;
        if(a.role==MEMBER&&borrowerId!=null&&!borrowerId.equals(a.id)) throw new LibraryException(403,"You can only view your own loans.");
        return s.all(Loan.class).stream().filter(l->filter==0||l.borrower.id==filter).sorted(Comparator.comparing((Loan l)->l.id).reversed()).map(s::loan).toList();
    }
    public LoanView issue(Authentication auth,Requests.Issue input) {
        Account actor=s.actor(auth,ADMIN,LIBRARIAN); allocate();
        Account member=s.eligible(input.borrowerId()); Copy copy=s.get(Copy.class,input.copyId());
        if(copy.archived||copy.title.archived) throw conflict("This copy is archived.");
        if(s.activeLoans(member.id)>=LoanPolicy.MAX_LOANS) throw conflict("This member already has five active loans.");
        Reservation hold=s.activeReservations().stream().filter(r->r.status==READY&&r.copy.id.equals(copy.id)).findFirst().orElse(null);
        if(copy.status!=CopyStatus.AVAILABLE && !(copy.status==CopyStatus.HELD&&hold!=null&&hold.borrower.id.equals(member.id))) throw conflict("This copy is unavailable or held for another member.");
        s.capacity(Loan.class);
        Loan loan=new Loan(); loan.borrower=member; loan.copy=copy; loan.issueDate=LoanPolicy.today(s.clock); loan.dueDate=loan.issueDate.plusDays(14);
        s.save(loan); copy.status=CopyStatus.LOANED;
        for(Reservation r:s.activeReservations()) if(r.borrower.id.equals(member.id)&&r.title.id.equals(copy.title.id)) {
            if(r.copy!=null&&!r.copy.id.equals(copy.id)) r.copy.status=CopyStatus.AVAILABLE;
            r.status=FULFILLED;
        }
        s.activity(actor,"Issued "+copy.barcode+" to "+member.name); allocate(); return s.loan(loan);
    }
    public LoanView returnLoan(Authentication auth,long id) {
        Account actor=s.actor(auth,ADMIN,LIBRARIAN); Loan loan=s.get(Loan.class,id);
        if(loan.returnDate!=null) throw conflict("This loan has already been returned.");
        loan.returnDate=LoanPolicy.today(s.clock); loan.finalFine=LoanPolicy.fine(loan.dueDate,loan.returnDate,loan.returnDate); loan.copy.status=CopyStatus.AVAILABLE;
        s.activity(actor,"Returned "+loan.copy.barcode); allocate(); return s.loan(loan);
    }
    public LoanView renew(Authentication auth,long id) {
        Account actor=s.actor(auth); Loan loan=s.get(Loan.class,id);
        if(actor.role==MEMBER&&!loan.borrower.id.equals(actor.id)) throw new LibraryException(403,"You can only renew your own loans.");
        s.eligible(loan.borrower.id); allocate();
        if(loan.returnDate!=null||loan.renewals>=1||LoanPolicy.today(s.clock).isAfter(loan.dueDate)) throw conflict("Only an active, non-overdue loan can be renewed once.");
        if(s.activeReservations().stream().anyMatch(r->r.title.id.equals(loan.copy.title.id)&&!r.borrower.id.equals(loan.borrower.id))) throw conflict("Another member has reserved this title.");
        loan.dueDate=loan.dueDate.plusDays(14); loan.renewals++; s.activity(actor,"Renewed "+loan.copy.barcode); return s.loan(loan);
    }
    public List<ReservationView> reservations(Authentication auth) {
        Account actor=s.actor(auth); allocate();
        return s.all(Reservation.class).stream().filter(r->actor.role!=MEMBER||r.borrower.id.equals(actor.id)).sorted(Comparator.comparing((Reservation r)->r.id).reversed()).map(s::reservation).toList();
    }
    public ReservationView reserve(Authentication auth,long titleId) {
        Account member=s.actor(auth,MEMBER); s.eligible(member.id); Title title=s.get(Title.class,titleId);
        if(title.archived) throw conflict("This title is archived.");
        if(s.all(Loan.class).stream().anyMatch(l->l.borrower.id.equals(member.id)&&l.copy.title.id.equals(titleId)&&l.returnDate==null)) throw conflict("You already have this title on loan.");
        if(s.activeReservations().stream().anyMatch(r->r.borrower.id.equals(member.id)&&r.title.id.equals(titleId))) throw conflict("You already have an active reservation for this title.");
        if(s.activeReservations().stream().filter(r->r.borrower.id.equals(member.id)).count()>=5) throw conflict("The demo allows five active reservations per member.");
        s.capacity(Reservation.class); Reservation r=new Reservation(); r.borrower=member; r.title=title; r.createdAt=s.clock.instant(); s.save(r);
        s.activity(member,"Reserved "+title.title); allocate(); return s.reservation(r);
    }
    public void cancel(Authentication auth,long id) {
        Account actor=s.actor(auth); Reservation r=s.get(Reservation.class,id);
        if(actor.role==MEMBER&&!r.borrower.id.equals(actor.id)) throw new LibraryException(403,"You can only cancel your own reservations.");
        if(r.status!=WAITING&&r.status!=READY) throw conflict("This reservation is no longer active.");
        if(r.copy!=null) r.copy.status=CopyStatus.AVAILABLE;
        r.status=CANCELLED; s.activity(actor,"Cancelled reservation for "+r.title.title); allocate();
    }
    /** Caller holds the library-state lock. Allocation is also performed on reads after a sleeping host wakes. */
    void allocate() {
        Instant now=s.clock.instant();
        for(Reservation r:s.activeReservations()) {
            boolean invalid=r.borrower.archived||r.borrower.role!=MEMBER||r.borrower.status!=AccountStatus.ACTIVE||r.title.archived;
            if(invalid || (r.status==READY&&!now.isBefore(r.expiresAt))) {
                if(r.copy!=null) r.copy.status=CopyStatus.AVAILABLE;
                r.status=invalid?CANCELLED:EXPIRED;
            }
        }
        s.em.flush();
        for(Reservation r:s.activeReservations()) {
            if(r.status!=WAITING||s.activeLoans(r.borrower.id)>=LoanPolicy.MAX_LOANS) continue;
            Copy available=s.em.createQuery("from Copy c where c.title.id=:id and c.archived=false and c.status='AVAILABLE' order by c.id",Copy.class).setParameter("id",r.title.id).setMaxResults(1).getResultStream().findFirst().orElse(null);
            if(available!=null) { available.status=CopyStatus.HELD; r.copy=available; r.status=READY; r.expiresAt=now.plus(Duration.ofHours(72)); }
        }
    }
    public Dashboard dashboard(Authentication auth) {
        s.actor(auth,ADMIN,LIBRARIAN); allocate();
        return new Dashboard(s.all(Title.class).stream().filter(t->!t.archived).count(),s.all(Copy.class).stream().filter(c->!c.archived&&c.status==CopyStatus.AVAILABLE).count(),s.all(Loan.class).stream().filter(l->l.returnDate==null).count(),s.all(Account.class).stream().filter(a->!a.archived&&a.role==MEMBER).count(),s.all(Loan.class).stream().map(s::loan).filter(LoanView::overdue).toList(),s.activeReservations().stream().filter(r->r.status==READY).map(s::reservation).toList(),s.em.createQuery("from Activity order by id desc",Activity.class).setMaxResults(20).getResultList().stream().map(a->new ActivityView(a.id,a.actor,a.message,a.createdAt)).toList());
    }
}
