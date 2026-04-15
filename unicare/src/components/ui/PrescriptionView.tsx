"use client";

import React, { useState } from "react";
import {
  X, Stethoscope, Pill, Clock, UtensilsCrossed, CalendarDays,
  FileText, Download, AlertCircle, Loader2, CheckCircle2, AlertTriangle,
  MapPin, StickyNote
} from "lucide-react";
import { Prescription, MedicationItem } from "@/services/appointmentsService";
import type { Appointment } from "@/services/appointmentsService";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";

interface PrescriptionViewProps {
  prescription: Prescription | null;
  /** Derived from the appointment, used for PDF context */
  appointment?: Appointment | null;
  doctorName?: string | null;
  patientName?: string | null;
  onClose: () => void;
}

function formatTiming(timing: string[]): string {
  return timing
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(", ");
}

function formatFood(food: MedicationItem["food"]): string {
  return food === "after" ? "After food" : "Before food";
}

// ─── Inline toast ─────────────────────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-label-md font-bold animate-in slide-in-from-bottom-2 duration-300 ${
        toast.type === "success"
          ? "bg-secondary/10 text-secondary border border-secondary/20"
          : "bg-error/10 text-error border border-error/20"
      }`}
    >
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

export default function PrescriptionView({
  prescription,
  appointment,
  doctorName,
  patientName,
  onClose,
}: PrescriptionViewProps) {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const consultDate = new Date(prescription?.created_at || appointment?.date || Date.now()).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const showToast = (t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDownloadPdf = async () => {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);
    try {
      await generatePrescriptionPdf({
        patientName,
        appointmentTitle: appointment?.title,
        appointmentDate: appointment?.date ?? prescription?.created_at,
        doctorName: doctorName ?? appointment?.doctor,
        location: appointment?.location,
        appointmentNotes: appointment?.notes,
        prescription,
      });
      showToast({ type: "success", message: "PDF downloaded successfully!" });
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast({ type: "error", message: "Failed to generate PDF. Please try again." });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <header className="p-7 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-secondary/70 to-secondary text-on-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface">Prescription</h2>
              <p className="text-label-sm font-bold text-on-surface-variant/70">
                {doctorName ? `Dr. ${doctorName}` : "Doctor"} · {consultDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              title="Download PDF"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed text-label-sm font-bold"
            >
              {isPdfGenerating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{isPdfGenerating ? "Generating…" : "PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-7 overflow-y-auto no-scrollbar space-y-6">
          {/* Toast */}
          <Toast toast={toast} />

          {/* Appointment context row */}
          {appointment && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-[1.5rem]">
                <Stethoscope className="w-5 h-5 text-tertiary shrink-0" />
                <div>
                  <p className="text-body-md font-bold text-on-surface">
                    {doctorName ? `Dr. ${doctorName}` : "Doctor"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant font-medium">{consultDate}</p>
                </div>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-[1.5rem]">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Location</p>
                    <p className="text-body-md font-bold text-on-surface">{appointment.location}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Appointment title / notes */}
          {appointment?.title && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/15 rounded-[1.5rem]">
              <CalendarDays className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Appointment</p>
                <p className="text-body-md font-bold text-on-surface">{appointment.title}</p>
              </div>
            </div>
          )}

          {appointment?.notes && (
            <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-[1.5rem]">
              <StickyNote className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
              <p className="text-body-md text-on-surface-variant font-medium leading-relaxed">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Without appointment context – show stethoscope row */}
          {!appointment && (
            <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-[1.5rem]">
              <Stethoscope className="w-5 h-5 text-tertiary shrink-0" />
              <div>
                <p className="text-body-md font-bold text-on-surface">
                  {doctorName ? `Dr. ${doctorName}` : "Doctor"}
                </p>
                <p className="text-label-sm text-on-surface-variant font-medium">{consultDate}</p>
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {prescription?.diagnosis && (
            <div className="section">
              <p className="flex items-center gap-1.5 text-label-md font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                <FileText className="w-3 h-3" /> Diagnosis
              </p>
              <div className="p-5 bg-primary/5 border border-primary/15 rounded-[1.5rem]">
                <p className="text-body-md text-on-surface font-medium leading-relaxed">
                  {prescription.diagnosis}
                </p>
              </div>
            </div>
          )}

          {/* Medications */}
          {prescription?.medications && prescription.medications.length > 0 ? (
            <div className="section">
              <p className="flex items-center gap-1.5 text-label-md font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                <Pill className="w-3 h-3" /> Medications
              </p>
              <div className="rounded-[1.5rem] overflow-hidden border border-outline-variant/30">
                {/* Table header */}
                <div className="grid grid-cols-12 bg-surface-container-low px-4 py-3 gap-2">
                  <p className="col-span-5 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Medicine</p>
                  <p className="col-span-3 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Timing</p>
                  <p className="col-span-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Food</p>
                  <p className="col-span-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Days</p>
                </div>
                {/* Rows */}
                {prescription.medications.map((med, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-12 px-4 py-4 gap-2 items-center ${
                      idx % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/50"
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                        <Pill className="w-3 h-3" />
                      </div>
                      <p className="text-label-md font-bold text-on-surface leading-tight">{med.name}</p>
                    </div>
                    <div className="col-span-3 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-on-surface-variant shrink-0" />
                      <p className="text-label-sm font-medium text-on-surface-variant">{formatTiming(med.timing)}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3 text-on-surface-variant shrink-0" />
                      <p className="text-label-sm font-medium text-on-surface-variant">{formatFood(med.food)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-tertiary/10 text-tertiary rounded-full text-label-sm font-bold">
                        {med.days}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-[1.5rem] text-on-surface-variant">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-label-md font-medium">No medications listed</p>
            </div>
          )}

          {/* General notes */}
          {prescription?.notes && (
            <div className="section">
              <p className="flex items-center gap-1.5 text-label-md font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                <CalendarDays className="w-3 h-3" /> Doctor&apos;s Notes
              </p>
              <div className="p-5 bg-surface-container-low border border-outline-variant/20 rounded-[1.5rem]">
                <p className="text-body-md text-on-surface-variant font-medium leading-relaxed">
                  {prescription.notes}
                </p>
              </div>
            </div>
          )}

          {/* Download button (bottom) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-secondary/10 to-tertiary/10 text-on-surface font-bold text-label-lg rounded-full border border-outline-variant/30 hover:from-secondary/20 hover:to-tertiary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPdfGenerating
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating PDF…</>
              : <><Download className="w-5 h-5" /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
