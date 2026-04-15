"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Search, Loader2, AlertCircle, CheckCircle2,
  Stethoscope, Building2, CalendarDays, Clock, FileText,
  ChevronRight, FolderHeart, ShieldCheck, MapPin, User,
  Link2, ChevronLeft, Info, Pencil, ScanLine,
} from "lucide-react";
import {
  lookupClinicCode,
  createAppointment,
  encodeEstimatedTime,
  ClinicCode,
} from "@/services/appointmentsService";
import { getUserRecords, HealthRecord, createPacketLink } from "@/services/recordsService";
import { useProfile } from "../auth/ProfileContext";
import { useAuth } from "../auth/AuthProvider";
import { resolveDoctorFromScannedQr } from "@/services/qrIdentityService";
import dynamic from "next/dynamic";

// Dynamically import scanner modal to avoid SSR issues with html5-qrcode
const QrScannerModal = dynamic(() => import("./QrScannerModal"), { ssr: false });

interface BookAppointmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type BookingMode = "choose" | "unicare" | "general";

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Shared: Clock-style time picker ─────────────────────────────────────────

interface TimePickerProps {
  value: string;   // "HH:MM" or ""
  onChange: (v: string) => void;
}

function TimePicker({ value, onChange }: TimePickerProps) {
  return (
    <div className="p-5 bg-surface-container-low rounded-[2rem] border border-outline-variant/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-tertiary" />
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider">
            Estimated Visit Time
            <span className="ml-2 normal-case tracking-normal font-medium opacity-60">(optional)</span>
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-label-sm font-bold text-error/70 hover:text-error transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-lowest rounded-[1.5rem] p-4 text-on-surface text-body-lg font-bold focus:outline-none focus:ring-4 focus:ring-tertiary/20 transition-all shadow-sm border border-outline-variant/20 tracking-widest"
      />

      <div className="flex items-start gap-2 p-3 bg-tertiary/5 rounded-[1.25rem] border border-tertiary/10">
        <Info className="w-3.5 h-3.5 text-tertiary shrink-0 mt-0.5" />
        <p className="text-label-sm text-on-surface-variant font-medium leading-relaxed">
          This is an estimate only — for the doctor&apos;s planning. Skipping will not affect your booking.
        </p>
      </div>
    </div>
  );
}

// ─── Shared: Packet section ───────────────────────────────────────────────────

interface PacketSectionProps {
  createPacket: boolean;
  setCreatePacket: (v: boolean) => void;
  records: HealthRecord[];
  selectedRecords: string[];
  setSelectedRecords: (v: string[]) => void;
  includeHistory: boolean;
  setIncludeHistory: (v: boolean) => void;
  recordsLoading: boolean;
  doctorName: string;
}

