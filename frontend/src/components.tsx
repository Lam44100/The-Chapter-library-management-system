import {
  BookOpen,
  ArrowUpRight,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Book } from "./types";
import { useLibrary } from "./context";
import s from "./App.module.css";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`${s.badge} ${s[tone] || ""}`}>{children}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className={s.error}>
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div role="status" className={s.empty}>
      <LoaderCircle className={s.spin} size={24} /> Opening the next chapter…
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.empty}>
      <BookOpen size={28} />
      <p>{children}</p>
    </div>
  );
}
export function DataState({
  loading,
  error,
}: {
  loading: boolean;
  error: string;
}) {
  const { reload } = useLibrary();
  return loading ? (
    <Loading />
  ) : error ? (
    <>
      <ErrorBox message={error} />
      <button className={s.secondary} onClick={reload}>
        Try again
      </button>
    </>
  ) : null;
}
export function Cover({
  book,
  large = false,
}: {
  book: Book;
  large?: boolean;
}) {
  const n = [...book.isbn].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return (
    <div
      aria-hidden="true"
      className={`${s.cover} ${s["cover" + n]} ${large ? s.coverLarge : ""}`}
    >
      <div className={s.coverTop}>
        CHAPTER COLLECTION <span>✳</span>
      </div>
      <div className={s.coverArt}>
        <div />
        <div />
        <div />
      </div>
      <div className={s.coverWords}>
        <small>{book.authors.map((a) => a.name).join(" & ")}</small>
        <strong>{book.title}</strong>
      </div>
      <div className={s.coverBottom}>A WORLD BETWEEN THE PAGES</div>
    </div>
  );
}
export function BookCard({ book }: { book: Book }) {
  return (
    <Link to={"/catalog/" + book.id} className={s.bookCard}>
      <Cover book={book} />
      <div className={s.bookMeta}>
        <span>{book.genre}</span>
        <Badge tone={book.available ? "green" : "amber"}>
          {book.available ? "Available" : "On loan / held"}
        </Badge>
      </div>
      <h3>{book.title}</h3>
      <p>{book.authors.map((a) => a.name).join(", ")}</p>
      <div className={s.bookFoot}>
        <span>
          {book.available} of {book.copies.length} copies available
        </span>
        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    n,
  );
export const date = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(new Date(v.length === 10 ? v + "T00:00:00+08:00" : v))
    : "—";
export const dateTime = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("en-MY", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(new Date(v))
    : "—";
