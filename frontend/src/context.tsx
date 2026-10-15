import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import type { User, Demo } from "./types";
type Context = {
  user: User | null;
  demo: Demo | null;
  ready: boolean;
  refresh: number;
  setUser: (u: User | null) => void;
  reload: () => void;
  notice: string;
  setNotice: (s: string) => void;
};
const LibraryContext = createContext<Context>(null!);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [demo, setDemo] = useState<Demo | null>(null),
    [ready, setReady] = useState(false),
    [refresh, setRefresh] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    Promise.all([
      api<Demo>("/demo").then(setDemo),
      api<User>("/auth/me")
        .then(setUser)
        .catch(() => {}),
    ])
      .catch(() =>
        setNotice(
          "The library is waking up or temporarily unavailable. Please retry in a moment.",
        ),
      )
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    const expire = () => {
      if (user)
        setNotice(
          "Your session ended or the demo was reset. Choose a role to continue.",
        );
      setUser(null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [user]);
  const reload = useCallback(() => {
    setRefresh((n) => n + 1);
    api<Demo>("/demo")
      .then(setDemo)
      .catch(() => {});
  }, []);
  return (
    <LibraryContext.Provider
      value={{ user, demo, ready, refresh, setUser, reload, notice, setNotice }}
    >
      {children}
    </LibraryContext.Provider>
  );
}
export const useLibrary = () => useContext(LibraryContext);
export function useData<T>(path: string) {
  const { refresh } = useLibrary();
  const [data, setData] = useState<T>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, refresh]);
  return { data, error, loading };
}
export function useAction() {
  const { reload, setNotice } = useLibrary();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(task: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await task();
      setNotice(message);
      reload();
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message +
              (Object.keys(e.fields).length
                ? " " +
                  Object.entries(e.fields)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("; ")
                : "")
          : "Something went wrong. Please retry.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { act, busy, error, setError };
}
