import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Users, Clock, Library } from "lucide-react";
import { api } from "../api";
import { useData, useLibrary, useAction } from "../context";
import {
  Badge,
  DataState,
  Empty,
  ErrorBox,
  date,
  dateTime,
  money,
} from "../components";
import type {
  Loan,
  Reservation,
  Dashboard as Overview,
  User,
  Page,
  Book,
} from "../types";
import s from "../App.module.css";
function LoanTable({
  loans,
  staff,
  act,
  busy,
}: {
  loans: Loan[];
  staff: boolean;
  act: ReturnType<typeof useAction>["act"];
  busy: boolean;
}) {
  return loans.length ? (
    <div className={s.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Book / copy</th>
            {staff && <th>Member</th>}
            <th>Due / returned</th>
            <th>Fine</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((l) => (
            <tr key={l.id}>
              <td>
                <Link to={"/catalog/" + l.titleId}>
                  <strong>{l.title}</strong>
                </Link>
                <small>{l.barcode}</small>
              </td>
              {staff && <td>{l.borrower}</td>}
              <td>
                {date(l.returnDate || l.dueDate)}
                <small>{l.returnDate ? "Returned" : "Due date"}</small>
              </td>
              <td>
                {money(l.fine)}
                <small>{l.returnDate ? "Final" : "Estimate"}</small>
              </td>
              <td>
                <Badge
                  tone={l.returnDate ? "neutral" : l.overdue ? "red" : "green"}
                >
                  {l.returnDate
                    ? "Returned"
                    : l.overdue
                      ? "Overdue"
                      : "On loan"}
                </Badge>
              </td>
              <td>
                <div className={s.rowActions}>
                  {!l.returnDate && (
                    <>
                      <button
                        className={s.textButton}
                        disabled={busy || l.overdue || l.renewals > 0}
                        onClick={() =>
                          act(
                            () => api("/loans/" + l.id + "/renew", "POST"),
                            "Loan renewed for 14 more days.",
                          )
                        }
                      >
                        {l.renewals ? "Renewed" : "Renew"}
                      </button>
                      {staff && (
                        <button
                          className={s.primarySmall}
                          disabled={busy}
                          onClick={() =>
                            act(
                              () => api("/loans/" + l.id + "/return", "POST"),
                              "Book returned. Any waiting reservation has been allocated.",
                            )
                          }
                        >
                          Return
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>
      No loans in this view. Your next story is waiting on the bookshelf.
    </Empty>
  );
}
function IssueForm({
  act,
  busy,
}: {
  act: ReturnType<typeof useAction>["act"];
  busy: boolean;
}) {
  const {
    data: users,
    error: userError,
    loading: usersLoading,
  } = useData<User[]>("/users");
  const [bookId, setBookId] = useState(""),
    [q, setQ] = useState("");
  const {
    data: books,
    error: bookError,
    loading: booksLoading,
  } = useData<Page<Book>>("/catalog?size=50&q=" + encodeURIComponent(q));
  const [borrowerId, setBorrower] = useState(""),
    [copyId, setCopy] = useState("");
  return (
    <section className={s.panel}>
      <div className={s.sectionHeading}>
        <h2>Issue a book</h2>
        <Badge tone="green">14-day loan</Badge>
      </div>
      <ErrorBox message={userError || bookError} />
      <form
        className={s.issueForm}
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act(
              () =>
                api("/loans", "POST", {
                  borrowerId: Number(borrowerId),
                  copyId: Number(copyId),
                }),
              "Book issued successfully.",
            )
          ) {
            setCopy("");
            setBookId("");
          }
        }}
      >
        <label>
          Member
          <select
            required
            disabled={usersLoading}
            value={borrowerId}
            onChange={(e) => setBorrower(e.target.value)}
          >
            <option value="">Choose a member</option>
            {users
              ?.filter((u) => u.role === "MEMBER")
              .map((u) => (
                <option value={u.id} key={u.id}>
                  {u.name} · {u.status.toLowerCase()}
                </option>
              ))}
          </select>
        </label>
        <label>
          Find a title
          <input
            aria-label="Find a title to issue"
            placeholder="Filter by title or author"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setBookId("");
              setCopy("");
            }}
          />
        </label>
        <label>
          Title
          <select
            required
            disabled={booksLoading}
            value={bookId}
            onChange={(e) => {
              setBookId(e.target.value);
              setCopy("");
            }}
          >
            <option value="">Choose a title</option>
            {books?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Copy
          <select
            required
            value={copyId}
            onChange={(e) => setCopy(e.target.value)}
          >
            <option value="">Choose a copy</option>
            {books?.items
              .find((b) => b.id === Number(bookId))
              ?.copies.filter(
                (c) => c.status === "AVAILABLE" || c.status === "HELD",
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.barcode} · {c.status.toLowerCase()}
                </option>
              ))}
          </select>
        </label>
        <button className={s.primary} disabled={busy || !copyId}>
          Issue book <ArrowUpRight size={16} />
        </button>
      </form>
      <p className={s.caption}>
        Held copies can only be issued to the member who reserved them. Maximum
        five active loans per member.
      </p>
    </section>
  );
}
export function Loans() {
  const { user } = useLibrary();
  const staff = user?.role !== "MEMBER";
  const [tab, setTab] = useState("active"),
    [search, setSearch] = useState("");
  const { data, error, loading } = useData<Loan[]>("/loans");
  const { act, busy, error: actionError } = useAction();
  const rows =
    data?.filter(
      (l) =>
        (tab === "active" ? !l.returnDate : !!l.returnDate) &&
        (l.title + " " + l.borrower + " " + l.barcode)
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <div className={s.pageHeading}>
        <span className={s.eyebrow}>
          {staff ? "KEEP STORIES MOVING" : "YOUR READING JOURNEY"}
        </span>
        <h1>
          {staff ? "Circulation" : "My loans"}
          <span className={s.logoDot}>.</span>
        </h1>
        <p>
          {staff
            ? "A smooth handover, from one reader to the next."
            : "A little more time with the books you love."}
        </p>
      </div>
      <ErrorBox message={actionError} />
      {staff && <IssueForm act={act} busy={busy} />}
      <section className={s.panel}>
        <div className={s.toolbar}>
          <div className={s.genreTabs}>
            {["active", "history"].map((t) => (
              <button
                className={tab === t ? s.selected : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {t === "active" ? "Active loans" : "Loan history"}
              </button>
            ))}
          </div>
          <input
            aria-label="Filter loans"
            placeholder="Filter by book, member, or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DataState loading={loading} error={error} />
        {!loading && !error && (
          <LoanTable loans={rows} staff={staff} act={act} busy={busy} />
        )}
      </section>
      <p className={s.caption}>
        Renew once for 14 more days when a loan is not overdue and no other
        member has reserved the title. Fines are illustrative; no payments are
        collected.
      </p>
    </>
  );
}
export function Reservations() {
  const { user } = useLibrary();
  const staff = user?.role !== "MEMBER";
  const { data, error, loading } = useData<Reservation[]>("/reservations");
  const { act, busy, error: actionError } = useAction();
  return (
    <>
      <div className={s.pageHeading}>
        <span className={s.eyebrow}>SOMETHING TO LOOK FORWARD TO</span>
        <h1>
          {staff ? "Reservations" : "My reservations"}
          <span className={s.logoDot}>.</span>
        </h1>
        <p>
          First in line for your next great read. Ready copies are held for 72
          hours.
        </p>
      </div>
      <ErrorBox message={actionError} />
      <section className={s.panel}>
        <DataState loading={loading} error={error} />
        {!loading &&
          !error &&
          (data?.length ? (
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Book</th>
                    {staff && <th>Member</th>}
                    <th>Status</th>
                    <th>Pickup / queue</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={"/catalog/" + r.titleId}>
                          <strong>{r.title}</strong>
                        </Link>
                        <small>Placed {date(r.createdAt)}</small>
                      </td>
                      {staff && <td>{r.borrower}</td>}
                      <td>
                        <Badge
                          tone={
                            r.status === "READY"
                              ? "green"
                              : r.status === "WAITING"
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {r.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td>
                        {r.status === "READY" ? (
                          <>
                            {r.barcode}
                            <small>
                              Collect by {dateTime(r.expiresAt)} MYT
                            </small>
                          </>
                        ) : r.status === "WAITING" ? (
                          `Queue position ${r.queuePosition}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {["READY", "WAITING"].includes(r.status) && (
                          <button
                            className={s.textButton}
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  api(
                                    "/reservations/" + r.id + "/cancel",
                                    "POST",
                                  ),
                                "Reservation cancelled.",
                              )
                            }
                          >
                            Cancel reservation
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              No reservations yet.{" "}
              <Link to="/">Find a book to look forward to.</Link>
            </Empty>
          ))}
      </section>
    </>
  );
}
export function Dashboard() {
  const { data, error, loading } = useData<Overview>("/dashboard");
  const { act, busy, error: actionError } = useAction();
  return (
    <>
      <div className={s.pageHeading}>
        <span className={s.eyebrow}>THE LIBRARY, AT A GLANCE</span>
        <h1>
          A well-read community<span className={s.logoDot}>.</span>
        </h1>
        <p>A little care keeps every chapter moving.</p>
      </div>
      <DataState loading={loading} error={error} />
      <ErrorBox message={actionError} />
      {data && !loading && !error && (
        <>
          <div className={s.stats}>
            {[
              {
                label: "Titles in collection",
                value: data.titles,
                icon: Library,
              },
              {
                label: "Copies available",
                value: data.available,
                icon: BookOpen,
              },
              { label: "Books on loan", value: data.activeLoans, icon: Clock },
              { label: "Library members", value: data.members, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <Icon size={20} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section className={s.panel}>
            <div className={s.sectionHeading}>
              <h2>Overdue, but not forgotten</h2>
              <Badge tone="red">{data.overdue.length} to follow up</Badge>
            </div>
            <LoanTable loans={data.overdue} staff act={act} busy={busy} />
          </section>
          <div className={s.twoColumns}>
            <section className={s.panel}>
              <div className={s.sectionHeading}>
                <h2>Ready for pickup</h2>
                <BookmarkIcon />
              </div>
              {data.pickups.length ? (
                data.pickups.map((r) => (
                  <div className={s.activity} key={r.id}>
                    <strong>{r.title}</strong>
                    <p>
                      {r.borrower} · {r.barcode}
                    </p>
                    <small>Until {dateTime(r.expiresAt)} MYT</small>
                  </div>
                ))
              ) : (
                <Empty>No pickups waiting.</Empty>
              )}
              <Link to="/reservations" className={s.textButton}>
                View all reservations ↗
              </Link>
            </section>
            <section className={s.panel}>
              <h2>Around the library</h2>
              {data.activity.map((a) => (
                <div className={s.activity} key={a.id}>
                  <p>{a.message}</p>
                  <small>
                    {a.actor} · {dateTime(a.createdAt)}
                  </small>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
function BookmarkIcon() {
  return <BookOpen size={19} />;
}
