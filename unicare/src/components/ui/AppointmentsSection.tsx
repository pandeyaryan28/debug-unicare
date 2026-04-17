"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Clock, Stethoscope, Building2, Eye, Download, Info, CheckCircle2, Trash2 } from "lucide-react";
import {
  Appointment,
  cancelAppointment,
  Prescription,
  getPrescription,
  parseEstimatedTime,
} from "@/services/appointmentsService";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";
import PrescriptionView from "./PrescriptionView";
import BookAppointmentModal from "./BookAppointmentModal";

interface AppointmentsSectionProps {
  pastAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  loading: boolean;
  onRefresh: () => void;
  patientName: string;
  openBookingOnLoad?: boolean;
  initialClinicCode?: string;
}

export default function AppointmentsSection({
  pastAppointments,
  upcomingAppointments,
  loading,
  onRefresh,
  patientName,
  openBookingOnLoad = false,
  initialClinicCode,
}: AppointmentsSectionProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(openBookingOnLoad);

  useEffect(() => {
    if (openBookingOnLoad) {
      setShowBookingModal(true);
    }
  }, [openBookingOnLoad]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalPrescription, setModalPrescription] = useState<Prescription | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState(false);

  // For individual card PDF downloads
  const [downloadingPdfFor, setDownloadingPdfFor] = useState<string | null>(null);

  // Group appointments
  const pendingAppointments = upcomingAppointments.filter((a) => a.status === "upcoming" || a.status === "confirmed");
  const checkedInAppointments = upcomingAppointments.filter((a) => a.status === "checked_in");

  const handleCancelClick = async (appointment: Appointment) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      setCancellingId(appointment.id);
      await cancelAppointment(appointment.id);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  const loadAndShowPrescription = async (appointment: Appointment) => {
    try {
      setSelectedAppointment(appointment);
      setViewingPrescription(true);
      const rx = await getPrescription(appointment.id, appointment.profile_id);
      setModalPrescription(rx);
    } catch (err) {
      console.error("Error loading prescription details:", err);
      setModalPrescription(null);
    }
  };

  const handleDownloadPdf = async (appointment: Appointment) => {
    try {
      setDownloadingPdfFor(appointment.id);
      const rx = await getPrescription(appointment.id, appointment.profile_id);

      const { cleanNotes } = parseEstimatedTime(appointment.notes);

      await generatePrescriptionPdf({
        appointmentTitle: appointment.title,
        appointmentDate: appointment.date,
        doctorName: appointment.doctor ?? null,
        location: appointment.location ?? null,
        appointmentNotes: cleanNotes ?? null,
        patientName,
        prescription: rx,
        recordTitle: undefined,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingPdfFor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Booking CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-display-sm font-manrope font-bold text-on-surface">Appointments</h2>
          <p className="text-body-lg text-on-surface-variant font-medium mt-1">Manage your clinic visits and online consultations</p>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-tertiary text-on-tertiary rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all text-label-lg"
        >
          <Plus className="w-5 h-5" /> Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-full w-full max-w-sm border border-outline-variant/20">
        <button
          className={`flex-1 py-3 text-label-md font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
            activeTab === "upcoming"
              ? "bg-surface-container-lowest text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50"
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming
          {upcomingAppointments.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === "upcoming" ? "bg-tertiary/15 text-tertiary" : "bg-outline-variant/20"
            }`}>
              {upcomingAppointments.length}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-3 text-label-md font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
            activeTab === "past"
              ? "bg-surface-container-lowest text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50"
          }`}
          onClick={() => setActiveTab("past")}
        >
          Past
        </button>
      </div>

      {/* Content */}
      <div className="relative min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-on-surface-variant bg-surface-container-lowest/50 backdrop-blur-sm z-10 rounded-[2rem]">
            <Loader2 className="w-10 h-10 animate-spin text-tertiary" />
            <p className="text-label-lg font-bold">Loading appointments...</p>
          </div>
        ) : activeTab === "upcoming" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {checkedInAppointments.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-label-md font-bold uppercase tracking-widest text-on-surface-variant ml-2">Checked In</h3>
                {checkedInAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    isPast={false}
                    onCancel={() => handleCancelClick(appt)}
                    isCancelling={cancellingId === appt.id}
                  />
                ))}
              </div>
            )}
            
            {pendingAppointments.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-label-md font-bold uppercase tracking-widest text-on-surface-variant ml-2">Pending / Confirmed</h3>
                {pendingAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    isPast={false}
                    onCancel={() => handleCancelClick(appt)}
                    isCancelling={cancellingId === appt.id}
                  />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-[2.5rem] border border-outline-variant/20 mt-4">
                <div className="w-20 h-20 rounded-3xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10" />
                </div>
                <h3 className="text-headline-sm font-manrope font-bold text-on-surface mb-2">No upcoming visits</h3>
                <p className="text-body-lg text-on-surface-variant max-w-sm mx-auto mb-6">You don&apos;t have any appointments scheduled right now.</p>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="px-6 py-3 bg-surface-container-high border border-outline-variant/20 rounded-full text-label-lg font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  Book an Appointment
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {pastAppointments.length > 0 ? (
              pastAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  isPast={true}
                  onViewPrescription={() => loadAndShowPrescription(appt)}
                  onDownloadPdf={() => handleDownloadPdf(appt)}
                  isDownloadingPdf={downloadingPdfFor === appt.id}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-[2.5rem] border border-outline-variant/20 mt-4">
                <div className="w-20 h-20 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-headline-sm font-manrope font-bold text-on-surface mb-2">No history</h3>
                <p className="text-body-lg text-on-surface-variant max-w-sm mx-auto">Your past appointments and prescriptions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showBookingModal && (
        <BookAppointmentModal
          onClose={() => setShowBookingModal(false)}
          onSuccess={onRefresh}
          initialClinicCode={initialClinicCode}
        />
      )}

      {viewingPrescription && selectedAppointment && (
        <PrescriptionView
          onClose={() => {
            setViewingPrescription(false);
            setSelectedAppointment(null);
            setModalPrescription(null);
          }}
          appointment={selectedAppointment}
          prescription={modalPrescription}
          patientName={patientName}
        />
      )}
    </div>
  );
}

// ─── Child Component: Card ───────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  isPast,
  onCancel,
  isCancelling,
  onViewPrescription,
  onDownloadPdf,
  isDownloadingPdf,
}: {
  appointment: Appointment;
  isPast: boolean;
  onCancel?: () => void;
  isCancelling?: boolean;
  onViewPrescription?: () => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
}) {
  const dateObj = new Date(appointment.date);
  const isCancelled = appointment.status === "cancelled";
  
  // Parse estimated time from notes
  const { time: estTimeStr, cleanNotes } = parseEstimatedTime(appointment.notes);

  return (
    <div className={`p-6 bg-surface-container-lowest rounded-[2.5rem] border transition-all ${
      isCancelled 
        ? "border-outline-variant/10 opacity-75" 
        : isPast 
          ? "border-outline-variant/20 hover:border-outline-variant/40" 
          : "border-tertiary/10 shadow-sm hover:shadow-md hover:border-tertiary/30"
    }`}>
      {appointment.status === "checked_in" && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/10 text-secondary rounded-2xl animate-pulse">
          <Info className="w-4 h-4 shrink-0" />
          <p className="text-label-sm font-bold uppercase tracking-wider">You are checked in. Queue active.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-5">
        {/* Left: Date Badge */}
        <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-3xl shrink-0 ${
          isCancelled ? "bg-surface-container-high text-on-surface-variant" :
          isPast ? "bg-surface-container-low text-on-surface variant border border-outline-variant/20" :
          "bg-tertiary/10 text-tertiary"
        }`}>
          <span className="text-label-sm font-bold uppercase tracking-wide opacity-80">{format(dateObj, "MMM")}</span>
          <span className="text-headline-md font-bold">{format(dateObj, "dd")}</span>
        </div>

        {/* Center: Details */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-manrope font-bold text-title-lg ${isCancelled ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
              {appointment.title}
            </h3>
            {/* Status Pill */}
            {!isCancelled && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                appointment.status === "completed" ? "bg-secondary/10 text-secondary" :
                appointment.status === "upcoming" ? "bg-tertiary/10 text-tertiary" :
                appointment.status === "confirmed" ? "bg-primary/10 text-primary" :
                "bg-surface-container-high text-on-surface-variant"
              }`}>
                {appointment.status}
              </span>
            )}
            {isCancelled && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error/10 text-error">
                Cancelled
              </span>
            )}
            {/* Platform marker */}
            {appointment.doctor_id && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> UniCare
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-label-md font-medium text-on-surface-variant">
            {/* Time (estimated or scheduled) */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 opacity-70" />
              <span>
                {estTimeStr ? (
                  <>~{format(new Date(`1970-01-01T${estTimeStr}:00`), "h:mm a")} <span className="opacity-60 text-xs">(est.)</span></>
                ) : (
                  format(dateObj, "h:mm a")
                )}
              </span>
            </div>
            {/* Doctor */}
            {appointment.doctor && (
              <div className="flex items-center gap-2 truncate max-w-[200px]">
                <Stethoscope className="w-4 h-4 opacity-70" />
                <span className="truncate">{appointment.doctor}</span>
              </div>
            )}
            {/* Location */}
            {appointment.location && (
              <div className="flex items-center gap-2 truncate max-w-[200px]">
                <Building2 className="w-4 h-4 opacity-70" />
                <span className="truncate">{appointment.location}</span>
              </div>
            )}
          </div>

          {cleanNotes && (
            <p className="text-body-md text-on-surface-variant line-clamp-2 mt-2 p-3 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl italic">
              &quot;{cleanNotes}&quot;
            </p>
          )}

          {/* Action Row */}
          {!isCancelled && (
            <div className="pt-2 flex flex-wrap gap-3">
              {isPast && appointment.status === "completed" && onViewPrescription && onDownloadPdf && (
                <>
                  <button
                    onClick={onViewPrescription}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary rounded-full font-bold text-label-sm transition-all"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button
                    onClick={onDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant/20 text-on-surface hover:bg-surface-container-highest rounded-full font-bold text-label-sm transition-all disabled:opacity-50"
                  >
                    {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    Prescription PDF
                  </button>
                </>
              )}
              
              {!isPast && onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="mt-auto ml-0 sm:ml-auto flex items-center gap-2 px-4 py-2 text-error hover:bg-error/10 rounded-full font-bold text-label-sm transition-colors disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
