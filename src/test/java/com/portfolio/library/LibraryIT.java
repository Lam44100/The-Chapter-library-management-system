package com.portfolio.library;

import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.mock.web.MockHttpSession;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.containers.PostgreSQLContainer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class LibraryIT {
    @Container static PostgreSQLContainer<?> pg=new PostgreSQLContainer<>("postgres:17.6-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",pg::getJdbcUrl);r.add("spring.datasource.username",pg::getUsername);r.add("spring.datasource.password",pg::getPassword);}
    static class MutableClock extends Clock {
        Instant now=Instant.parse("2026-10-12T05:00:00Z");
        @Override public ZoneId getZone(){return ZoneOffset.UTC;}
        @Override public Clock withZone(ZoneId zone){return Clock.fixed(now,zone);}
        @Override public Instant instant(){return now;}
    }
    @TestConfiguration static class Config {@Bean @Primary MutableClock testClock(){return new MutableClock();}}
    @Autowired MutableClock clock;
    @Autowired DemoService demo;
    @Autowired AccountService accounts;
    @Autowired CatalogService catalog;
    @Autowired CirculationService circulation;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    Authentication admin,staff,member;
    @BeforeEach void prepare(){clock.now=Instant.parse("2026-10-12T05:00:00Z");demo.reset();admin=auth(Role.ADMIN);staff=auth(Role.LIBRARIAN);member=auth(Role.MEMBER);}
    Authentication auth(Role role){return new UsernamePasswordAuthenticationToken(accounts.demoLogin(role),null,List.of());}
    User memberUser(){return accounts.me(member);}
    List<Book> books(){return catalog.catalog("","",false,0,50).items();}
    long freeCopy(){return books().stream().flatMap(b->b.copies().stream()).filter(c->c.status()==CopyStatus.AVAILABLE).findFirst().orElseThrow().id();}
    void conflict(Runnable operation,String text){assertThatThrownBy(operation::run).isInstanceOf(LibraryException.class).hasMessageContaining(text);}
    @Test void catalogReturnsAllMatchesAndFiltersAvailable(){assertThat(catalog.catalog("austen","",false,0,12).total()).isEqualTo(1);assertThat(catalog.catalog("","Classics",false,0,12).total()).isEqualTo(3);assertThat(catalog.catalog("","",true,0,50).items()).allMatch(b->b.available()>0);}
    @Test void issueReturnPreservesHistoryAndRejectsRepeat(){long copy=freeCopy();LoanView loan=circulation.issue(staff,new Requests.Issue(memberUser().id(),copy));assertThat(loan.dueDate()).isEqualTo(loan.issueDate().plusDays(14));conflict(()->circulation.issue(staff,new Requests.Issue(memberUser().id(),copy)),"unavailable");circulation.returnLoan(staff,loan.id());conflict(()->circulation.returnLoan(staff,loan.id()),"already");assertThat(circulation.loans(member,null)).anyMatch(l->l.id()==loan.id()&&l.returnDate()!=null);}
    @Test void fifthLoanAllowedSixthRejected(){for(int i=0;i<4;i++)circulation.issue(staff,new Requests.Issue(memberUser().id(),freeCopy()));conflict(()->circulation.issue(staff,new Requests.Issue(memberUser().id(),freeCopy())),"five");}
    @Test void concurrentIssueOnlySucceedsOnce()throws Exception{long copy=freeCopy(),borrower=memberUser().id();try(var executor=Executors.newFixedThreadPool(2)){Callable<Boolean> attempt=()->{try{circulation.issue(staff,new Requests.Issue(borrower,copy));return true;}catch(LibraryException e){return false;}};var results=executor.invokeAll(List.of(attempt,attempt));assertThat(results.stream().filter(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count()).isEqualTo(1);}}
    @Test void concurrentLastSlotOnlySucceedsOnce()throws Exception{for(int i=0;i<3;i++)circulation.issue(staff,new Requests.Issue(memberUser().id(),freeCopy()));List<Long> copies=books().stream().flatMap(b->b.copies().stream()).filter(c->c.status()==CopyStatus.AVAILABLE).limit(2).map(CopyView::id).toList();long borrower=memberUser().id();try(var ex=Executors.newFixedThreadPool(2)){var results=ex.invokeAll(copies.stream().<Callable<Boolean>>map(id->()->{try{circulation.issue(staff,new Requests.Issue(borrower,id));return true;}catch(LibraryException e){return false;}}).toList());assertThat(results.stream().filter(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count()).isEqualTo(1);}}
    @Test void renewOnceAndNeverOverdue(){LoanView loan=circulation.loans(member,null).stream().filter(l->l.returnDate()==null).findFirst().orElseThrow();assertThat(circulation.renew(member,loan.id()).dueDate()).isEqualTo(loan.dueDate().plusDays(14));conflict(()->circulation.renew(member,loan.id()),"once");LoanView overdue=circulation.dashboard(staff).overdue().getFirst();conflict(()->circulation.renew(staff,overdue.id()),"non-overdue");}
    @Test void readyReservationCannotBeTakenByAnotherMember(){ReservationView hold=circulation.reservations(staff).stream().filter(r->r.status()==ReservationStatus.READY).findFirst().orElseThrow();long copy=catalog.detail(hold.titleId()).copies().stream().filter(c->c.barcode().equals(hold.barcode())).findFirst().orElseThrow().id();conflict(()->circulation.issue(staff,new Requests.Issue(memberUser().id(),copy)),"held");circulation.issue(staff,new Requests.Issue(hold.borrowerId(),copy));assertThat(circulation.reservations(staff)).anyMatch(r->r.id()==hold.id()&&r.status()==ReservationStatus.FULFILLED);}
    @Test void queuedReservationGetsReturnedCopyAndExpires(){ReservationView queued=circulation.reservations(member).stream().filter(r->r.status()==ReservationStatus.WAITING).findFirst().orElseThrow();LoanView loan=circulation.loans(staff,null).stream().filter(l->l.titleId()==queued.titleId()&&l.returnDate()==null).findFirst().orElseThrow();circulation.returnLoan(staff,loan.id());ReservationView ready=circulation.reservations(member).stream().filter(r->r.id()==queued.id()).findFirst().orElseThrow();assertThat(ready.status()).isEqualTo(ReservationStatus.READY);assertThat(ready.expiresAt()).isEqualTo(clock.now.plus(Duration.ofHours(72)));clock.now=ready.expiresAt();assertThat(circulation.reservations(member)).anyMatch(r->r.id()==queued.id()&&r.status()==ReservationStatus.EXPIRED);}
    @Test void reservationBlocksRenewalAndDuplicates(){Book b=books().stream().filter(x->x.title().equals("The Alchemist")).findFirst().orElseThrow();User other=accounts.users(staff).stream().filter(u->u.name().startsWith("Eve")).findFirst().orElseThrow();LoanView loan=circulation.issue(staff,new Requests.Issue(other.id(),b.copies().getFirst().id()));ReservationView r=circulation.reserve(member,b.id());conflict(()->circulation.renew(staff,loan.id()),"reserved");conflict(()->circulation.reserve(member,b.id()),"already");circulation.cancel(member,r.id());assertThat(circulation.renew(staff,loan.id()).renewals()).isEqualTo(1);}
    @Test void cannotReserveOwnLoan(){LoanView l=circulation.loans(member,null).stream().filter(x->x.returnDate()==null).findFirst().orElseThrow();conflict(()->circulation.reserve(member,l.titleId()),"already have this title");}
    @Test void archivedCopyRetainsReturnedHistory(){LoanView l=circulation.issue(staff,new Requests.Issue(memberUser().id(),freeCopy()));conflict(()->catalog.archive(admin,"copies",l.copyId()),"active loan");circulation.returnLoan(staff,l.id());catalog.archive(admin,"copies",l.copyId());assertThat(circulation.loans(member,null)).anyMatch(x->x.id()==l.id());}
    @Test void seededAccountsAndDuplicateIdentifiersProtected(){User u=memberUser();conflict(()->accounts.archive(admin,u.id()),"Seeded");Book b=books().getFirst();conflict(()->catalog.copy(admin,null,new Requests.CopyInput(b.id(),b.copies().getFirst().barcode(),CopyStatus.AVAILABLE)),"barcode");}
    @Test void blacklistedMembersCannotBorrowButCanViewHistory(){User u=accounts.save(admin,null,new Requests.UserInput("Test Member","test@example.test","password123",Role.MEMBER,AccountStatus.BLACKLISTED));Principal p=accounts.login(new Requests.Login(u.email(),"password123"));Authentication a=new UsernamePasswordAuthenticationToken(p,null,List.of());assertThat(circulation.loans(a,null)).isEmpty();conflict(()->circulation.reserve(a,books().getFirst().id()),"active member");conflict(()->circulation.issue(staff,new Requests.Issue(u.id(),freeCopy())),"active member");}
    @Test void closedAccountCannotLogin(){accounts.save(admin,null,new Requests.UserInput("Closed","closed@example.test","password123",Role.MEMBER,AccountStatus.CLOSED));conflict(()->accounts.login(new Requests.Login("closed@example.test","password123")),"incorrect");}
    @Test void resetChangesGenerationAndInvalidatesSessions(){long before=demo.status().generation();demo.reset();assertThat(demo.status().generation()).isEqualTo(before+1);conflict(()->accounts.me(member),"session ended");assertThat(books()).hasSize(10);}
    @Test void missedResetRunsOnceAndNormalMaintenanceKeepsData(){long generation=demo.status().generation();catalog.author(admin,null,new Requests.AuthorInput("Persistent Writer"));demo.maintain();assertThat(catalog.authors()).anyMatch(a->a.name().equals("Persistent Writer"));clock.now=clock.now.plus(Duration.ofDays(3));demo.maintain();demo.maintain();assertThat(demo.status().generation()).isEqualTo(generation+1);assertThat(catalog.authors()).noneMatch(a->a.name().equals("Persistent Writer"));}
    @Test void apiRejectsUnauthenticatedWrongRoleMissingCsrfAndOtherMember()throws Exception{
        mvc.perform(get("/api/v1/loans")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/dashboard").with(authentication(member))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/reservations").with(authentication(member)).contentType("application/json").content("{\"titleId\":1}")).andExpect(status().isForbidden());
        long other=accounts.users(staff).stream().filter(u->u.role()==Role.MEMBER&&u.id()!=memberUser().id()).findFirst().orElseThrow().id();
        mvc.perform(get("/api/v1/loans?borrowerId="+other).with(authentication(member))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/authors").with(authentication(member)).with(csrf()).contentType("application/json").content("{\"name\":\"No\"}")).andExpect(status().isForbidden());
    }
    @Test void realSessionLoginUsesCsrfAndSurvivesRequests()throws Exception{
        var first=mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        MockHttpSession session=(MockHttpSession)first.getRequest().getSession();var token=json.readTree(first.getResponse().getContentAsString());
        mvc.perform(post("/api/v1/auth/demo").session(session).header(token.get("headerName").asText(),token.get("token").asText()).contentType("application/json").content("{\"role\":\"MEMBER\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MEMBER"));
        demo.reset();mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isUnauthorized());
    }
    @Test void apiValidatesFields()throws Exception{mvc.perform(post("/api/v1/admin/authors").with(authentication(admin)).with(csrf()).contentType("application/json").content("{\"name\":\"\"}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.name").exists());}
    @Test void databaseRejectsDuplicateActiveLoan(){LoanView l=circulation.loans(member,null).stream().filter(x->x.returnDate()==null).findFirst().orElseThrow();assertThatThrownBy(()->jdbc.update("insert into loans(borrower_id,copy_id,issue_date,due_date,renewals) values (?,?,current_date,current_date+14,0)",l.borrowerId(),l.copyId())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}
}
