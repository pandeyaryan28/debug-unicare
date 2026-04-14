import { supabase } from "@/lib/supabase";
import { QUESTIONS } from "./medicalHistoryService";

export type RecordType = "prescription" | "lab" | "imaging" | "general";

export interface HealthRecord {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  date: string; // ISO string from Postgres
  provider: string;
  type: RecordType;
  file_url: string; // signed URL
  file_name: string;
  file_type: string;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  record_id: string;
  expires_at: string | null;
  created_at: string;
}

// Internal helper to extract file path from potentially old public URLs
const getFilePathFromUrl = (url: string): string => {
  if (url.includes("/storage/v1/object/public/medical-records/")) {
    return url.split("/storage/v1/object/public/medical-records/")[1];
  }
  return url;
};

// Helper to get a URL for a record. Uses public URL because the bucket is now public (but RLS protected)
const getRecordUrl = (record: any): HealthRecord => {
  const filePath = getFilePathFromUrl(record.file_url);
  const { data } = supabase.storage.from("medical-records").getPublicUrl(filePath);

  return {
    ...record,
    file_url: data.publicUrl,
    tags: record.tags || [],
    notes: record.notes || null,
  } as HealthRecord;
};

export const uploadRecord = async (
  file: File,
  metadata: {
    title: string;
    provider: string;
    type: RecordType;
    date: Date;
    profileId: string;
    tags?: string[];
    notes?: string;
  },
  onProgress?: (progress: number) => void
): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // 1. Upload file to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("medical-records")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(uploadError.message || "Upload failed");
  }

  // 2. Create record in Postgres
  try {
    const { data: record, error: dbError } = await supabase
      .from("records")
      .insert({
        user_id: user.id,
        profile_id: metadata.profileId,
        title: metadata.title,
        provider: metadata.provider,
        type: metadata.type,
        date: metadata.date.toISOString(),
        file_url: filePath,
        file_name: file.name,
        file_type: file.type,
        tags: metadata.tags || [],
        notes: metadata.notes || null,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    console.log("Record successfully created in database:", record.id);
    return record.id;
  } catch (err: any) {
    console.error("Database insert error, cleaning up storage:", err);
    // Cleanup: try to delete the file if record creation failed
    await supabase.storage.from("medical-records").remove([filePath]);
    throw new Error(err.message || "Failed to create record entry.");
  }
};

export const getProfileRecords = async (profileId: string): Promise<HealthRecord[]> => {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("profile_id", profileId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching records:", error);
    return [];
  }

  return data.map((record) => getRecordUrl(record));
};

// Kept for backward compatibility / legacy paths
export const getUserRecords = async (): Promise<HealthRecord[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching records:", error);
    return [];
  }

  return data.map((record) => getRecordUrl(record));
};

export const getRecordById = async (recordId: string): Promise<HealthRecord | null> => {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !data) {
    console.error("Error fetching record:", error);
    return null;
  }

  return getRecordUrl(data);
};

// ============================================================
// SHARE LINKS
// ============================================================

export const createShareLink = async (
  recordId: string,
  expiryDays: number | null
): Promise<string> => {
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from("shared_records")
    .insert({
      record_id: recordId,
      expires_at: expiresAt,
      access_code: accessCode,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error during share creation:", error);
    throw new Error(error.message);
  }
  
  if (!data) {
    console.error("No data returned from share creation insert.");
    throw new Error("Failed to create share record.");
  }

  return data.id;
};

export const getSharedRecord = async (
  shareId: string
): Promise<{ record: HealthRecord; expiresAt: string | null } | null> => {
  const { data: shareData, error: shareError } = await supabase
    .from("shared_records")
    .select("*")
    .eq("id", shareId)
    .single();

  if (shareError || !shareData) return null;

  // Check expiry
  if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
    return null; // Expired
  }

  const record = await getRecordById(shareData.record_id);
  if (!record) return null;

  return { record, expiresAt: shareData.expires_at };
};

// --- Packet Sharing ---

export interface SharedPacket {
  id: string;
  title: string;
  expires_at: string | null;
  records: HealthRecord[];
  profile_id?: string | null;
  share_medical_history?: boolean;
  profile_data?: any;
  medical_history?: any[];
}

