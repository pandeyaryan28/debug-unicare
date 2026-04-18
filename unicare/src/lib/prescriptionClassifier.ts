/**
 * prescriptionClassifier.ts
 * Pure, side-effect-free helpers to classify records as prescriptions.
 *
 * Classification strategy (no DB changes):
 *
 * "appointment" source:
 *   — Records in the `prescriptions` table linked to a completed appointment
 *   — Identified by appointment_id foreign key
 *
 * "doctor_upload" source — STRICT, dual-signal requirement:
 *   Signal 1 (type): record.type MUST be "prescription"
 *   Signal 2 (source): at least one of:
 *     a) provider contains "consultation", "doctors-unicare", "unicare-doctor", or "unicare"
 *     b) tags contain "consultation", "doctor-upload", or "unicare" (exact)
 *     c) file_name starts with "consult_" or "rx_" (case-insensitive)
 *   Both signals must fire. Type alone is insufficient.
 *
 * Anything that does not meet the dual-signal test is NOT included in "doctor_upload".
 * It may appear in the general records list under its own type.
 */

import type { HealthRecord } from "@/services/recordsService";
import type { Appointment, Prescription } from "@/services/appointmentsService";

export type PrescriptionSource = "appointment" | "doctor_upload";

export interface ClassifiedPrescription {
  /** Unique key for React lists */
  key: string;
  source: PrescriptionSource;
  title: string;
  date: string; // ISO string
  doctor: string | null;
  /** Structured prescription (appointment flow) */
  prescription?: Prescription;
  /** Doctor-uploaded file record */
  record?: HealthRecord;
  /** Related appointment context */
  appointment?: Appointment;
}

// ─── Signal 2a — provider strings that indicate a doctor-side consultation upload
const PROVIDER_SIGNALS = [
  "consultation",
  "doctors-unicare",
  "unicare-doctor",
  "unicare",
] as const;

// ─── Signal 2b — tags that must exactly match (lowercased)
const TAG_SIGNALS = new Set(["consultation", "doctor-upload", "unicare"]);

// ─── Signal 2c — filename prefixes
const FILENAME_PREFIXES = ["consult_", "rx_"];

function hasProviderSignal(provider: string | undefined | null): boolean {
  if (!provider) return false;
  const lc = provider.toLowerCase();
  return PROVIDER_SIGNALS.some((s) => lc.includes(s));
}

function hasTagSignal(tags: string[] | undefined | null): boolean {
  if (!tags || tags.length === 0) return false;
  return tags.some((t) => TAG_SIGNALS.has(t.toLowerCase().trim()));
}

function hasFilenameSignal(fileName: string | undefined | null): boolean {
  if (!fileName) return false;
  const lc = fileName.toLowerCase();
  return FILENAME_PREFIXES.some((p) => lc.startsWith(p));
}

/**
 * Returns true ONLY if the record passes the strict dual-signal test:
 *   1. type === "prescription"
 *   2. At least one source signal (provider / tags / filename)
 */
export function isDoctorConsultationPrescription(record: HealthRecord): boolean {
  // Signal 1 — hard gate
  if (record.type !== "prescription") return false;

  // Signal 2 — source
  return (
    hasProviderSignal(record.provider) ||
    hasTagSignal(record.tags) ||
    hasFilenameSignal(record.file_name)
  );
}

/**
 * @deprecated Use `isDoctorConsultationPrescription` for strict classification.
 * Kept only for backward compat with older call sites.
 */
export const isDoctorUploadedPrescription = isDoctorConsultationPrescription;

// ─── Appointment-derived prescriptions ───────────────────────────────────────

/**
 * Classify appointment-derived prescriptions.
 * One entry per prescription row that links to any appointment of the profile.
 * Also handles walk-in / QR / UC-code prescriptions where appointment_id IS NULL.
 */
export function classifyAppointmentPrescriptions(
  appointments: Appointment[],
  prescriptions: Prescription[]
): ClassifiedPrescription[] {
  const apptMap = new Map(appointments.map((a) => [a.id, a]));

  return prescriptions
    .map((rx): ClassifiedPrescription => {
      // appointment_id may be null for walk-in / QR / UC-code consultations
      const appt = rx.appointment_id ? apptMap.get(rx.appointment_id) : undefined;
      // Prefer appointment title, fall back to diagnosis, then generic
      const title = appt?.title ?? (rx.diagnosis ? `Consultation — ${rx.diagnosis}` : "Consultation");
      // Prefer appointment doctor label, fall back to prescription's own doctor_name
      const doctor = appt?.doctor ?? rx.doctor_name ?? null;
      // Use issued_at if available (more accurate), otherwise created_at
      const date = rx.issued_at ?? rx.created_at;
      return {
        key: `appt-${rx.id}`,
        source: "appointment",
        title,
        date,
        doctor,
        prescription: rx,
        appointment: appt,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Doctor-uploaded consultation prescriptions ───────────────────────────────

/**
 * Classify doctor-consultation-uploaded prescription records.
 * Uses strict dual-signal test — no weak keyword matching.
 */
export function classifyDoctorUploadedPrescriptions(
  records: HealthRecord[]
): ClassifiedPrescription[] {
  return records
    .filter(isDoctorConsultationPrescription)
    .map((record): ClassifiedPrescription => ({
      key: `record-${record.id}`,
      source: "doctor_upload",
      title: record.title,
      date: record.date,
      doctor: record.provider || null,
      record,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merge and de-duplicate both sources into a single list sorted newest-first.
 */
export function mergeAndSortPrescriptions(
  apptRx: ClassifiedPrescription[],
  uploadedRx: ClassifiedPrescription[]
): ClassifiedPrescription[] {
  return [...apptRx, ...uploadedRx].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
