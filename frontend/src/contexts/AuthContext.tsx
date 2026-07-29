import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "pos_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setToken(stored);
      fetchUser(stored).catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-Logout bei abgelaufenem Token (vom API-Client getriggert)
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener("pos:session-expired", handler);
    return () => window.removeEventListener("pos:session-expired", handler);
  }, []);

  async function fetchUser(authToken: string) {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.errorCode === "token_expired") {
        setSessionExpired(true);
      }
      throw new Error("Token ungueltig");
    }
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  }

  async function login(username: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Anmeldung fehlgeschlagen");
    }

    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setSessionExpired(false);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}
