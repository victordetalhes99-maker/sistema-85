import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveAdminAccess } from "./adminAccess";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  email: string | null;
  userId: string | null;
  isAdmin: boolean;
  adminLoading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);

  function applySession(nextSession: Session | null) {
    setSession(nextSession);
    setSessionLoaded(true);
    setAdminLoading(Boolean(nextSession?.user?.id));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user?.id ?? null;

    if (!uid) {
      setIsAdmin(false);
      setAdminLoading(false);
      lastCheckedUserId.current = null;
      return;
    }

    if (lastCheckedUserId.current === uid) return;

    lastCheckedUserId.current = uid;
    let alive = true;
    setAdminLoading(true);

    (async () => {
      try {
        const result = await resolveAdminAccess(session);
        if (!alive) return;
        setIsAdmin(result.state === "authorized");
      } catch {
        if (alive) setIsAdmin(false);
      } finally {
        if (alive) setAdminLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [session]);

  const value = useMemo<AuthState>(() => {
    const status: AuthStatus = !sessionLoaded
      ? "loading"
      : session
        ? "authenticated"
        : "unauthenticated";

    return {
      status,
      session,
      user: session?.user ?? null,
      email: session?.user?.email ?? null,
      userId: session?.user?.id ?? null,
      isAdmin,
      adminLoading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRole: async () => {
        if (!session) return;
        setAdminLoading(true);
        const result = await resolveAdminAccess(session);
        setIsAdmin(result.state === "authorized");
        setAdminLoading(false);
      },
    };
  }, [session, sessionLoaded, isAdmin, adminLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