function PacketSection({
  createPacket, setCreatePacket,
  records, selectedRecords, setSelectedRecords,
  includeHistory, setIncludeHistory,
  recordsLoading, doctorName,
}: PacketSectionProps) {
  return (
    <div className="pt-4 border-t border-outline-variant/20 space-y-4">
      <button
        type="button"
        onClick={() => setCreatePacket(!createPacket)}
        className={`w-full flex items-center justify-between p-5 rounded-[2rem] transition-all border ${
          createPacket
            ? "bg-primary/5 border-primary/20 shadow-sm"
            : "bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high"
        }`}
      >
        <div className="flex items-center gap-4 text-left">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
            createPacket ? "bg-primary text-on-primary" : "bg-tertiary/10 text-tertiary"
          }`}>
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-label-lg font-bold text-on-surface">Link Visit Packet</p>
            <p className="text-label-sm text-on-surface-variant font-medium">Bundle records for the doctor to scan</p>
          </div>
        </div>
        {createPacket
          ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          : <div className="w-5 h-5 rounded-full border-2 border-outline-variant shrink-0" />}
      </button>

      {createPacket && (
        <div className="bg-surface-container-low rounded-[2rem] p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-1">
            <p className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
              Select Reports ({selectedRecords.length})
            </p>
            {recordsLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() =>
                  setSelectedRecords(
                    selectedRecords.includes(record.id)
                      ? selectedRecords.filter((i) => i !== record.id)
                      : [...selectedRecords, record.id]
                  )
                }
                className={`w-full flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                  selectedRecords.includes(record.id)
                    ? "bg-surface-container-lowest border-primary/20 shadow-sm"
                    : "hover:bg-surface-container-high border-transparent"
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                  selectedRecords.includes(record.id)
                    ? "bg-primary border-primary text-on-primary"
                    : "border-outline-variant"
                }`}>
                  {selectedRecords.includes(record.id) && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-bold truncate text-on-surface">{record.title}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-60">
                    {new Date(record.date).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIncludeHistory(!includeHistory)}
            className="flex items-center gap-3 w-full p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/20 text-left"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              includeHistory ? "bg-secondary text-on-secondary" : "bg-secondary/10 text-secondary"
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-label-sm font-bold text-on-surface">Share Medical History</p>
              <p className="text-[10px] text-on-surface-variant leading-tight">Surgeries, vaccinations, chronic conditions</p>
            </div>
            {includeHistory
              ? <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
              : <div className="w-5 h-5 rounded-full border-2 border-outline-variant shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function BookAppointmentModal({ onClose, onSuccess }: BookAppointmentModalProps) {
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const [mode, setMode] = useState<BookingMode>("choose");
  const [showScanner, setShowScanner] = useState(false);
  const [scanResolving, setScanResolving] = useState(false);

  // ── UniCare flow state ──
  const [code, setCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<ClinicCode | null>(null);

  // ── General flow state ──
  const [genTitle, setGenTitle] = useState("");
  const [genDoctor, setGenDoctor] = useState("");
  const [genLocation, setGenLocation] = useState("");

  // ── Shared step-2 state ──
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [estimatedTime, setEstimatedTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Packet state ──
  const [createPacket, setCreatePacket] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable idempotency key for this booking session (prevents double-submit)
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (activeProfile) {
      setRecordsLoading(true);
      getUserRecords()
        .then((data) => setRecords(data))
        .catch(() => {})
        .finally(() => setRecordsLoading(false));
    }
  }, [activeProfile]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Camera scan result handler ──
  const handleScanResult = async (raw: string) => {
    setShowScanner(false);
    setScanResolving(true);
    setCodeError(null);
    setDoctor(null);

    // Log scan attempt (fire-and-forget)
    try {
      const { supabase } = await import("@/lib/supabase");
      supabase.from("audit_logs").insert({
        event_type: "scan_attempt",
        actor_id: user?.id ?? null,
        payload: { raw_length: raw.length },
      }).then(() => {});
    } catch { /* non-critical */ }

    try {
      const resolved = await resolveDoctorFromScannedQr(raw);
      if (!resolved) {
        setCodeError("Could not identify a valid doctor QR. Try entering the code manually.");
        // Log rejection
        try {
          const { supabase } = await import("@/lib/supabase");
          supabase.from("audit_logs").insert({
            event_type: "scan_rejected",
            actor_id: user?.id ?? null,
            payload: { reason: "unresolved" },
          }).then(() => {});
        } catch { /* non-critical */ }
        return;
      }
      // Populate code + doctor from scan result
      setCode(resolved.code);
      setDoctor(resolved);
      // Log success
      try {
        const { supabase } = await import("@/lib/supabase");
        supabase.from("audit_logs").insert({
          event_type: "scan_resolved",
          actor_id: user?.id ?? null,
          target_id: resolved.doctor_id,
          payload: { clinic_code: resolved.code },
        }).then(() => {});
      } catch { /* non-critical */ }
    } catch {
      setCodeError("Scan resolution failed. Please try again or enter the code manually.");
    } finally {
      setScanResolving(false);
    }
  };


  // ── Code lookup ──
  const handleCodeChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
    setCodeError(null);
    setDoctor(null);
    if (val.length === 6) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doLookup(val), 300);
    }
  };

  const doLookup = async (val = code) => {
    if (val.length !== 6) { setCodeError("Enter the full 6-character clinic code."); return; }
    setLookingUp(true);
    setCodeError(null);
    try {
      const result = await lookupClinicCode(val);
      if (!result) setCodeError("Clinic code not found. Check with your doctor's clinic.");
      else setDoctor(result);
    } catch {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setLookingUp(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    // Ownership check: only allow booking for profiles belonging to this user
    if (user && activeProfile.user_id && activeProfile.user_id !== user.id) {
      setSubmitError("You can only book appointments for your own profiles.");
      return;
    }

    // Validation
    if (mode === "unicare" && !doctor) return;
    if (mode === "general" && !genTitle.trim()) {
      setSubmitError("Please enter an appointment title.");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      let packetId: string | undefined = undefined;
      const resolvedDoctorName = mode === "unicare" ? (doctor?.doctor_name || undefined) : (genDoctor.trim() || undefined);
      const resolvedDoctorId = mode === "unicare" ? doctor?.doctor_id : undefined;
      const resolvedLocation = mode === "unicare" ? (doctor?.clinic_name || undefined) : (genLocation.trim() || undefined);
      const resolvedTitle = mode === "unicare"
        ? `Appointment with Dr. ${doctor?.doctor_name || "Doctor"}`
        : genTitle.trim();

      // Build date — use midnight IST for general (no strict time), or user-picked time
      // We still store the date but estimated time is encoded in notes
      const dateISO = `${selectedDate}T09:00:00+05:30`;
      const appointmentDate = new Date(dateISO);

      // Encode estimated time into notes
      const encodedNotes = encodeEstimatedTime(reason.trim() || undefined, estimatedTime || undefined);

      if (createPacket && selectedRecords.length > 0) {
        try {
          packetId = await createPacketLink(
            `Packet for: ${resolvedTitle}`,
            selectedRecords,
            24,
            activeProfile.id,
            includeHistory
          );
        } catch (packetErr) {
          console.error("Failed to create packet:", packetErr);
        }
      }

      // UniCare bookings → pending (requires doctor confirmation)
      // General bookings → upcoming (self-managed, no doctor on platform)
      const appointmentStatus = mode === "unicare" ? "pending" : "upcoming";

      await createAppointment({
        profileId: activeProfile.id,
        title: resolvedTitle,
        doctor: resolvedDoctorName,
        doctorId: resolvedDoctorId,
        location: resolvedLocation,
        date: appointmentDate,
        notes: encodedNotes,
        status: appointmentStatus,
        source: "patient_app",
        idempotencyKey: idempotencyKeyRef.current,
        packetId,
        timezone: "Asia/Kolkata",
      });

      // Log appointment creation
      try {
        const { supabase } = await import("@/lib/supabase");
        supabase.from("audit_logs").insert({
          event_type: "appointment_created_pending",
          actor_id: user?.id ?? null,
          target_id: activeProfile.id,
          payload: { mode, doctor_id: resolvedDoctorId ?? null, status: appointmentStatus },
        }).then(() => {});
      } catch { /* non-critical */ }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg || "Failed to book appointment.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmitUnicare = !!doctor && !!selectedDate;
  const canSubmitGeneral = !!genTitle.trim() && !!selectedDate;

  // ── Render: mode chooser ──
  const renderChooser = () => (
    <div className="p-7 space-y-4">
      <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest mb-2">
        Choose booking type
      </p>

      {/* Flow 1 */}
      <button
        type="button"
        onClick={() => setMode("unicare")}
        className="w-full flex items-center gap-5 p-6 rounded-[2rem] bg-surface-container-low border border-outline-variant/20 hover:bg-tertiary/5 hover:border-tertiary/30 transition-all group text-left"
      >
        <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
          <Link2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-body-lg font-manrope font-bold text-on-surface mb-0.5">Book with UniCare Doctor</p>
          <p className="text-label-sm text-on-surface-variant font-medium">
            Uses a 6-character clinic code — for doctors registered on the platform
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-on-surface-variant shrink-0" />
      </button>

      {/* Flow 2 */}
      <button
        type="button"
        onClick={() => setMode("general")}
        className="w-full flex items-center gap-5 p-6 rounded-[2rem] bg-surface-container-low border border-outline-variant/20 hover:bg-secondary/5 hover:border-secondary/30 transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-all">
          <Pencil className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-body-lg font-manrope font-bold text-on-surface mb-0.5">Book General Appointment</p>
          <p className="text-label-sm text-on-surface-variant font-medium">
            No clinic code needed — for any doctor or clinic not on UniCare
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-on-surface-variant shrink-0" />
      </button>
    </div>
  );

  // ── Render: UniCare flow ──
  const renderUnicare = () => (
    <form onSubmit={handleSubmit} className="p-7 pt-4 overflow-y-auto no-scrollbar space-y-5 flex-1">
      {/* Clinic Code */}
      <div>
        <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          Clinic Code
        </label>

        {/* Scan + Manual row */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={scanResolving}
            className="flex items-center gap-2 px-4 py-3 rounded-[1.25rem] bg-tertiary/10 text-tertiary hover:bg-tertiary hover:text-on-tertiary border border-tertiary/20 font-bold text-label-md transition-all shrink-0 disabled:opacity-50"
          >
            {scanResolving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanLine className="w-4 h-4" />
            )}
            {scanResolving ? "Resolving…" : "Scan QR"}
          </button>

          <div className="relative flex-1">
            <input
              id="clinic-code-input"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g. DR3F2A"
              maxLength={6}
              autoComplete="off"
              className="w-full bg-surface-container-high rounded-[1.5rem] p-4 pr-12 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all font-manrope placeholder:text-outline-variant text-xl font-bold tracking-[0.25em] uppercase shadow-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {lookingUp ? (
                <Loader2 className="w-5 h-5 text-tertiary animate-spin" />
              ) : doctor ? (
                <CheckCircle2 className="w-5 h-5 text-secondary" />
              ) : (
                <Search className="w-5 h-5 text-outline" />
              )}
            </div>
          </div>
        </div>

        {codeError && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-error/10 text-error rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-label-md font-medium">{codeError}</p>
          </div>
        )}

        {doctor && (
          <div className="mt-4 p-5 bg-tertiary/5 border border-tertiary/20 rounded-[2rem] space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-md shadow-tertiary/20 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-manrope font-bold text-on-surface text-lg">{doctor.doctor_name || "Doctor"}</h3>
                {doctor.specialty && (
                  <p className="text-label-sm font-bold text-tertiary uppercase tracking-wider">{doctor.specialty}</p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-secondary ml-auto shrink-0" />
            </div>
            {(doctor.clinic_name || doctor.clinic_address) && (
              <div className="flex items-start gap-2 pt-2 border-t border-tertiary/15">
                <Building2 className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
                <div>
                  {doctor.clinic_name && <p className="text-body-md font-bold text-on-surface">{doctor.clinic_name}</p>}
                  {doctor.clinic_address && <p className="text-label-md text-on-surface-variant font-medium">{doctor.clinic_address}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {!doctor && !lookingUp && code.length < 6 && (
          <p className="text-label-sm text-on-surface-variant/60 font-medium mt-2 ml-1">
            Enter the 6-character code from your doctor&apos;s clinic card or QR
          </p>
        )}
      </div>

      {/* Step 2 revealed after valid code */}
      {doctor && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          {/* Date */}
          <div>
            <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              <CalendarDays className="w-3 h-3" /> Date *
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              min={getTodayISO()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all shadow-sm border border-outline-variant/10"
            />
          </div>

          {/* Time - clock picker */}
          <TimePicker value={estimatedTime} onChange={setEstimatedTime} />

          {/* Reason */}
          <div>
            <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              <FileText className="w-3 h-3" /> Reason
              <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe your symptoms or reason for visit..."
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all placeholder:text-outline-variant text-body-lg shadow-sm resize-none border border-outline-variant/10"
            />
          </div>

          {/* Packet */}
          <PacketSection
            createPacket={createPacket}
            setCreatePacket={setCreatePacket}
            records={records}
            selectedRecords={selectedRecords}
            setSelectedRecords={setSelectedRecords}
            includeHistory={includeHistory}
            setIncludeHistory={setIncludeHistory}
            recordsLoading={recordsLoading}
            doctorName={doctor.doctor_name || "Doctor"}
          />

          {submitError && (
            <div className="flex items-start gap-2 p-4 bg-error/10 text-error rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-label-md font-medium leading-relaxed">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !canSubmitUnicare}
            className="w-full bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex justify-center items-center gap-3"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirm Appointment <ChevronRight className="w-5 h-5" /></>}
          </button>
        </div>
      )}

      {!doctor && (
        <div className="flex items-center gap-3 p-5 bg-surface-container rounded-[1.5rem] border-2 border-dashed border-outline-variant/30 text-on-surface-variant">
          <Search className="w-5 h-5 shrink-0 opacity-40" />
          <p className="text-label-md font-medium">Enter a valid clinic code to continue</p>
        </div>
      )}
    </form>
  );

  // ── Render: General flow ──
  const renderGeneral = () => (
    <form onSubmit={handleSubmit} className="p-7 pt-4 overflow-y-auto no-scrollbar space-y-5 flex-1">
      {/* Title */}
      <div>
        <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          <FileText className="w-3 h-3" /> Title *
        </label>
        <input
          type="text"
          required
          value={genTitle}
          onChange={(e) => setGenTitle(e.target.value)}
          placeholder="e.g. Checkup with Dr. Mehra"
          className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-secondary/20 transition-all placeholder:text-outline-variant text-body-lg font-bold shadow-sm border border-outline-variant/10"
        />
      </div>

      {/* Doctor name (optional) */}
      <div>
        <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          <User className="w-3 h-3" /> Doctor Name
          <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
        </label>
        <input
          type="text"
          value={genDoctor}
          onChange={(e) => setGenDoctor(e.target.value)}
          placeholder="e.g. Dr. Priya Mehra"
          className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-secondary/20 transition-all placeholder:text-outline-variant text-body-lg shadow-sm border border-outline-variant/10"
        />
      </div>

      {/* Location (optional) */}
      <div>
        <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          <MapPin className="w-3 h-3" /> Clinic / Location
          <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
        </label>
        <input
          type="text"
          value={genLocation}
          onChange={(e) => setGenLocation(e.target.value)}
          placeholder="e.g. Apollo Clinic, Koramangala"
          className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-secondary/20 transition-all placeholder:text-outline-variant text-body-lg shadow-sm border border-outline-variant/10"
        />
      </div>

      {/* Date */}
      <div>
        <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          <CalendarDays className="w-3 h-3" /> Date *
        </label>
        <input
          type="date"
          required
          value={selectedDate}
          min={getTodayISO()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-secondary/20 transition-all shadow-sm border border-outline-variant/10"
        />
      </div>

      {/* Time - clock picker */}
      <TimePicker value={estimatedTime} onChange={setEstimatedTime} />

      {/* Reason */}
      <div>
        <label className="flex items-center gap-1.5 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
          <FileText className="w-3 h-3" /> Reason / Notes
          <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Describe symptoms, purpose of visit, or any other notes..."
          className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-secondary/20 transition-all placeholder:text-outline-variant text-body-lg shadow-sm resize-none border border-outline-variant/10"
        />
      </div>

      {submitError && (
        <div className="flex items-start gap-2 p-4 bg-error/10 text-error rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-label-md font-medium leading-relaxed">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !canSubmitGeneral}
        className="w-full bg-gradient-to-br from-secondary to-secondary-container text-on-secondary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex justify-center items-center gap-3"
      >
        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Save Appointment <ChevronRight className="w-5 h-5" /></>}
      </button>
    </form>
  );

  // ── Step label ──
  const stepLabel = () => {
    if (mode === "choose") return "Select booking type";
    if (mode === "unicare") return "UniCare — Enter clinic code";
    return "General — Fill appointment details";
  };

  // ── Step progress ──
  const stepProgress = () => {
    if (mode === "choose") return 0;
    if (mode === "unicare") return doctor ? 2 : 1;
    return 1;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Header */}
        <header className="p-7 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            {mode !== "choose" && (
              <button
                type="button"
                onClick={() => { setMode("choose"); setDoctor(null); setCode(""); setCodeError(null); setSubmitError(null); }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors mr-1"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
              mode === "general"
                ? "bg-gradient-to-br from-secondary/70 to-secondary text-on-secondary shadow-secondary/20"
                : "bg-gradient-to-br from-tertiary/70 to-tertiary text-on-tertiary shadow-tertiary/20"
            }`}>
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface">Book Appointment</h2>
              {activeProfile && (
                <p className="text-label-sm font-bold text-on-surface-variant/70">
                  For <span className={mode === "general" ? "text-secondary" : "text-tertiary"}>{activeProfile.name}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Progress bar */}
        {mode !== "choose" && (
          <div className="px-7 pb-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                  stepProgress() >= s
                    ? mode === "general" ? "bg-secondary" : "bg-tertiary"
                    : "bg-surface-container-high"
                }`} />
              ))}
            </div>
            <p className="text-label-sm font-bold text-on-surface-variant mt-2 uppercase tracking-wider">
              {stepLabel()}
            </p>
          </div>
        )}

        {/* Body */}
        {mode === "choose" && renderChooser()}
        {mode === "unicare" && renderUnicare()}
        {mode === "general" && renderGeneral()}
      </div>

      {/* Camera scanner overlay */}
      {showScanner && (
        <QrScannerModal
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
