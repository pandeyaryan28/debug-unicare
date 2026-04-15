import { supabase } from "@/lib/supabase";

export type ProfileRelation = "Self" | "Parent" | "Child" | "Spouse" | "Other";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  relation: ProfileRelation;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  abha_id?: string | null;
  blood_group?: string | null;
  avatar_color: string;
  created_at: string;
}

export interface CreateProfileInput {
  name: string;
  relation: ProfileRelation;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  abha_id?: string | null;
  blood_group?: string | null;
  avatar_color?: string;
}

const AVATAR_COLORS = [
  "#6750A4", "#B5261E", "#006A60", "#6E4E37", "#904D00",
  "#344F5D", "#386A20", "#7A4F80", "#A52A2A", "#1A6B6B",
];

export const getUserProfiles = async (): Promise<Profile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  
  // Safety net: client-side deduplication for "Self" records
  const uniqueProfiles: Profile[] = [];
  const relationKeys = new Set<string>();
  
  (data || []).forEach(p => {
    if (p.relation === 'Self') {
      if (!relationKeys.has('Self')) {
        uniqueProfiles.push(p as Profile);
        relationKeys.add('Self');
      }
    } else {
      uniqueProfiles.push(p as Profile);
    }
  });

  return uniqueProfiles;
};

export const createProfile = async (input: CreateProfileInput): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const color = input.avatar_color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      name: input.name,
      relation: input.relation,
      dob: input.dob || null,
      gender: input.gender || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      emergency_contact: input.emergency_contact || null,
      abha_id: input.abha_id || null,
      blood_group: input.blood_group || null,
      avatar_color: color,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
};

export const deleteProfile = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw new Error(error.message);
};

/**
 * Ensures the logged-in user has a "Self" profile.
 * If not, creates one from user metadata and migrates legacy records.
 * Returns the Self profile.
 */
export const ensureSelfProfile = async (): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if Self profile already exists
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("relation", "Self")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Error checking for existing profile:", fetchError);
  }

  if (existing) return existing as Profile;

  // Create Self profile from user metadata
  const rawName = user.user_metadata?.full_name || user.user_metadata?.name;
  const name = rawName || user.email?.split("@")[0] || "Me";

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      name,
      relation: "Self",
      avatar_color: AVATAR_COLORS[0],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Migrate legacy records (profile_id IS NULL, user_id = current user) to this new profile
  await supabase
    .from("records")
    .update({ profile_id: newProfile.id })
    .eq("user_id", user.id)
    .is("profile_id", null);

  return newProfile as Profile;
};

export const updateProfile = async (profileId: string, updates: Partial<CreateProfileInput>): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
};

export const getAvatarInitials = (name: string): string => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};
