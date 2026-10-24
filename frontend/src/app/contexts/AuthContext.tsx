import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ApiError } from "@/app/lib/http";
import { getCurrentUser, logout } from "@/app/services/authService";
import type { User } from "@/app/types";

interface AuthState {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  error: string;
  refresh: () => Promise<User>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((e) => {
        if (active && !(e instanceof ApiError && e.status === 401))
          setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    const value = await getCurrentUser();
    setUser(value);
    return value;
  }
  async function signOut() {
    await logout();
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, error, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
