"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pill, Search, X, Loader2, Download, Eye, CalendarDays,
  Stethoscope, Filter, ChevronDown, FileText, AlertTriangle,
  CheckCircle2, Clock, CalendarCheck, SortDesc
} from "lucide-react";
import { format } from "date-fns";
import { useProfile } from "@/components/auth/ProfileContext";
import {
  getProfileAppointments,
  getPrescription,
  getAllProfilePrescriptions,
  Appointment,
  Prescription,
} from "@/services/appointmentsService";
import { getProfileRecords } from "@/services/recordsService";
import {
  classifyAppointmentPrescriptions,
  classifyDoctorUploadedPrescriptions,
  mergeAndSortPrescriptions,
  ClassifiedPrescription,
  PrescriptionSource,
} from "@/lib/prescriptionClassifier";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";
import PrescriptionView from "./PrescriptionView";

// ─── Filter / sort types ──────────────────────────────────────────────────────

type FilterTab = "all" | "appointment" | "doctor_upload";
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "appointment", label: "From Appointments" },
  { id: "doctor_upload", label: "Doctor Uploaded" },
];

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: PrescriptionSource }) {
  return source === "appointment" ? (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <CalendarCheck className="w-2.5 h-2.5" /> Appointment
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-tertiary/10 text-tertiary">
      <Stethoscope className="w-2.5 h-2.5" /> Doctor Upload
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3. rounded-2xl text-label-md font-bold shadow-ambient animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === "success"
          ? "bg-secondary/10 text-secondary border border-secondary/20 backdrop-blur-sm"
          : "bg-error/10 text-error border border-error/20 backdrop-blur-sm"
      }`}
    >
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── Prescription Detail Modal ────────────────────────────────────────────────

interface DetailModalProps {
  item: ClassifiedPrescription;
  patientName?: string | null;
  onClose: () => void;
}

function PrescriptionDetailModal({ item, patientName, onClose }: DetailModalProps) {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  // If appointment-sourced and has structured prescription, use PrescriptionView
  if (item.source === "appointment" && item.prescription) {
    return (
      <PrescriptionView
        prescription={item.prescription}
        appointment={item.appointment ?? undefined}
        doctorName={item.doctor}
        patientName={patientName}
        onClose={onClose}
      />
    );
  }

  // Doctor-uploaded record — show file viewer + download
  const record = item.record;
  const handleDownload = async () => {
    if (!record) return;
    setPdfGenerating(true);
    try {
      await generatePrescriptionPdf({
        patientName,
        recordTitle: record.title,
        recordDate: record.date,
        provider: record.provider,
        prescription: null,
      });
      showToast({ type: "success", message: "PDF downloaded!" });
    } catch {
      showToast({ type: "error", message: "Failed to download PDF." });
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <Toast toast={toast} />
      <div className="bg-surface-container-lowest w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <header className="p-7 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface line-clamp-1">
                {item.title}
              </h2>
              <p className="text-label-sm font-bold text-on-surface-variant/70">
                {item.doctor ?? "Unknown provider"} · {format(new Date(item.date), "dd MMM yyyy")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-7 space-y-4 overflow-y-auto no-scrollbar">
          {record && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-surface-container-low rounded-[1.5rem]">
                  <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Provider</p>
                  <p className="text-body-md font-bold text-on-surface">{record.provider || "—"}</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-[1.5rem]">
                  <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Date</p>
                  <p className="text-body-md font-bold text-on-surface">{format(new Date(record.date), "dd MMM yyyy")}</p>
                </div>
              </div>

              {record.notes && (
                <div className="p-4 bg-surface-container-low rounded-[1.5rem]">
                  <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-body-md text-on-surface">{record.notes}</p>
                </div>
              )}

              {record.tags && record.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {record.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-primary/8 text-primary text-label-sm font-bold border border-primary/15">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => window.open(record.file_url, "_blank")}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary/10 text-primary font-bold text-label-md hover:bg-primary/20 transition-all"
                >
                  <Eye className="w-4 h-4" /> View File
                </button>
                <button
                  onClick={handleDownload}
                  disabled={pdfGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-tertiary/10 text-tertiary font-bold text-label-md hover:bg-tertiary/20 transition-all disabled:opacity-50"
                >
                  {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {pdfGenerating ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Prescription Card ────────────────────────────────────────────────────────

interface PrescriptionCardProps {
  item: ClassifiedPrescription;
  patientName?: string | null;
  onView: (item: ClassifiedPrescription) => void;
}

function PrescriptionCard({ item, patientName, onView }: PrescriptionCardProps) {
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      await generatePrescriptionPdf({
        patientName,
        appointmentTitle: item.appointment?.title,
        appointmentDate: item.appointment?.date ?? (item.source === "appointment" ? item.date : undefined),
        doctorName: item.doctor,
        location: item.appointment?.location,
        appointmentNotes: item.appointment?.notes,
        prescription: item.prescription ?? null,
        recordTitle: item.record?.title,
        recordDate: item.record?.date,
        provider: item.record?.provider,
      });
    } catch {
      // swallow silently — main download feedback is in detail modal
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div
      onClick={() => onView(item)}
      className="group bg-surface-container-lowest rounded-[2rem] shadow-ambient border border-white/50 hover:border-tertiary/20 overflow-hidden transition-all cursor-pointer"
    >
      <div className="p-5 flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 ${
          item.source === "appointment"
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : "bg-tertiary/10 text-tertiary"
        }`}>
          {item.source === "appointment" ? <Pill className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-body-lg font-manrope font-bold text-on-surface truncate">{item.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge source={item.source} />
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant font-medium">
              <Clock className="w-3 h-3" />
              {format(new Date(item.date), "dd MMM yyyy")}
            </span>
            {item.doctor && (
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant font-medium">
                <Stethoscope className="w-3 h-3" />
                {item.source === "appointment" ? `Dr. ${item.doctor}` : item.doctor}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* View */}
          <button
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {/* Download PDF */}
          <button
            onClick={handleQuickDownload}
            disabled={pdfGenerating}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-tertiary hover:bg-tertiary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF"
          >
            {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function PrescriptionsSection() {
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ClassifiedPrescription[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ClassifiedPrescription | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  const loadPrescriptions = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    setAllItems([]);
    try {
      // Fetch all data concurrently
      const [appointments, records] = await Promise.all([
        getProfileAppointments(activeProfile.id),
        getProfileRecords(activeProfile.id),
      ]);

      // ── Path 1: appointment-linked prescriptions (existing, unchanged) ──
      const completedAppts = appointments.filter((a) => a.status === "completed");
      const prescriptionResults = await Promise.all(
        completedAppts.map((a) =>
          getPrescription(a.id, a.profile_id).catch(() => null)
        )
      );
      const appointmentLinked = prescriptionResults.filter((p): p is Prescription => p !== null);

      // ── Path 2: profile-level fallback — surfaces walk-in / QR / UC-code ──
      const allProfilePrescriptions = await getAllProfilePrescriptions(activeProfile.id);

      // ── Merge + dedupe by prescription.id (stable PK, appointment-linked wins) ──
      const seen = new Set<string>();
      const merged: Prescription[] = [...appointmentLinked, ...allProfilePrescriptions].filter((rx) => {
        if (seen.has(rx.id)) return false;
        seen.add(rx.id);
        return true;
      });

      const apptRx = classifyAppointmentPrescriptions(appointments, merged);
      const uploadedRx = classifyDoctorUploadedPrescriptions(records);
      const sortedItems = mergeAndSortPrescriptions(apptRx, uploadedRx);

      setAllItems(sortedItems);
    } catch (err) {
      console.error("Failed to load prescriptions:", err);
      showToast({ type: "error", message: "Failed to load prescriptions." });
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  // ── Filtering & search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = allItems;

    if (filterTab !== "all") {
      result = result.filter((item) => item.source === filterTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.doctor ?? "").toLowerCase().includes(q) ||
          (item.appointment?.title ?? "").toLowerCase().includes(q) ||
          (item.record?.provider ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allItems, filterTab, searchQuery]);

  const tabCounts: Record<FilterTab, number> = useMemo(() => ({
    all: allItems.length,
    appointment: allItems.filter((i) => i.source === "appointment").length,
    doctor_upload: allItems.filter((i) => i.source === "doctor_upload").length,
  }), [allItems]);

  const emptyMessage =
    filterTab === "appointment"
      ? { title: "No appointment prescriptions", sub: "Completed visits with prescriptions will appear here." }
      : filterTab === "doctor_upload"
      ? { title: "No uploaded prescriptions", sub: "Prescription records uploaded by your doctor will appear here." }
      : { title: "No prescriptions yet", sub: "Your prescription records from appointments and doctors will appear here." };

  return (
    <div className="font-sans mt-10 mb-2 w-full">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-display-sm font-manrope font-bold text-on-surface mb-1">Prescriptions</h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            {loading ? "Loading…" : `${allItems.length} prescription${allItems.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-tertiary/20 text-tertiary flex items-center justify-center">
          <Pill className="w-6 h-6" />
        </div>
      </div>

      {/* Search */}
      <div className="relative group mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search by title, doctor, or provider…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low rounded-full py-3.5 pl-11 pr-10 text-label-md font-bold focus:outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl mb-5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-label-md font-bold transition-all ${
              filterTab === tab.id
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filterTab === tab.id
                  ? "bg-tertiary/10 text-tertiary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sort indicator */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <SortDesc className="w-3.5 h-3.5 text-on-surface-variant" />
        <span className="text-label-sm text-on-surface-variant font-medium">Newest first</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest rounded-[3rem] shadow-ambient border border-white/50">
          <Loader2 className="w-10 h-10 text-tertiary animate-spin mb-4" />
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Loading prescriptions…</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <PrescriptionCard
              key={item.key}
              item={item}
              patientName={activeProfile?.name}
              onView={setSelectedItem}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/30">
          <Pill className="w-12 h-12 text-outline mx-auto mb-4 opacity-30" />
          <p className="text-body-lg font-bold text-on-surface mb-1">{emptyMessage.title}</p>
          <p className="text-body-md text-on-surface-variant">{emptyMessage.sub}</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <PrescriptionDetailModal
          item={selectedItem}
          patientName={activeProfile?.name}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
