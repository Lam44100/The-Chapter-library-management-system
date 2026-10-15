import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import { useData, useLibrary, useAction } from "../context";
import { api } from "../api";
import {
  BookCard,
  Cover,
  Badge,
  DataState,
  Empty,
  ErrorBox,
} from "../components";
import type { Book, Page } from "../types";
import s from "../App.module.css";
export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const genre = params.get("genre") || "",
    page = Number(params.get("page") || 0),
    available = params.get("available") === "true";
  const path =
    "/catalog?" +
    new URLSearchParams({
      q: params.get("q") || "",
      genre,
      page: String(page),
      size: "12",
      available: String(available),
    });
  const { data, error, loading } = useData<Page<Book>>(path);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  return (
    <>
      <section className={s.hero}>
        <div>
          <div className={s.eyebrow}>
            <span /> OPEN A BOOK. OPEN YOUR WORLD.
          </div>
          <h1>
            Your next chapter
            <br />
            starts <em>here.</em>
          </h1>
          <p>
            A familiar favorite or an unexpected discovery.
            <br className={s.desktopBreak} /> Find a story that stays with you.
          </p>
          <div className={s.heroMeta}>
            <BookOpen size={17} />
            <span>Thoughtfully curated. Freely shared.</span>
          </div>
        </div>
        <div className={s.heroArt} aria-hidden="true">
          <span className={s.artStar}>✳</span>
          <div className={s.artBook}>
            <span>THE ART OF</span>
            <strong>
              getting
              <br />
              lost.
            </strong>
            <span>AND FINDING SOMETHING NEW</span>
          </div>
          <div className={s.artBookBack} />
          <span className={s.artCaption}>A WORLD BETWEEN THE PAGES</span>
        </div>
      </section>
      <section aria-labelledby="collection-heading">
        <div className={s.sectionHeading}>
          <div>
            <span className={s.eyebrow}>THE BOOKSHELF</span>
            <h2 id="collection-heading">
              Find your next read
              <span className={s.smallCount}>{data?.total ?? "—"}</span>
            </h2>
          </div>
          <span className={s.sectionHint}>Great stories. Good company.</span>
        </div>
        <div className={s.filters}>
          <form
            className={s.search}
            onSubmit={(e) => {
              e.preventDefault();
              filter("q", query);
            }}
          >
            <Search size={19} />
            <input
              aria-label="Search books"
              placeholder="Search by title, author, or ISBN…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <label className={s.availableFilter}>
            <SlidersHorizontal size={16} />
            <input
              type="checkbox"
              checked={available}
              onChange={(e) =>
                filter("available", e.target.checked ? "true" : "")
              }
            />{" "}
            Available now
          </label>
        </div>
        <div className={s.genreTabs} aria-label="Filter by genre">
          {["", "Fiction", "Classics", "Fantasy", "Mystery", "Nonfiction"].map(
            (g) => (
              <button
                key={g}
                className={genre === g ? s.selected : ""}
                aria-pressed={genre === g}
                onClick={() => filter("genre", g)}
              >
                {g || "All books"}
              </button>
            ),
          )}
        </div>
        <DataState loading={loading} error={error} />
        {!loading &&
          !error &&
          data &&
          (data.items.length ? (
            <>
              <div className={s.bookGrid}>
                {data.items.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
              <div className={s.pagination}>
                <span>
                  Showing {page * 12 + 1}–
                  {Math.min((page + 1) * 12, data.total)} of {data.total} books
                </span>
                <div>
                  <button
                    className={s.secondary}
                    disabled={page === 0}
                    onClick={() => filter("page", String(page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className={s.secondary}
                    disabled={(page + 1) * 12 >= data.total}
                    onClick={() => filter("page", String(page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Empty>
              No books match those filters. Try another title or author.
            </Empty>
          ))}
      </section>
      <div className={s.bottomCallout}>
        <span className={s.calloutIcon}>✳</span>
        <div>
          <h3>Good books deserve another reader.</h3>
          <p>Borrow for 14 days. Return, renew, and keep discovering.</p>
        </div>
        <Link to="/login">
          Make yourself at home <ArrowUpRight size={18} />
        </Link>
      </div>
    </>
  );
}
export function BookDetail() {
  const { id } = useParams();
  const { data: book, error, loading } = useData<Book>("/catalog/" + id);
  const { user } = useLibrary();
  const { act, busy, error: actionError } = useAction();
  return (
    <>
      <Link to="/" className={s.back}>
        <ArrowLeft size={16} /> Back to the bookshelf
      </Link>
      <DataState loading={loading} error={error} />
      {book && !loading && !error && (
        <>
          <div className={s.detail}>
            <Cover book={book} large />
            <div>
              <span className={s.eyebrow}>
                {book.genre} / CHAPTER COLLECTION
              </span>
              <h1>{book.title}</h1>
              <p className={s.byline}>
                by {book.authors.map((a) => a.name).join(", ")}
              </p>
              <p className={s.description}>{book.description}</p>
              <Badge tone={book.available ? "green" : "amber"}>
                {book.available
                  ? `${book.available} copies available`
                  : "Join the reservation queue"}
              </Badge>
              <dl className={s.metadata}>
                <div>
                  <dt>Publisher</dt>
                  <dd>{book.publisher}</dd>
                </div>
                <div>
                  <dt>ISBN</dt>
                  <dd>{book.isbn}</dd>
                </div>
                <div>
                  <dt>Borrowing period</dt>
                  <dd>14 days · one renewal</dd>
                </div>
                <div>
                  <dt>Overdue fine</dt>
                  <dd>RM0.50 per day</dd>
                </div>
              </dl>
              <ErrorBox message={actionError} />
              {user?.role === "MEMBER" ? (
                <button
                  className={s.primary}
                  disabled={busy || user.status !== "ACTIVE"}
                  onClick={() =>
                    act(
                      () => api("/reservations", "POST", { titleId: book.id }),
                      "Reservation placed. Check My reservations for pickup details.",
                    )
                  }
                >
                  {busy ? "Reserving…" : "Reserve this book"}{" "}
                  <ArrowUpRight size={17} />
                </button>
              ) : user ? (
                <Link className={s.primary} to="/loans">
                  Open circulation <ArrowUpRight size={17} />
                </Link>
              ) : (
                <Link className={s.primary} to="/login">
                  Sign in to reserve <ArrowUpRight size={17} />
                </Link>
              )}
              <p className={s.caption}>
                A ready reservation is held for 72 hours. Collect it through a
                librarian.
              </p>
            </div>
          </div>
          <section className={s.panel}>
            <h2>Copies in the library</h2>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Barcode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {book.copies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.barcode}</td>
                      <td>
                        <Badge
                          tone={c.status === "AVAILABLE" ? "green" : "amber"}
                        >
                          {c.status.replace("_", " ").toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!book.copies.length && (
              <Empty>No physical copies have been added yet.</Empty>
            )}
          </section>
        </>
      )}
    </>
  );
}
