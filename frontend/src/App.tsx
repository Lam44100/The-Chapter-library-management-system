import { useState } from "react";
import {
  NavLink,
  Link,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  BookOpen,
  Library,
  LayoutDashboard,
  ArrowLeftRight,
  Bookmark,
  Settings,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import { useLibrary } from "./context";
import { api } from "./api";
import { Loading, dateTime } from "./components";
import { Catalog, BookDetail } from "./pages/Catalog";
import { Login } from "./pages/Login";
import { Loans, Reservations, Dashboard } from "./pages/Circulation";
import { Admin } from "./pages/Admin";
import s from "./App.module.css";
export default function App() {
  const { user, demo, ready, setUser, notice, setNotice } = useLibrary();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const staff = user && user.role !== "MEMBER";
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      setUser(null);
      navigate("/");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <div className={s.app}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <button
        className={s.mobileMenu}
        onClick={() => setMenu(!menu)}
        aria-label={menu ? "Close navigation" : "Open navigation"}
      >
        {menu ? <X /> : <Menu />}
      </button>
      <aside className={`${s.sidebar} ${menu ? s.sidebarOpen : ""}`}>
        <Link to="/" className={s.logo} onClick={() => setMenu(false)}>
          <span className={s.logoIcon}>
            <BookOpen size={23} />
          </span>
          <span>
            chapter<span className={s.logoDot}>.</span>
            <small>THE COMMUNITY LIBRARY</small>
          </span>
        </Link>
        <div className={s.navLabel}>YOUR LIBRARY</div>
        <nav aria-label="Main navigation" onClick={() => setMenu(false)}>
          <NavLink to="/" end>
            <Library size={18} /> Discover books
          </NavLink>
          {user && (
            <>
              <NavLink to="/loans">
                <ArrowLeftRight size={18} />
                {staff ? "Circulation" : "My loans"}
              </NavLink>
              <NavLink to="/reservations">
                <Bookmark size={18} />
                {staff ? "Reservations" : "My reservations"}
              </NavLink>
            </>
          )}
          {staff && (
            <NavLink to="/dashboard">
              <LayoutDashboard size={18} /> Library overview
            </NavLink>
          )}
          {user?.role === "ADMIN" && (
            <NavLink to="/admin">
              <Settings size={18} /> Management
            </NavLink>
          )}
        </nav>
        <div className={s.sidebarNote}>
          <Leaf size={22} />
          <h3>
            A little curiosity.
            <br />A whole new world.
          </h3>
          <p>
            Good stories are better
            <br />
            when they're shared.
          </p>
          <span>
            EST. 2026 <span>↗</span>
          </span>
        </div>
        <div className={s.sidebarBottom}>
          <span className={s.liveDot} />
          {demo?.enabled ? "LIVE PORTFOLIO DEMO" : "CHAPTER LIBRARY"}
          <p>Made for the love of reading.</p>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.topbar}>
          <span className={s.breadcrumb}>
            The library <span>/</span>{" "}
            <strong>
              {user ? `${user.role.toLowerCase()} space` : "Discover"}
            </strong>
          </span>
          <div className={s.profile}>
            {user ? (
              <>
                <span className={s.avatar}>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.role.toLowerCase()}</small>
                </div>
                <button
                  className={s.iconButton}
                  onClick={logout}
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link to="/login" className={s.signIn}>
                Try the library <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
        </header>
        {demo?.enabled && (
          <div className={s.demoBanner}>
            <span>
              <span className={s.liveDot} /> A shared demo, a real library
              experience. Changes are visible to everyone.
            </span>
            <span>Resets {dateTime(demo.nextReset)} MYT</span>
          </div>
        )}
        <main id="main" className={s.main}>
          {notice && (
            <div role="status" className={s.notice}>
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!ready ? (
            <Loading />
          ) : (
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:id" element={<BookDetail />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/loans"
                element={user ? <Loans /> : <Navigate to="/login" />}
              />
              <Route
                path="/reservations"
                element={user ? <Reservations /> : <Navigate to="/login" />}
              />
              <Route
                path="/dashboard"
                element={staff ? <Dashboard /> : <Navigate to="/" />}
              />
              <Route
                path="/admin"
                element={
                  user?.role === "ADMIN" ? <Admin /> : <Navigate to="/" />
                }
              />
              <Route
                path="*"
                element={
                  <div className={s.empty}>
                    <h1>This page has turned.</h1>
                    <Link to="/">Return to the library</Link>
                  </div>
                }
              />
            </Routes>
          )}
          <footer className={s.footer}>
            <span>CHAPTER · A PLACE FOR EVERY STORY</span>
            <span>
              Built with Java & React <span className={s.footerMark}>✳</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
