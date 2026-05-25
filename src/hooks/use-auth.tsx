import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "parent" | "child" | null;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  role: UserRole;
  householdId: string | null;
  childProfileId: string | null;
  signOut: () => Promise<void>;
  refreshRole: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role, household_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setRole(data.role as UserRole);
      setHouseholdId(data.household_id);

      if (data.role === "child") {
        const { data: cp } = await supabase
          .from("child_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        setChildProfileId(cp?.id ?? null);
      }
    } else {
      setRole(null);
      setHouseholdId(null);
      setChildProfileId(null);
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer role fetch to avoid holding the auth lock
        setTimeout(() => {
          fetchRole(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setHouseholdId(null);
        setChildProfileId(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setHouseholdId(null);
    setChildProfileId(null);
  };

  const refreshRole = async (userId?: string) => {
    const id = userId ?? user?.id;
    if (id) await fetchRole(id);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        session,
        role,
        householdId,
        childProfileId,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
