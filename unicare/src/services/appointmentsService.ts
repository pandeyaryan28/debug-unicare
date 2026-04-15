import { supabase } from "@/lib/supabase";

export type AppointmentStatus =
  | "pending"       // Patient-submitted via patient app; awaiting doctor confirmation
  | "upcoming"      // Confirmed / self-scheduled (general appointments)
  | "confirmed"     // Explicitly confirmed by doctor
  | "cancelled"
  | "checked_in"
  | "completed";

export type AppointmentSource = "patient_app" | "doctor_app";

export interface Appointment {
  id: string;
  profile_id: string;
  title: string;
  doctor: string | null;
  doctor_id: string | null;   // UUID from Doctors-UniCare
  queue_id: string | null;    // Links to doctor-side queue entry after check-in
  location: string | null;
  date: string;               // ISO UTC string
  notes: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;  // 'patient_app' | 'doctor_app'
  idempotency_key: string | null;
  packet_id: string | null;
  timezone: string;           // e.g. 'Asia/Kolkata'
  created_at: string;
}

export interface CreateAppointmentInput {
  profileId: string;
  title: string;
  doctor?: string;
  doctorId?: string;          // REQUIRED when booking via clinic code
  location?: string;
  date: Date;
  notes?: string;
  status?: AppointmentStatus;
  source?: AppointmentSource; // defaults to 'patient_app'
  idempotencyKey?: string;    // stable UUID to prevent duplicate submissions
  packetId?: string;
  timezone?: string;
}

// ─── Clinic code / doctor lookup ──────────────────────────────────────────────

export interface ClinicCode {
  code: string;
  doctor_id: string;
  doctor_name: string | null;
  specialty: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  is_active: boolean;
  updated_at: string | null;
}

export const lookupClinicCode = async (
  code: string
): Promise<ClinicCode | null> => {
  const { data, error } = await supabase
    .from("clinic_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as ClinicCode;
};

// ─── Prescriptions ────────────────────────────────────────────────────────────

export interface MedicationItem {
  name: string;
  timing: string[];           // e.g. ['morning', 'evening']
  food: "before" | "after";
  days: number;
}

export interface Prescription {
  id: string;
  appointment_id: string;
  profile_id: string;
  doctor_id: string;
  diagnosis: string | null;
  medications: MedicationItem[];
  notes: string | null;
  created_at: string;
}

export const getPrescription = async (
  appointmentId: string,
  profileId: string
): Promise<Prescription | null> => {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("appointment_id", appointmentId)
    .eq("profile_id", profileId)
    .single();

  if (error || !data) return null;
  return data as Prescription;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getProfileAppointments = async (
  profileId: string
): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("profile_id", profileId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
  return data as Appointment[];
};

export const createAppointment = async (
  input: CreateAppointmentInput
): Promise<Appointment> => {
  const source = input.source ?? "patient_app";
  // Patient-app bookings always start as 'pending' (require doctor confirmation)
  // unless an explicit status override is passed (for backward compat / doctor-side creates)
  const status = input.status ?? (source === "patient_app" ? "pending" : "upcoming");

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      profile_id: input.profileId,
      title: input.title,
      doctor: input.doctor || null,
      doctor_id: input.doctorId || null,
      location: input.location || null,
      date: input.date.toISOString(),
      notes: input.notes || null,
      status,
      source,
      idempotency_key: input.idempotencyKey || null,
      packet_id: input.packetId || null,
      timezone: input.timezone || "Asia/Kolkata",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Appointment;
};

export const updateAppointment = async (
  id: string,
  updates: Partial<Omit<Appointment, "id" | "profile_id" | "created_at">>
): Promise<Appointment> => {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Appointment;
};

/** Cancel an appointment — patients can only cancel upcoming or confirmed */
export const cancelAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
};

/** Legacy delete — kept for backward compat with old AppointmentForm edit flow */
export const deleteAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// ─── Estimated visit time helpers ─────────────────────────────────────────────
// Stored as "[est-time: HH:MM]\n" prefix in the notes field.
// No schema change needed.

const EST_TIME_PREFIX = /^\[est-time:\s*(\d{2}:\d{2})\]\n?/;

/**
 * Encodes an optional estimated time into the notes string.
 * e.g. encodeEstimatedTime("Chest pain", "10:30") → "[est-time: 10:30]\nChest pain"
 */
export function encodeEstimatedTime(
  notes: string | undefined,
  time: string | undefined
): string | undefined {
  const cleanNotes = notes?.trim() || undefined;
  if (!time) return cleanNotes;
  const prefix = `[est-time: ${time}]`;
  return cleanNotes ? `${prefix}\n${cleanNotes}` : prefix;
}

/**
 * Parses and removes the estimated time tag from a notes string.
 * Returns { time: "10:30" | null, cleanNotes: "..." | null }
 */
export function parseEstimatedTime(notes: string | null): {
  time: string | null;
  cleanNotes: string | null;
} {
  if (!notes) return { time: null, cleanNotes: null };
  const match = notes.match(EST_TIME_PREFIX);
  if (!match) return { time: null, cleanNotes: notes || null };
  const time = match[1];
  const cleanNotes = notes.replace(EST_TIME_PREFIX, "").trim() || null;
  return { time, cleanNotes };
}

