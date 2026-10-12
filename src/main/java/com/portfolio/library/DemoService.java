package com.portfolio.library;
import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.Demo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import java.time.*;
import java.util.*;

@Service @Transactional
public class DemoService {
    final LibraryStore s; final CirculationService circulation; final PasswordEncoder passwords;
    final boolean enabled; final String password;
    DemoService(LibraryStore s,CirculationService circulation,PasswordEncoder passwords,@Value("${library.demo}") boolean enabled,@Value("${library.demo-password}")String password) {this.s=s;this.circulation=circulation;this.passwords=passwords;this.enabled=enabled;this.password=password;}
    public void maintain() {
        LibraryState state=s.lock();
        if(enabled&&(state.generation==0||state.lastReset.isBefore(LoanPolicy.latestReset(s.clock))))resetLocked(state);
        circulation.allocate();
    }
    public void reset() { if(!enabled)throw new IllegalStateException("Reset is only available in demo mode."); resetLocked(s.lock()); }
    public Demo status() { LibraryState state=s.lock(); return new Demo(enabled,state.lastReset,enabled?LoanPolicy.latestReset(s.clock).plus(Duration.ofDays(1)):null,state.generation); }
    private void resetLocked(LibraryState state) {
        for(String table:List.of("activities","reservations","loans","copies","title_authors","titles","authors","accounts"))s.em.createNativeQuery("delete from "+table).executeUpdate();
        s.em.clear(); state=s.lock(); state.generation++; state.lastReset=s.clock.instant();
        String hash=passwords.encode(password);
        String[] names={"Alex Morgan","Alice Chen","Bob Tan","Charlie Lim","Dave Wong","Eve Lee"};
        List<Account> accounts=new ArrayList<>();
        for(int i=0;i<names.length;i++) { Account a=new Account();a.name=names[i];a.email=new String[]{"admin","alice","bob","charlie","dave","eve"}[i]+"@chapter.demo";a.passwordHash=hash;a.role=i==0?Role.ADMIN:i<3?Role.LIBRARIAN:Role.MEMBER;a.protectedAccount=true;s.save(a);accounts.add(a); }
        String[][] books={
            {"9780141439518","Pride and Prejudice","Jane Austen","Classics","Penguin Classics","A sharp, warm portrait of first impressions, family, and finding one's own way."},
            {"9780547928227","The Hobbit","J. R. R. Tolkien","Fantasy","Mariner Books","An unexpected journey from a quiet doorstep into a world of courage and discovery."},
            {"9780451524935","1984","George Orwell","Classics","Signet","A haunting exploration of language, memory, and the power of independent thought."},
            {"9780061120084","To Kill a Mockingbird","Harper Lee","Fiction","Harper Perennial","Childhood and conscience meet in this enduring story of justice and empathy."},
            {"9780307277671","The Book Thief","Markus Zusak","Fiction","Knopf","A story about the shelter words can offer in the most difficult of times."},
            {"9780062315007","The Alchemist","Paulo Coelho","Fiction","HarperOne","A young shepherd follows a dream and discovers the meaning of his journey."},
            {"9780140449136","The Odyssey","Homer","Classics","Penguin Classics","A voyage of monsters, homecoming, and the endurance of the human spirit."},
            {"9780590353427","Harry Potter and the Sorcerer's Stone","J. K. Rowling","Fantasy","Scholastic","Friendship and wonder unfold at a school unlike any other."},
            {"9780062073488","And Then There Were None","Agatha Christie","Mystery","William Morrow","Ten strangers arrive on an island where every secret has a consequence."},
            {"9780374533557","Thinking, Fast and Slow","Daniel Kahneman","Nonfiction","Farrar, Straus and Giroux","An invitation to understand the habits and shortcuts that shape our decisions."}
        };
        List<Copy> copies=new ArrayList<>(); List<Title> titles=new ArrayList<>();
        for(int i=0;i<books.length;i++) { String[] b=books[i];Author author=new Author();author.name=b[2];s.save(author);Title t=new Title();t.isbn=b[0];t.title=b[1];t.genre=b[3];t.publisher=b[4];t.description=b[5];t.authors.add(author);s.save(t);titles.add(t);
            for(int j=0;j<(i<5?3:2);j++){Copy c=new Copy();c.title=t;c.barcode=String.format("CH-%03d-%d",i+1,j+1);s.save(c);copies.add(c);}
        }
        LocalDate today=LoanPolicy.today(s.clock);
        seedLoan(accounts.get(3),copies.get(0),today.minusDays(5),false);
        seedLoan(accounts.get(4),copies.get(3),today.minusDays(18),false);
        seedLoan(accounts.get(3),copies.get(6),today.minusDays(22),true);
        for(Copy c:copies)if(c.title.id.equals(titles.get(8).id))seedLoan(accounts.get(4),c,today.minusDays(3),false);
        Reservation queued=new Reservation();queued.borrower=accounts.get(3);queued.title=titles.get(8);queued.createdAt=s.clock.instant().minusSeconds(3600);s.save(queued);
        Reservation ready=new Reservation();ready.borrower=accounts.get(5);ready.title=titles.get(4);ready.createdAt=s.clock.instant().minusSeconds(1200);s.save(ready);
        circulation.allocate(); s.activity(null,"Demo library refreshed. A new chapter begins.");
    }
    private void seedLoan(Account member,Copy copy,LocalDate issue,boolean returned) {
        Loan l=new Loan();l.borrower=member;l.copy=copy;l.issueDate=issue;l.dueDate=issue.plusDays(14);
        if(returned){l.returnDate=issue.plusDays(16);l.finalFine=LoanPolicy.fine(l.dueDate,l.returnDate,l.returnDate);}else copy.status=CopyStatus.LOANED;
        s.save(l);
    }
}
