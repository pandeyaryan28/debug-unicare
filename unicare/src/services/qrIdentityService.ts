import { supabase } from "@/lib/supabase";
import { ClinicCode } from "@/services/appointmentsService";

// ─── Patient QR payload ───────────────────────────────────────────────────────
// The data embedded in the patient's QR code.
// Deliberately minimal — NOT raw PII. Contains only a resolvable patient_code.
// The doctor app calls the resolve-patient-code Edge Function with this code.

export interface PatientQrPayload {
  v: 1;
  type: "patient";
  code: string; // e.g. "UC-A1B2C3D4"
}

// ─── Doctor QR scan result ────────────────────────────────────────────────────
// After a patient scans a doctor/clinic QR, we call resolve_doctor_qr RPC
// which returns canonical doctor data from clinic_codes — never trusting
// raw QR payload as final data.

export interface ProfileIdentity {
  id: string;
  patient_code: string;
  patient_qr_version: number;
  patient_code_status: string;
  name: string;
  relation: string;
}

// ─── Get profile identity (patient_code etc.) ─────────────────────────────────
export const getProfileIdentity = async (
  profileId: string
): Promise<ProfileIdentity | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, patient_code, patient_qr_version, patient_code_status, name, relation")
    .eq("id", profileId)
    .single();

  if (error || !data) return null;
  return data as ProfileIdentity;
};

// ─── Generate patient QR payload string ──────────────────────────────────────
// Returns the JSON string to embed in `<QRCodeSVG value={...} />`
// Format: {"v":1,"type":"patient","code":"UC-A1B2C3D4"}
export const generatePatientQrPayload = async (
  profileId: string
): Promise<{ qrData: string; code: string } | null> => {
  const identity = await getProfileIdentity(profileId);
  if (!identity?.patient_code) return null;

  const payload: PatientQrPayload = {
    v: 1,
    type: "patient",
    code: identity.patient_code,
  };

  return {
    qrData: JSON.stringify(payload),
    code: identity.patient_code,
  };
};

// ─── Resolve doctor QR scan ───────────────────────────────────────────────────
// Called after a patient scans a doctor/clinic QR.
// Accepts raw QR string — tries to extract the clinic code and calls the
// resolve_doctor_qr RPC for canonical, server-verified doctor data.
// NEVER trusts the raw QR as final identity data; always calls the backend.

export const resolveDoctorFromScannedQr = async (
  rawScan: string
): Promise<ClinicCode | null> => {
  if (!rawScan?.trim()) return null;

  // Try to parse as JSON first (e.g. {"v":1,"type":"doctor","code":"DR3F2A"})
  let extractedCode = "";
  try {
    const parsed = JSON.parse(rawScan.trim());
    if (parsed?.code && typeof parsed.code === "string") {
      extractedCode = parsed.code;
    }
  } catch {
    // Not JSON — try raw 6-char alphanumeric code
    const match = rawScan.trim().match(/[A-Z0-9]{6}/i);
    if (match) {
      extractedCode = match[0].toUpperCase();
    }
  }

  if (!extractedCode) return null;
  const cleanCode = extractedCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (cleanCode.length !== 6) return null;

  // Call resolve_doctor_qr RPC — server-side canonicalization
  const { data, error } = await supabase.rpc("resolve_doctor_qr", {
    p_code: cleanCode,
  });

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  // Return as ClinicCode shape (compatible with existing BookAppointmentModal state)
  return {
    code: row.code,
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name,
    specialty: row.specialty,
    clinic_name: row.clinic_name,
    clinic_address: row.clinic_address,
    is_active: row.is_active,
    updated_at: null,
  } as ClinicCode;
};
