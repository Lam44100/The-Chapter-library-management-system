import { useState, useEffect } from "react";
import { Plus, Archive, Check } from "lucide-react";
import { api } from "../api";
import { useData, useAction, useLibrary } from "../context";
import { Badge, DataState, ErrorBox } from "../components";
import type { Book, Page, Author, User } from "../types";
import s from "../App.module.css";
type Kind = "titles" | "copies" | "authors" | "users";
type Values = Record<string, string>;
export function Admin() {
  const [kind, setKind] = useState<Kind>("titles"),
    [editing, setEditing] = useState<number | null>(null),
    [form, setForm] = useState<Values>({}),
    [authorIds, setAuthorIds] = useState<number[]>([]),
    [confirm, setConfirm] = useState<number | null>(null);
  const { refresh } = useLibrary();
  const [books, setBooks] = useState<Book[]>([]),
    [booksError, setBooksError] = useState("");
  const authors = useData<Author[]>("/authors"),
    users = useData<User[]>("/users");
  const { act, busy, error, setError } = useAction();
  useEffect(() => {
    let active = true;
    async function load() {
      setBooksError("");
      try {
        const first = await api<Page<Book>>("/catalog?size=50");
        let all = first.items;
        for (let p = 1; p * 50 < first.total; p++)
          all = all.concat(
            (await api<Page<Book>>("/catalog?size=50&page=" + p)).items,
          );
        if (active) setBooks(all);
      } catch (e) {
        if (active) setBooksError((e as Error).message);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [refresh]);
  function clear(next = kind) {
    setKind(next);
    setEditing(null);
    setForm({
      status: next === "users" ? "ACTIVE" : "AVAILABLE",
      role: "MEMBER",
    });
    setAuthorIds([]);
    setConfirm(null);
    setError("");
  }
  function change(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  const copies = books.flatMap((b) =>
    b.copies.map((c) => ({ ...c, titleId: b.id, title: b.title })),
  );
  const rows =
    kind === "titles"
      ? books.map((b) => ({
          id: b.id,
          name: b.title,
          detail: b.isbn,
          badge: b.genre,
          protected: false,
        }))
      : kind === "copies"
        ? copies.map((c) => ({
            id: c.id,
            name: c.barcode,
            detail: c.title,
            badge: c.status,
            protected: false,
          }))
        : kind === "authors"
          ? (authors.data || []).map((a) => ({
              id: a.id,
              name: a.name,
              detail: "Collection author",
              badge: "Author",
              protected: false,
            }))
          : (users.data || []).map((u) => ({
              id: u.id,
              name: u.name,
              detail: u.email,
              badge: u.role + " · " + u.status,
              protected: u.protectedAccount,
            }));
  function edit(id: number) {
    setEditing(id);
    setConfirm(null);
    setError("");
    if (kind === "titles") {
      const b = books.find((b) => b.id === id)!;
      setForm({
        isbn: b.isbn,
        title: b.title,
        genre: b.genre,
        publisher: b.publisher,
        description: b.description,
      });
      setAuthorIds(b.authors.map((a) => a.id));
    } else if (kind === "copies") {
      const c = copies.find((c) => c.id === id)!;
      setForm({
        barcode: c.barcode,
        titleId: String(c.titleId),
        status: c.status,
      });
    } else if (kind === "authors") {
      setForm({ name: authors.data!.find((a) => a.id === id)!.name });
    } else {
      const u = users.data!.find((u) => u.id === id)!;
      setForm({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        password: "",
      });
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    let body: unknown = form;
    if (kind === "titles")
      body = { ...form, description: form.description || "", authorIds };
    if (kind === "copies")
      body = {
        ...form,
        titleId: Number(form.titleId),
        status: form.status || "AVAILABLE",
      };
    if (kind === "users")
      body = {
        ...form,
        role: form.role || "MEMBER",
        status: form.status || "ACTIVE",
        password: form.password || null,
      };
    if (
      await act(
        () =>
          api(
            "/admin/" + kind + (editing ? "/" + editing : ""),
            editing ? "PUT" : "POST",
            body,
          ),
        "Library record saved.",
      )
    )
      clear();
  }
  function field(
    key: string,
    label: string,
    type = "text",
    required = true,
    max = 120,
  ) {
    return (
      <label>
        {label}
        <input
          type={type}
          required={required}
          maxLength={max}
          minLength={type === "password" ? 8 : undefined}
          value={form[key] || ""}
          onChange={(e) => change(key, e.target.value)}
          autoComplete={type === "password" ? "new-password" : undefined}
        />
      </label>
    );
  }
  return (
    <>
      <div className={s.pageHeading}>
        <span className={s.eyebrow}>CURATE A LITTLE POSSIBILITY</span>
        <h1>
          Library management<span className={s.logoDot}>.</span>
        </h1>
        <p>Care for the collection and the people who bring it to life.</p>
      </div>
      <div className={s.genreTabs}>
        {(["titles", "copies", "authors", "users"] as Kind[]).map((k) => (
          <button
            key={k}
            className={kind === k ? s.selected : ""}
            onClick={() => clear(k)}
          >
            {k === "users"
              ? "Accounts"
              : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      <DataState
        loading={authors.loading || users.loading}
        error={booksError || authors.error || users.error}
      />
      <div className={s.adminLayout}>
        <section className={s.panel}>
          <div className={s.sectionHeading}>
            <h2>
              {kind === "users"
                ? "Community accounts"
                : kind === "copies"
                  ? "Physical copies"
                  : kind === "authors"
                    ? "Our authors"
                    : "The collection"}
            </h2>
            <span className={s.smallCount}>{rows.length}</span>
          </div>
          <div className={s.adminList}>
            {rows.map((r) => (
              <div className={s.adminRow} key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.detail}</small>
                  <Badge>{r.badge.replaceAll("_", " ")}</Badge>
                </div>
                <div className={s.rowActions}>
                  {r.protected ? (
                    <span className={s.caption}>
                      <Check size={14} /> Demo account
                    </span>
                  ) : (
                    <>
                      <button
                        className={s.textButton}
                        onClick={() => edit(r.id)}
                      >
                        Edit
                      </button>
                      <button
                        className={s.iconButton}
                        aria-label={"Archive " + r.name}
                        onClick={() =>
                          setConfirm(confirm === r.id ? null : r.id)
                        }
                      >
                        <Archive size={16} />
                      </button>
                    </>
                  )}
                </div>
                {confirm === r.id && (
                  <div className={s.confirm}>
                    <p>Archive “{r.name}”? Loan history will be retained.</p>
                    <button
                      className={s.danger}
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await act(
                            () => api("/admin/" + kind + "/" + r.id, "DELETE"),
                            "Record archived.",
                          )
                        )
                          clear();
                      }}
                    >
                      Confirm archive
                    </button>
                    <button
                      className={s.secondary}
                      onClick={() => setConfirm(null)}
                    >
                      Keep record
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className={`${s.panel} ${s.editor}`}>
          <div className={s.sectionHeading}>
            <h2>
              {editing
                ? "Edit record"
                : "Add " +
                  (kind === "copies"
                    ? "copy"
                    : kind === "users"
                      ? "account"
                      : kind.slice(0, -1))}
            </h2>
            <Plus size={19} />
          </div>
          <form className={s.form} onSubmit={save}>
            {kind === "titles" && (
              <>
                {field("title", "Title", "text", true, 200)}
                {field("isbn", "ISBN", "text", true, 32)}
                {field("genre", "Genre", "text", true, 80)}
                {field("publisher", "Publisher")}
                <label>
                  Description
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.description || ""}
                    onChange={(e) => change("description", e.target.value)}
                  />
                </label>
                <fieldset>
                  <legend>Authors (choose at least one)</legend>
                  <div className={s.authorChoices}>
                    {authors.data?.map((a) => (
                      <label key={a.id}>
                        <input
                          type="checkbox"
                          checked={authorIds.includes(a.id)}
                          onChange={(e) =>
                            setAuthorIds((ids) =>
                              e.target.checked
                                ? [...ids, a.id]
                                : ids.filter((id) => id !== a.id),
                            )
                          }
                        />
                        {a.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {kind === "copies" && (
              <>
                <label>
                  Title
                  <select
                    required
                    value={form.titleId || ""}
                    disabled={!!editing}
                    onChange={(e) => change("titleId", e.target.value)}
                  >
                    <option value="">Choose a title</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </label>
                {field("barcode", "Barcode", "text", true, 40)}
                <label>
                  Status
                  <select
                    value={form.status || "AVAILABLE"}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {[
                      "AVAILABLE",
                      "LOST",
                      "REFERENCE_ONLY",
                      ...(["LOANED", "HELD"].includes(form.status)
                        ? [form.status]
                        : []),
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <p className={s.caption}>
                  Loans and holds are managed through circulation. Return or
                  release a copy before editing it.
                </p>
              </>
            )}
            {kind === "authors" && field("name", "Author name")}
            {kind === "users" && (
              <>
                {field("name", "Full name")}
                {field("email", "Email", "email", true, 180)}
                {field(
                  "password",
                  editing ? "New password (leave blank to keep)" : "Password",
                  "password",
                  !editing,
                  72,
                )}
                <label>
                  Role
                  <select
                    value={form.role || "MEMBER"}
                    onChange={(e) => change("role", e.target.value)}
                  >
                    {["MEMBER", "LIBRARIAN", "ADMIN"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Account status
                  <select
                    value={form.status || "ACTIVE"}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {["ACTIVE", "BLACKLISTED", "CLOSED"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <p className={s.caption}>
                  Use fictional details in this shared demo.
                </p>
              </>
            )}
            <button
              className={s.primary}
              disabled={busy || (kind === "titles" && !authorIds.length)}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Add record"}
            </button>
            {editing && (
              <button
                className={s.secondary}
                type="button"
                onClick={() => clear()}
              >
                Cancel edit
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
