"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether we've already resolved from localStorage so the listener
  // doesn't double-set when it also fires INITIAL_SESSION.
  const resolvedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Step 1: Read the session from localStorage immediately (no network needed).
    // getSession() returns the persisted session from localStorage synchronously
    // (or very fast) if the access token is still valid. This unblocks the UI
    // without waiting for any network round-trip.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || resolvedRef.current) return;
      resolvedRef.current = true;
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      // If even localStorage read fails (e.g. private browsing restriction), unblock UI
      if (!mounted || resolvedRef.current) return;
      resolvedRef.current = true;
      setUser(null);
      setLoading(false);
    });

    // Step 2: Subscribe to auth state changes (login, logout, token refresh, OAuth callback).
    // This handles changes AFTER the initial load: Google OAuth redirect, explicit
    // sign-in/sign-out, auto token refresh, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          setUser(session?.user ?? null);
        } else if (event === "INITIAL_SESSION") {
          // INITIAL_SESSION fires after a network round-trip to refresh the token.
          // Only use it if we somehow didn't already resolve from localStorage.
          if (!resolvedRef.current) {
            resolvedRef.current = true;
            setUser(session?.user ?? null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
