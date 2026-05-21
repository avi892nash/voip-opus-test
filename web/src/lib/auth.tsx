import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type User } from './api';

const TOKEN_KEY = 'voip-opus.token';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username_or_email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Validate existing token on mount.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me(token);
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const persist = useCallback((t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(
    async (username_or_email: string, password: string) => {
      const res = await api.login({ username_or_email, password });
      persist(res.access_token, res.user);
    },
    [persist]
  );

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      const res = await api.signup({ username, email, password });
      persist(res.access_token, res.user);
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// We intentionally co-locate the useAuth hook with its provider so consumers
// only have to import from one path; the price is slightly degraded Fast
// Refresh for auth-related state changes during dev, which is acceptable.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
