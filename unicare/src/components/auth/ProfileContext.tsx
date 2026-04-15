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
      // Ensure self profile exists and legacy records are migrated
      await ensureSelfProfile();
      const data = await getUserProfiles();
      setProfiles(data);

      // Restore last active profile from localStorage, or pick first
      const savedId = localStorage.getItem(`unicare_active_profile_${user.id}`);
      const saved = savedId ? data.find((p) => p.id === savedId) : null;
      setActiveProfileState((prev) => {
        // If already set to a valid profile, keep it (unless it was deleted)
        if (prev && data.find((p) => p.id === prev.id)) return prev;
        return saved || data[0] || null;
      });
    } catch (err) {
      console.error("Profile load error:", err);
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
