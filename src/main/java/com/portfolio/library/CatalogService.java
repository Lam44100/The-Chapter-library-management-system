package com.portfolio.library;
import com.portfolio.library.Domain.*;
import com.portfolio.library.Views.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import java.util.*;
import static com.portfolio.library.Domain.Role.*;
import static com.portfolio.library.LibraryException.conflict;

@Service @Transactional
public class CatalogService {
    final LibraryStore s; final CirculationService circulation;
    CatalogService(LibraryStore s,CirculationService circulation) { this.s=s; this.circulation=circulation; }
    public Page<Book> catalog(String query,String genre,boolean available,int page,int size) {
        s.lock(); circulation.allocate();
        if(page<0||size<1||size>50||query.length()>200) throw new LibraryException(400,"Use a valid page and a page size from 1 to 50.");
        String q=query.trim().toLowerCase(Locale.ROOT);
        List<Book> matches=s.all(Title.class).stream().filter(t->!t.archived)
            .filter(t->genre.isBlank()||t.genre.equalsIgnoreCase(genre))
            .filter(t->q.isBlank()||t.title.toLowerCase(Locale.ROOT).contains(q)||t.isbn.toLowerCase(Locale.ROOT).contains(q)||t.authors.stream().anyMatch(a->a.name.toLowerCase(Locale.ROOT).contains(q)))
            .sorted(Comparator.comparing(t->t.title)).map(s::book).filter(b->!available||b.available()>0).toList();
        return new Page<>(matches.stream().skip((long)page*size).limit(size).toList(),matches.size(),page,size);
    }
    public Book detail(long id) { s.lock(); circulation.allocate(); Title t=s.get(Title.class,id); if(t.archived) throw new LibraryException(404,"This title is archived."); return s.book(t); }
    public List<AuthorView> authors() { s.lock(); return s.all(Author.class).stream().filter(a->!a.archived).map(a->new AuthorView(a.id,a.name)).toList(); }
    public AuthorView author(Authentication auth,Long id,Requests.AuthorInput input) {
        Account actor=s.actor(auth,ADMIN); Author a;
        if(id==null) { s.capacity(Author.class); a=new Author(); } else a=s.get(Author.class,id);
        if(a.archived) throw conflict("This author is archived."); a.name=input.name().trim(); if(id==null)s.save(a);
        s.activity(actor,"Saved author "+a.name); return new AuthorView(a.id,a.name);
    }
    public Book title(Authentication auth,Long id,Requests.TitleInput input) {
        Account actor=s.actor(auth,ADMIN); Title t;
        if(id==null) { s.capacity(Title.class); t=new Title(); } else t=s.get(Title.class,id);
        if(t.archived) throw conflict("This title is archived.");
        String isbn=input.isbn().trim().toUpperCase(Locale.ROOT);
        if(s.all(Title.class).stream().anyMatch(x->x.isbn.equalsIgnoreCase(isbn)&&!Objects.equals(x.id,id))) throw conflict("That ISBN is already registered.");
        t.isbn=isbn; t.title=input.title().trim(); t.genre=input.genre().trim(); t.publisher=input.publisher().trim(); t.description=input.description().trim();
        t.authors.clear(); for(long authorId:input.authorIds()) { Author a=s.get(Author.class,authorId); if(a.archived)throw conflict("Choose an active author."); t.authors.add(a); }
        if(id==null)s.save(t); s.activity(actor,"Saved title "+t.title); return s.book(t);
    }
    public CopyView copy(Authentication auth,Long id,Requests.CopyInput input) {
        Account actor=s.actor(auth,ADMIN); Copy c;
        if(id==null) { s.capacity(Copy.class); c=new Copy(); } else c=s.get(Copy.class,id);
        if(c.archived)throw conflict("This copy is archived.");
        if(c.status==CopyStatus.LOANED||c.status==CopyStatus.HELD) throw conflict("Return or release this copy before editing it.");
        if(input.status()==CopyStatus.LOANED||input.status()==CopyStatus.HELD) throw conflict("Use circulation actions to loan or hold a copy.");
        String barcode=input.barcode().trim().toUpperCase(Locale.ROOT);
        if(s.all(Copy.class).stream().anyMatch(x->x.barcode.equalsIgnoreCase(barcode)&&!Objects.equals(x.id,id))) throw conflict("That barcode is already registered.");
        Title title=s.get(Title.class,input.titleId()); if(title.archived)throw conflict("Choose an active title.");
        if(id!=null&&!c.title.id.equals(title.id))throw conflict("A copy cannot be moved to a different title.");
        c.title=title; c.barcode=barcode; c.status=input.status(); if(id==null)s.save(c); circulation.allocate(); s.activity(actor,"Saved copy "+c.barcode); return new CopyView(c.id,c.barcode,c.status);
    }
    public void archive(Authentication auth,String type,long id) {
        Account actor=s.actor(auth,ADMIN); circulation.allocate();
        switch(type) {
            case "authors" -> { Author a=s.get(Author.class,id); if(s.all(Title.class).stream().anyMatch(t->!t.archived&&t.authors.contains(a))) throw conflict("Archive or edit this author's active titles first."); a.archived=true; }
            case "titles" -> { Title t=s.get(Title.class,id); List<Copy> copies=s.all(Copy.class).stream().filter(c->c.title.id.equals(id)).toList(); for(Copy c:copies)checkArchiveCopy(c); t.archived=true; copies.forEach(c->c.archived=true); }
            case "copies" -> { Copy c=s.get(Copy.class,id); checkArchiveCopy(c); c.archived=true; }
            default -> throw new LibraryException(404,"Unknown record type.");
        }
        circulation.allocate(); s.activity(actor,"Archived "+type+" #"+id);
    }
    private void checkArchiveCopy(Copy c) { if(c.status==CopyStatus.LOANED||c.status==CopyStatus.HELD) throw conflict("A copy with an active loan or pickup hold cannot be archived."); }
}