export const createPacketLink = async (
  title: string,
  recordIds: string[],
  expiryHours: number = 2,
  profileId: string | null = null,
  shareMedicalHistory: boolean = false
): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // 1. Create packet
  const { data: packet, error: pError } = await supabase
    .from("shared_packets")
    .insert({
      title,
      user_id: user.id,
      profile_id: profileId,
      share_medical_history: shareMedicalHistory,
      access_code: accessCode,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (pError) throw new Error(pError.message);

  // 2. Link records
  const junctionData = recordIds.map(id => ({
    packet_id: packet.id,
    record_id: id
  }));

  const { error: jError } = await supabase
    .from("shared_packet_records")
    .insert(junctionData);

  if (jError) {
    // Cleanup
    await supabase.from("shared_packets").delete().eq("id", packet.id);
    throw new Error(jError.message);
  }

  return packet.id;
};

export const getSharedPacket = async (packetId: string): Promise<SharedPacket | null> => {
  const { data: packetData, error: pError } = await supabase
    .from("shared_packets")
    .select("*")
    .eq("id", packetId)
    .single();

  if (pError || !packetData) return null;

  // Check expiry
  if (packetData.expires_at && new Date(packetData.expires_at) < new Date()) {
    return null;
  }

  // Get records through junction
  const { data: junctionData, error: jError } = await supabase
    .from("shared_packet_records")
    .select("record_id")
    .eq("packet_id", packetId);

  if (jError || !junctionData) return null;

  const recordIds = junctionData.map(j => j.record_id);
  
  // Fetch all records
  const { data: recordsData, error: rError } = await supabase
    .from("records")
    .select("*")
    .in("id", recordIds);

  if (rError || !recordsData) return null;

  const records = recordsData.map(r => getRecordUrl(r));

  const packet: SharedPacket = {
    id: packetData.id,
    title: packetData.title,
    expires_at: packetData.expires_at,
    records,
    profile_id: packetData.profile_id,
    share_medical_history: packetData.share_medical_history,
    profile_data: null,
    medical_history: []
  };

  // If profile_id is present, fetch profile data
  if (packetData.profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", packetData.profile_id)
      .single();
    
    if (profile) {
      // Filter only filled fields
      const filledProfile: any = {};
      Object.keys(profile).forEach(key => {
        if (profile[key] && !["id", "user_id", "created_at", "avatar_color"].includes(key)) {
          filledProfile[key] = profile[key];
        }
      });
      packet.profile_data = filledProfile;

      // If medical history is requested
      if (packetData.share_medical_history) {
        const { data: history } = await supabase
          .from("medical_history")
          .select("*")
          .eq("profile_id", packetData.profile_id);
        
        if (history) {
          // Filter only answered questions and attach labels
          packet.medical_history = history
            .filter(h => h.answer && h.answer.trim() !== "")
            .map(h => ({
              ...h,
              question: QUESTIONS.find(q => q.id === h.question_id)?.label || h.question_id
            }));
        }
      }
    }
  }

  return packet;
};

export const deleteRecord = async (record: HealthRecord): Promise<void> => {
  // 1. Delete from database
  const { error: dbError } = await supabase
    .from("records")
    .delete()
    .eq("id", record.id);

  if (dbError) throw new Error(dbError.message);

  // 2. Delete from storage (file_url contains the path)
  const filePath = getFilePathFromUrl(record.file_url);
  const { error: storageError } = await supabase.storage
    .from("medical-records")
    .remove([filePath]);

  if (storageError) {
    console.error("Failed to delete from storage but entry was removed from DB:", storageError);
    // We don't throw here because the DB entry is already gone
  }
};

export const updateRecord = async (
  recordId: string,
  updates: {
    title?: string;
    provider?: string;
    type?: RecordType;
    date?: Date;
    tags?: string[];
    notes?: string;
  }
): Promise<void> => {
  const formattedUpdates: any = { ...updates };
  if (updates.date) formattedUpdates.date = updates.date.toISOString();

  const { error } = await supabase
    .from("records")
    .update(formattedUpdates)
    .eq("id", recordId);

  if (error) throw new Error(error.message);
};
