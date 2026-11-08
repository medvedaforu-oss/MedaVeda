import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../config/supabase";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

// The token's AAL only schedules re-verification; am_i_admin() alone grants access.
function sessionAssurance(session: Session | null): string | undefined {
  try {
    const payload = session?.access_token?.split(".")[1];
    if (!payload) return undefined;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.aal === "string" ? claims.aal : undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let receivedAuthEvent = false;
    let currentUserId: string | null | undefined;
    let currentAssurance: string | undefined;
    let blocking = true;
    async function checkAdmin(currentUser: User | null, assurance?: string, mfaChanged = false) {
      if (!active) return;
      const run = ++generation;
      const current = () => active && generation === run;
      const userId = currentUser?.id ?? null;
      const block = blocking || userId !== currentUserId || assurance !== currentAssurance || mfaChanged;
      currentUserId = userId;
      currentAssurance = assurance;
      blocking = block;
      setUser(currentUser);
      if (block) {
        setIsAdmin(false);
        setLoading(true);
      }

      if (!currentUser) {
        blocking = false;
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Being logged in isn't enough - this Supabase project is shared
      // with the mobile app, so any student account could sign in here
      // too. `am_i_admin()` checks the server-side `admins` table (by
      // email) via a security-definer RPC, so the check can't be spoofed
      // client-side.
      let networkFailure = false;
      try {
        const { data, error, status } = await supabase.rpc("am_i_admin");
        if (error) {
          networkFailure = status === 0;
          throw error;
        }
        if (current()) setIsAdmin(!!data);
      } catch (err) {
        console.error("Failed to check admin status:", err);
        // Keep existing authorization on a failed background read. RLS still
        // enforces access; initial, identity and AAL changes remain fail-closed.
        const transportError = networkFailure || err instanceof TypeError;
        if (current() && (block || !transportError)) setIsAdmin(false);
      } finally {
        if (current()) {
          blocking = false;
          setLoading(false);
        }
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!receivedAuthEvent) void checkAdmin(data.session?.user ?? null, sessionAssurance(data.session));
    }).catch((err) => {
      console.error("Failed to restore session:", err);
      if (!receivedAuthEvent) void checkAdmin(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      receivedAuthEvent = true;
      void checkAdmin(session?.user ?? null, sessionAssurance(session), event === "MFA_CHALLENGE_VERIFIED");
    });

    return () => { active = false; generation++; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
