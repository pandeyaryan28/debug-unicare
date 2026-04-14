"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, QrCode, Search, Loader2, AlertCircle, CheckCircle2,
  Stethoscope, MapPin, Building2, CalendarDays, Clock, FileText,
  ChevronRight, FolderHeart, ShieldCheck
} from "lucide-react";
import { lookupClinicCode, createAppointment, ClinicCode } from "@/services/appointmentsService";
import { getUserRecords, HealthRecord, createPacketLink } from "@/services/recordsService";
import { useProfile } from "../auth/ProfileContext";

interface BookAppointmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Generate 30-min time slots from 06:00 to 22:00
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function getTodayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function BookAppointmentModal({ onClose, onSuccess }: BookAppointmentModalProps) {
  const { activeProfile } = useProfile();

  // Step 1 – code
  const [code, setCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [codeError, setCdeError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<ClinicCode | null>(null);

  // Step 2 – date / time / reason
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Packet state
  const [createPacket, setCreatePacket] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setRecordsLoading(true);
      getUserRecords().then(data => {
        setRecords(data);
        setRecordsLoading(false);
      }).catch(() => setRecordsLoading(false));
    }
  }, [activeProfile]);

  // Auto-uppercase & lookup after typing stops
  const handleCodeChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
    setCdeError(null);
    setDoctor(null);

    if (val.length === 6) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => handleLookup(val), 300);
    }
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleLookup = async (codeVal = code) => {
    if (codeVal.length !== 6) { setCdeError("Enter the full 6-character clinic code."); return; }
    setLookingUp(true);
    setCdeError(null);
    try {
      const result = await lookupClinicCode(codeVal);
      if (!result) { setCdeError("Clinic code not found. Check with your doctor's clinic."); setDoctor(null); }
      else setDoctor(result);
    } catch {
      setCdeError("Something went wrong. Please try again.");
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !activeProfile) return;

    // Build ISO datetime in local IST → convert to UTC
    const localISOString = `${selectedDate}T${selectedTime}:00`;
    // Treat as IST (UTC+5:30) by subtracting 5.5h
    const localDate = new Date(localISOString + "+05:30");

    if (localDate <= new Date()) {
      setSubmitError("Please choose a future date and time.");
      return;
    }

    try {
      setSaving(true);
      setSubmitError(null);

      let packetId: string | undefined = undefined;
      // Handle packet creation if requested
      if (createPacket && selectedRecords.length > 0) {
        try {
          packetId = await createPacketLink(
            `Packet for: Appointment with Dr. ${doctor.doctor_name || "Doctor"}`,
            selectedRecords,
            24, // 24 hours for appointments
            activeProfile.id,
            includeHistory
          );
        } catch (packetErr) {
          console.error("Failed to create packet:", packetErr);
        }
      }

      await createAppointment({
        profileId: activeProfile.id,
        title: `Appointment with Dr. ${doctor.doctor_name || "Doctor"}`,
        doctor: doctor.doctor_name || undefined,
        doctorId: doctor.doctor_id,
        location: doctor.clinic_name || undefined,
        date: localDate,
        notes: reason.trim() || undefined,
        status: "upcoming",
        packetId,
        timezone: "Asia/Kolkata",
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        setSubmitError("This doctor already has an appointment at this time. Please choose a different slot.");
      } else {
        setSubmitError(msg || "Failed to book appointment.");
      }
    } finally {
      setSaving(false);
    }
  };

  const step = doctor ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <header className="p-7 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary flex items-center justify-center shadow-lg shadow-tertiary/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface">Book Appointment</h2>
              {activeProfile && (
                <p className="text-label-sm font-bold text-on-surface-variant/70">
                  For <span className="text-tertiary">{activeProfile.name}</span>
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

        {/* Step indicator */}
        <div className="px-7 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= 1 ? "bg-tertiary" : "bg-surface-container-high"}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= 2 ? "bg-tertiary" : "bg-surface-container-high"}`} />
          </div>
          <p className="text-label-sm font-bold text-on-surface-variant mt-2.5 uppercase tracking-wider">
            {step === 1 ? "Step 1 — Enter clinic code" : "Step 2 — Pick a time"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-7 pt-4 overflow-y-auto no-scrollbar space-y-5 flex-1">

          {/* ── STEP 1: Clinic Code ── */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Clinic Code
            </label>
            <div className="relative">
              <input
                id="clinic-code-input"
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="e.g. DR3F2A"
                maxLength={6}
                autoComplete="off"
                className="w-full bg-surface-container-high rounded-[1.5rem] p-5 pr-14 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all font-manrope placeholder:text-outline-variant text-2xl font-bold tracking-[0.3em] uppercase shadow-sm"
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

            {codeError && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-error/10 text-error rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-label-md font-medium">{codeError}</p>
              </div>
            )}

            {/* Doctor Info Card */}
            {doctor && (
              <div className="mt-4 p-5 bg-gradient-to-br from-tertiary/5 to-tertiary/10 border border-tertiary/20 rounded-[2rem] space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
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

            {/* Hint to re-lookup if code is 6 chars but no doctor shown */}
            {!doctor && !lookingUp && code.length < 6 && (
              <p className="text-label-sm text-on-surface-variant/60 font-medium mt-2 ml-1">
                Enter the 6-character code from your doctor's clinic card or QR
              </p>
            )}
          </div>

          {/* ── STEP 2: Date, Time, Reason (revealed after valid code) ── */}
          {doctor && (
            <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
              {/* Date */}
              <div>
                <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3" /> Date *
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  min={getTodayISO()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all font-inter shadow-sm"
                />
              </div>

              {/* Time slots */}
              <div>
                <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Time *
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {TIME_SLOTS.map((slot) => {
                    const [h] = slot.split(":").map(Number);
                    const label = new Date(`2000-01-01T${slot}:00`).toLocaleTimeString("en-IN", {
                      hour: "numeric", minute: "2-digit", hour12: true,
                    });
                    // Disable past slots for today
                    const isToday = selectedDate === getTodayISO();
                    const nowH = new Date().getHours();
                    const nowM = new Date().getMinutes();
                    const slotM = slot.endsWith(":30") ? 30 : 0;
                    const isPast = isToday && (h < nowH || (h === nowH && slotM <= nowM));

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isPast}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2.5 px-1 rounded-2xl text-label-sm font-bold text-center transition-all ${
                          selectedTime === slot
                            ? "bg-tertiary text-on-tertiary shadow-md shadow-tertiary/25 scale-105"
                            : isPast
                            ? "bg-surface-container text-outline/40 cursor-not-allowed"
                            : "bg-surface-container-high text-on-surface hover:bg-tertiary/10 hover:text-tertiary"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Reason{" "}
                  <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Describe your symptoms or reason for visit..."
                  className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-4 focus:ring-tertiary/20 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm resize-none"
                />
              </div>

              {/* Packet Integration */}
              <div className="pt-4 border-t border-outline-variant/30 space-y-4">
                <button
                  type="button"
                  onClick={() => setCreatePacket(!createPacket)}
                  className={`w-full flex items-center justify-between p-6 rounded-[2rem] transition-all border ${
                    createPacket 
                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                      : "bg-surface-container-low border-white/40 hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center space-x-4 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      createPacket ? "bg-primary text-white" : "bg-tertiary/10 text-tertiary"
                    }`}>
                      <FolderHeart className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Auto-Link Visit Packet</h4>
                      <p className="text-body-xs text-on-surface-variant font-medium">Bundle records for the doctor to scan</p>
                    </div>
                  </div>
                  {createPacket ? (
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-outline-variant" />
                  )}
                </button>

                {createPacket && (
                  <div className="bg-surface-container-low rounded-[2rem] p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Select Reports ({selectedRecords.length})</p>
                      {recordsLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                      {records.map(record => (
                        <div
                          key={record.id}
                          onClick={() => setSelectedRecords(prev => 
                            prev.includes(record.id) ? prev.filter(i => i !== record.id) : [...prev, record.id]
                          )}
                          className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                            selectedRecords.includes(record.id)
                              ? "bg-white border-primary/20 shadow-sm"
                              : "hover:bg-white/40 border-transparent"
                          }`}
                        >
                           <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                             selectedRecords.includes(record.id) ? "bg-primary border-primary text-white" : "border-outline-variant"
                           }`}>
                             {selectedRecords.includes(record.id) && <CheckCircle2 className="w-3 h-3" />}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-body-sm font-bold truncate text-on-surface">{record.title}</p>
                             <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-60">
                               {new Date(record.date).toLocaleDateString()}
                             </p>
                           </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIncludeHistory(!includeHistory)}
                      className="flex items-center space-x-3 w-full p-4 rounded-3xl bg-white/40 border border-white/60 text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        includeHistory ? "bg-secondary text-white" : "bg-secondary/10 text-secondary"
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-label-sm font-bold text-on-surface">Share Medical History</p>
                        <p className="text-[10px] text-on-surface-variant leading-tight">Surgeries, vaccinations, and chronic conditions</p>
                      </div>
                      {includeHistory ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-outline-variant" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-4 bg-error/10 text-error rounded-2xl">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-label-md font-medium leading-relaxed">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !selectedDate || !selectedTime}
                className="w-full bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex justify-center items-center gap-3"
              >
                {saving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Confirm Appointment <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* If no doctor yet, show a disabled submit placeholder */}
          {!doctor && (
            <div className="flex items-center gap-3 p-5 bg-surface-container rounded-[1.5rem] border-2 border-dashed border-outline-variant/30 text-on-surface-variant">
              <QrCode className="w-5 h-5 shrink-0 opacity-40" />
              <p className="text-label-md font-medium">Enter a valid clinic code to continue</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
