import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
    void supabase.from("profiles").upsert(
      {
        id: user.id,
        name: meta?.name || meta?.full_name || user.email?.split("@")[0] || "Estudante",
        email: user.email ?? null,
      },
      { onConflict: "id" },
    );
  }, [session?.user]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function displayName(user: User | null) {
  if (!user) return "";
  const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
  return meta?.name || meta?.full_name || user.email?.split("@")[0] || "Estudante";
}
