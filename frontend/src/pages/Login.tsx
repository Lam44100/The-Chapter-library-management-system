import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import { useLibrary, useAction } from "../context";
import { api } from "../api";
import { ErrorBox } from "../components";
import type { Role, User } from "../types";
import s from "../App.module.css";
export function Login() {
  const { demo, setUser, setNotice } = useLibrary();
  const { act, busy, error } = useAction();
  const navigate = useNavigate();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  async function enter(role?: Role) {
    await act(async () => {
      const u = await api<User>(
        role ? "/auth/demo" : "/auth/login",
        "POST",
        role ? { role } : { email, password },
      );
      setUser(u);
      setNotice("");
      navigate(u.role === "MEMBER" ? "/" : "/dashboard");
    }, "Welcome to Chapter. Make yourself at home.");
  }
  return (
    <div className={s.login}>
      <span className={s.eyebrow}>EVERY READER BELONGS HERE</span>
      <h1>
        Step inside
        <br />
        the <em>library.</em>
      </h1>
      <p className={s.description}>
        {demo?.enabled
          ? "Explore the same library from three perspectives. No registration needed."
          : "Sign in to your library account."}
      </p>
      <ErrorBox message={error} />
      {demo?.enabled && (
        <>
          <div className={s.roleGrid}>
            {(
              [
                {
                  role: "MEMBER",
                  title: "The reader",
                  text: "Find a book, reserve a copy, and manage your next read.",
                  icon: BookOpen,
                },
                {
                  role: "LIBRARIAN",
                  title: "The librarian",
                  text: "Keep stories moving. Issue books and manage returns.",
                  icon: Users,
                },
                {
                  role: "ADMIN",
                  title: "The administrator",
                  text: "Curate the collection and manage your community.",
                  icon: ShieldCheck,
                },
              ] as const
            ).map(({ role, title, text, icon: Icon }) => (
              <button
                key={role}
                className={s.roleCard}
                disabled={busy}
                onClick={() => enter(role)}
              >
                <Icon size={26} />
                <h2>{title}</h2>
                <p>{text}</p>
                <span>
                  Explore as {role.toLowerCase()} <ArrowUpRight size={18} />
                </span>
              </button>
            ))}
          </div>
          <div className={s.demoExplanation}>
            <strong>A shared space for exploring</strong>
            <p>
              Everyone uses the same sample accounts. Your changes are visible
              to other visitors and reset daily at 04:00 Malaysia time. Use
              fictional information only.
            </p>
            <p>Free hosting may take a moment to wake up after inactivity.</p>
          </div>
        </>
      )}
      <details className={s.loginDetails} open={!demo?.enabled}>
        <summary>Sign in with email and password</summary>
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className={s.primary} disabled={busy}>
            Sign in
          </button>
        </form>
      </details>
    </div>
  );
}
