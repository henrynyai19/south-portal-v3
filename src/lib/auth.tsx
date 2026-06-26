import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "main_admin" | "sub_admin" | "submitter";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isSubmitter: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = async (uid: string) => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    const nextProfile = (p.data as Profile) ?? null;
    const nextRoles = ((r.data ?? []) as { role: AppRole }[]).map((x) => x.role);

    if (!nextProfile?.is_active || nextRoles.length === 0) {
      setProfile(null);
      setRoles([]);
      setSession(null);
      setUser(null);
      await supabase.auth.signOut();
      window.location.href = "/auth";
      return;
    }

    setProfile(nextProfile);
    setRoles(nextRoles);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfileAndRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfileAndRoles(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    roles,
    loading,
    isAdmin: roles.includes("main_admin"),
    isSubAdmin: roles.includes("sub_admin"),
    isSubmitter: roles.includes("submitter"),
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    },
    refresh: async () => {
      if (user) await loadProfileAndRoles(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
