import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** UI hint only. Real enforcement is Postgres RLS + the edge functions. */
  isAdmin: boolean;
  /** True until both the session and the role check have resolved. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [roleChecking, setRoleChecking] = useState(false);
  const checkedFor = useRef<string | null>(null);

  const checkAdmin = useCallback(async (userId: string) => {
    if (checkedFor.current === userId) return;
    checkedFor.current = userId;
    setRoleChecking(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    // Fail closed: any error means "not admin".
    setIsAdmin(!error && !!data);
    setRoleChecking(false);
  }, []);

  useEffect(() => {
    const apply = (s: Session | null) => {
      setSession(s);
      if (s?.user) {
        // Defer the query so it never runs inside the auth callback (avoids a supabase-js deadlock).
        setTimeout(() => checkAdmin(s.user.id), 0);
      } else {
        checkedFor.current = null;
        setIsAdmin(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) { setRoleChecking(true); apply(s); } else apply(null);
      setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    checkedFor.current = null;
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      isAdmin,
      loading: !sessionReady || roleChecking,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
