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

  const trimmed = rawScan.trim();
  let extractedCode = "";

  try {
    // a) JSON payload { code: ... }
    const parsed = JSON.parse(trimmed);
    if (parsed?.code && typeof parsed.code === "string") {
      extractedCode = parsed.code;
    }
  } catch {
    // Not JSON
  }

  // b) & c) URL query param `code` or legacy `d`
  if (!extractedCode) {
    try {
      const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://dummy.com/${trimmed.replace(/^\/+/, "")}`);
      extractedCode = urlObj.searchParams.get("code") || urlObj.searchParams.get("d") || "";
    } catch {
      // Ignore
    }
  }

  // d) fallback token regex
  if (!extractedCode) {
    const tokens = trimmed.split(/[^A-Za-z0-9]/).filter(Boolean);
    // Prefer DR-prefixed exactly 6 chars
    const drToken = tokens.find((t) => t.toUpperCase().startsWith("DR") && t.length === 6);
    if (drToken) {
      extractedCode = drToken;
    } else {
      // Take first 6-char alphanumeric
      const any6 = tokens.find((t) => t.length === 6);
      if (any6) {
        extractedCode = any6;
      }
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
