"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar, Plus, MapPin, Stethoscope, Clock, Loader2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Link as LinkIcon,
  ExternalLink, FolderHeart, ShieldCheck, AlertTriangle, Pill,
  BellRing
} from "lucide-react";
import { format } from "date-fns";
import {
  getProfileAppointments,
  cancelAppointment,
  getPrescription,
  Appointment,
  Prescription,
} from "@/services/appointmentsService";
import { supabase } from "@/lib/supabase";
import { useProfile } from "../auth/ProfileContext";
import BookAppointmentModal from "./BookAppointmentModal";
import PrescriptionView from "./PrescriptionView";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  upcoming: {
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Upcoming",
  },
  confirmed: {
    chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Confirmed",
  },
  checked_in: {
    chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    icon: <BellRing className="w-3.5 h-3.5" />,
    label: "Checked In",
  },
  completed: {
    chip: "bg-secondary/10 text-secondary",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Completed",
  },
  cancelled: {
    chip: "bg-error/10 text-error",
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Cancelled",
  },
} as const;

type TabId = "upcoming" | "active" | "past";
const TABS: { id: TabId; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "past", label: "Past" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateOnlyIST(iso: string) {
  const d = new Date(iso);
  return { month: format(d, "MMM"), day: format(d, "d") };
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

interface CardProps {
  appt: Appointment;
  onCancel: (id: string) => void;
  onViewPrescription: (appt: Appointment) => void;
  copiedId: string | null;
  onCopy: (id: string, packetId: string) => void;
  cancelling: string | null;
}

function AppointmentCard({ appt, onCancel, onViewPrescription, copiedId, onCopy, cancelling }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.upcoming;
  const { month, day } = formatDateOnlyIST(appt.date);
  const canCancel = appt.status === "upcoming" || appt.status === "confirmed";

  return (
    <div
      className={`group bg-surface-container-lowest rounded-[2rem] shadow-ambient border overflow-hidden transition-all ${
        appt.status === "checked_in"
          ? "border-purple-400/40 ring-2 ring-purple-400/20"
          : "border-white/50 hover:border-tertiary/20"
      }`}
    >
      {/* Checked-in banner */}
      {appt.status === "checked_in" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-purple-500/10 border-b border-purple-400/20">
          <BellRing className="w-4 h-4 text-purple-600 dark:text-purple-300 animate-pulse" />
          <p className="text-label-md font-bold text-purple-700 dark:text-purple-300">
            You&apos;re checked in — waiting for the doctor
          </p>
        </div>
      )}

      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          {/* Date badge */}
          <div className="w-14 h-14 rounded-2xl bg-tertiary/10 text-tertiary flex flex-col items-center justify-center shrink-0 group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{month}</span>
            <span className="text-xl font-manrope font-bold leading-none">{day}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-body-lg font-manrope font-bold text-on-surface truncate">{appt.title}</h3>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-bold ${cfg.chip}`}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="text-label-sm text-on-surface-variant font-medium">
                {formatDateIST(appt.date)}
              </span>
              {appt.doctor && (
                <span className="flex items-center gap-1 text-label-sm text-on-surface-variant font-medium">
                  <Stethoscope className="w-3 h-3" /> {appt.doctor}
                </span>
              )}
            </div>
          </div>

          <button className="text-on-surface-variant transition-transform">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-surface-container-high pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {appt.location && (
            <p className="flex items-center gap-2 text-body-md text-on-surface-variant font-medium">
              <MapPin className="w-4 h-4 text-tertiary shrink-0" /> {appt.location}
            </p>
          )}
          {appt.notes && (
            <p className="text-body-md text-on-surface-variant font-medium leading-relaxed bg-surface-container-low p-4 rounded-2xl">
              {appt.notes}
            </p>
          )}

          {/* Visit packet */}
          {appt.packet_id && (
            <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <FolderHeart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-label-md font-bold text-on-surface">Visit Packet Linked</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium">Ready for doctor review</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onCopy(appt.id, appt.packet_id!); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-highest text-on-surface rounded-full text-label-sm font-bold border border-white/40 hover:bg-white transition-all min-w-[70px] justify-center"
                >
                  {copiedId === appt.id ? (
                    <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="w-3 h-3" /> Copied</span>
                  ) : (
                    <><LinkIcon className="w-3 h-3" /> Copy</>
                  )}
                </button>
                <a
                  href={`/share/packet/${appt.packet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-on-surface text-surface rounded-full text-label-sm font-bold shadow-md hover:scale-105 transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> View
                </a>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1 flex-wrap">
            {/* View Prescription — only for completed */}
            {appt.status === "completed" && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewPrescription(appt); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary rounded-full text-label-md font-bold hover:bg-secondary/20 transition-colors"
              >
                <Pill className="w-4 h-4" /> View Prescription
              </button>
            )}

            {/* Cancel — only for upcoming / confirmed */}
            {canCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(appt.id); }}
                disabled={cancelling === appt.id}
                className="flex items-center gap-2 px-4 py-2.5 bg-error/10 text-error rounded-full text-label-md font-bold hover:bg-error/20 transition-colors ml-auto disabled:opacity-50"
              >
                {cancelling === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppointmentsSection() {
  const { activeProfile } = useProfile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("upcoming");
  const [isBooking, setIsBooking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [viewPrescription, setViewPrescription] = useState<{
    appt: Appointment; data: Prescription | null; loading: boolean;
  } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const data = await getProfileAppointments(activeProfile.id);
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  // Initial fetch
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Realtime subscription
  useEffect(() => {
    if (!activeProfile) return;

    channelRef.current = supabase
      .channel(`appointments-live-${activeProfile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `profile_id=eq.${activeProfile.id}`,
        },
        (payload) => {
          setAppointments((prev) =>
            prev.map((a) =>
              a.id === payload.new.id ? { ...a, ...(payload.new as Appointment) } : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeProfile?.id]);

  // Tabs filter
  const upcomingAppts = appointments.filter(
    (a) => a.status === "upcoming" || a.status === "confirmed"
  );
  const activeAppts = appointments.filter((a) => a.status === "checked_in");
  const pastAppts = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  const tabData: Record<TabId, Appointment[]> = {
    upcoming: upcomingAppts,
    active: activeAppts,
    past: pastAppts,
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    setCancelling(id);
    try {
      await cancelAppointment(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
      );
    } finally {
      setCancelling(null);
    }
  };

  const handleCopy = (id: string, packetId: string) => {
    const link = `${window.location.origin}/share/packet/${packetId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewPrescription = async (appt: Appointment) => {
    setViewPrescription({ appt, data: null, loading: true });
    const data = await getPrescription(appt.id, appt.profile_id);
    setViewPrescription({ appt, data, loading: false });
  };

  const displayed = tabData[activeTab];

  const emptyMessages: Record<TabId, { title: string; sub: string }> = {
    upcoming: { title: "No upcoming appointments", sub: "Book one to stay ahead of your health" },
    active: { title: "No active visits", sub: "You're not checked in anywhere right now" },
    past: { title: "No past appointments", sub: "Your completed visits will appear here" },
  };

  return (
    <div className="font-sans mt-10 mb-2 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-display-sm font-manrope font-bold text-on-surface mb-1">Appointments</h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            {upcomingAppts.length} upcoming · {activeAppts.length} active · {pastAppts.length} past
          </p>
        </div>
        <button
          onClick={() => setIsBooking(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary rounded-full shadow-ambient hover:scale-105 active:scale-95 transition-all font-bold text-label-md"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Book</span>
        </button>
      </div>

      {/* Active visit alert */}
      {activeAppts.length > 0 && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-400/30 rounded-[1.5rem] animate-in fade-in duration-300">
          <BellRing className="w-5 h-5 text-purple-600 dark:text-purple-300 animate-pulse shrink-0" />
          <div>
            <p className="text-label-md font-bold text-purple-700 dark:text-purple-200">
              You have an active clinic visit
            </p>
            <p className="text-label-sm text-purple-600/80 dark:text-purple-300/70 font-medium">
              {activeAppts[0].doctor ? `Waiting for Dr. ${activeAppts[0].doctor}` : "Waiting for the doctor"}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl mb-5">
        {TABS.map((tab) => {
          const count = tabData[tab.id].length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-label-md font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? tab.id === "active"
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                      : "bg-tertiary/10 text-tertiary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest rounded-[3rem] shadow-ambient border border-white/50">
          <Loader2 className="w-10 h-10 text-tertiary animate-spin mb-4" />
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Loading...</p>
        </div>
      ) : displayed.length > 0 ? (
        <div className="space-y-3">
          {displayed.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              onCancel={handleCancel}
              onViewPrescription={handleViewPrescription}
              copiedId={copiedId}
              onCopy={handleCopy}
              cancelling={cancelling}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/30">
          {activeTab === "active" ? (
            <ShieldCheck className="w-12 h-12 text-outline mx-auto mb-4 opacity-30" />
          ) : activeTab === "past" ? (
            <AlertTriangle className="w-12 h-12 text-outline mx-auto mb-4 opacity-30" />
          ) : (
            <Calendar className="w-12 h-12 text-outline mx-auto mb-4 opacity-30" />
          )}
          <p className="text-body-lg font-bold text-on-surface mb-1">{emptyMessages[activeTab].title}</p>
          <p className="text-body-md text-on-surface-variant">{emptyMessages[activeTab].sub}</p>
          {activeTab === "upcoming" && (
            <button
              onClick={() => setIsBooking(true)}
              className="mt-6 px-6 py-3 bg-tertiary text-on-tertiary rounded-full font-bold text-label-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Book Now
            </button>
          )}
        </div>
      )}

      {/* Book modal */}
      {isBooking && (
        <BookAppointmentModal
          onClose={() => setIsBooking(false)}
          onSuccess={fetchAppointments}
        />
      )}

      {/* Prescription modal */}
      {viewPrescription && (
        viewPrescription.loading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-container-lowest rounded-[2rem] p-10 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-tertiary animate-spin" />
              <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Loading prescription...</p>
            </div>
          </div>
        ) : viewPrescription.data ? (
          <PrescriptionView
            prescription={viewPrescription.data}
            doctorName={viewPrescription.appt.doctor}
            onClose={() => setViewPrescription(null)}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setViewPrescription(null)}>
            <div className="bg-surface-container-lowest rounded-[2rem] p-10 flex flex-col items-center gap-4 max-w-sm text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-body-lg font-bold text-on-surface">Prescription not available</p>
              <p className="text-body-md text-on-surface-variant">The doctor hasn't submitted a prescription yet for this visit.</p>
              <button onClick={() => setViewPrescription(null)} className="mt-2 px-6 py-3 bg-surface-container-high text-on-surface rounded-full font-bold">Close</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
