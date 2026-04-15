"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Profile, getUserProfiles, ensureSelfProfile } from "@/services/profilesService";
import { useAuth } from "./AuthProvider";

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  refreshProfiles: () => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue>({
  profiles: [],
  activeProfile: null,
  setActiveProfile: () => {},
  refreshProfiles: async () => {},
  loading: true,
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);
  const initializedRef = useRef(false);

  const refreshProfiles = useCallback(async (force = false) => {
    if (!user || (refreshingRef.current && !force)) return;
    refreshingRef.current = true;
    try {
      // Step 1: Fetch existing profiles first (fast - just a SELECT).
      // This unblocks the UI even if ensureSelfProfile later fails due to network.
      const data = await getUserProfiles(user.id);

      // If we already have profiles, show them immediately
      if (data.length > 0) {
        setProfiles(data);
        const savedId = localStorage.getItem(`unicare_active_profile_${user.id}`);
        const saved = savedId ? data.find((p) => p.id === savedId) : null;
        setActiveProfileState((prev) => {
          if (prev && data.find((p) => p.id === prev.id)) return prev;
          return saved || data[0] || null;
        });
        setLoading(false);
      }

      // Step 2: Ensure Self profile exists in the background.
      // We do this AFTER displaying cached results so the UI isn't blocked.
      // If no profiles exist yet, we need this to complete before showing anything.
      const needsWait = data.length === 0;
      if (needsWait) {
        try {
          await ensureSelfProfile(user);
        } catch (ensureErr) {
          console.warn("ensureSelfProfile failed (network issue?), skipping:", ensureErr);
        }
        // Re-fetch profiles after ensuring self profile
        const freshData = await getUserProfiles(user.id);
        setProfiles(freshData);
        const savedId = localStorage.getItem(`unicare_active_profile_${user.id}`);
        const saved = savedId ? freshData.find((p) => p.id === savedId) : null;
        setActiveProfileState((prev) => {
          if (prev && freshData.find((p) => p.id === prev.id)) return prev;
          return saved || freshData[0] || null;
        });
      } else {
        // Fire-and-forget: ensure self profile in background, refresh silently if it creates one
        ensureSelfProfile(user).then(async () => {
          // Check if a new profile was created (e.g., first login with no Self profile)
          const refreshed = await getUserProfiles(user.id);
          if (refreshed.length !== data.length) {
            setProfiles(refreshed);
          }
        }).catch((e) => {
          // Non-fatal: user already has profiles, just log
          console.warn("Background ensureSelfProfile warn:", e?.message || e);
        });
      }
    } catch (err: any) {
      // Network error or timeout - if we have no profiles loaded yet, keep loading=false
      // so the UI at least shows (just with no profile)
      console.error("Profile load error:", err?.message || err);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (!initializedRef.current) {
          initializedRef.current = true;
          refreshProfiles();
        }
      } else {
        setProfiles([]);
        setActiveProfileState(null);
        setLoading(false);
        initializedRef.current = false;
      }
    }
  }, [user, authLoading, refreshProfiles]);

  const setActiveProfile = useCallback(
    (profile: Profile) => {
      setActiveProfileState(profile);
      if (user) {
        localStorage.setItem(`unicare_active_profile_${user.id}`, profile.id);
      }
    },
    [user]
  );

  return (
    <ProfileContext.Provider
      value={{ profiles, activeProfile, setActiveProfile, refreshProfiles, loading }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
