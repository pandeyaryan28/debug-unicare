"use client";

import React, { useState } from "react";
import { X, CalendarPlus, Loader2, AlertCircle, MapPin, Stethoscope, FileText, FolderHeart, CheckCircle2, ShieldCheck } from "lucide-react";
import { createAppointment, updateAppointment, Appointment, AppointmentStatus } from "@/services/appointmentsService";
import { getUserRecords, HealthRecord, createPacketLink } from "@/services/recordsService";
import { useProfile } from "../auth/ProfileContext";

interface AppointmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  appointment?: Appointment; // If provided, we're editing
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AppointmentForm({ onClose, onSuccess, appointment }: AppointmentFormProps) {
  const { activeProfile } = useProfile();
  const isEditing = !!appointment;

  const toLocalDateTimeString = (isoStr?: string): string => {
    if (!isoStr) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      return now.toISOString().slice(0, 16);
    }
    const d = new Date(isoStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState(appointment?.title || "");
  const [doctor, setDoctor] = useState(appointment?.doctor || "");
  const [location, setLocation] = useState(appointment?.location || "");
  const [dateTime, setDateTime] = useState(toLocalDateTimeString(appointment?.date));
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || "upcoming");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Packet state
  const [createPacket, setCreatePacket] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  React.useEffect(() => {
    if (activeProfile) {
      setRecordsLoading(true);
      getUserRecords().then(data => {
        setRecords(data);
        setRecordsLoading(false);
      }).catch(() => setRecordsLoading(false));
    }
  }, [activeProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!activeProfile && !isEditing) { setError("No active profile."); return; }

    try {
      setSaving(true);
      setError(null);
      
      let packetId = appointment?.packet_id || undefined;

      // Handle packet creation if requested
      if (createPacket && !appointment?.packet_id && selectedRecords.length > 0) {
        try {
          packetId = await createPacketLink(
            `Packet for: ${title}`,
            selectedRecords,
            24, // Default to 24 hours for appointments
            activeProfile?.id || null,
            includeHistory
          );
        } catch (packetErr) {
          console.error("Failed to create packet:", packetErr);
        }
      }

      if (isEditing && appointment) {
        await updateAppointment(appointment.id, {
          title: title.trim(),
          doctor: doctor.trim() || undefined,
          location: location.trim() || undefined,
          date: new Date(dateTime).toISOString(),
          notes: notes.trim() || undefined,
          status,
          packet_id: packetId,
        });
      } else {
        await createAppointment({
          profileId: activeProfile!.id,
          title: title.trim(),
          doctor: doctor.trim() || undefined,
          location: location.trim() || undefined,
          date: new Date(dateTime),
          notes: notes.trim() || undefined,
          status,
          packetId,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <header className="p-8 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-lg shadow-tertiary/20">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface">
                {isEditing ? "Edit Appointment" : "New Appointment"}
              </h2>
              {activeProfile && !isEditing && (
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

        <form onSubmit={handleSubmit} className="p-8 pt-4 overflow-y-auto no-scrollbar space-y-5">
          {error && (
            <div className="flex items-center space-x-3 p-4 bg-error-container text-on-error-container rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-label-md font-medium">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Appointment Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Checkup"
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-tertiary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm"
            />
          </div>

          {/* Doctor + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
                <Stethoscope className="w-3 h-3" /> Doctor
              </label>
              <input
                type="text"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="Dr. Mehta"
                className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-tertiary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm"
              />
            </div>
            <div>
              <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Apollo Clinic"
                className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-tertiary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm"
              />
            </div>
          </div>

          {/* Date + Time */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-tertiary/10 transition-all font-inter shadow-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Status
            </label>
            <div className="flex gap-3">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 py-3 px-4 rounded-full text-label-md font-bold uppercase tracking-widest transition-all ${
                    status === opt.value
                      ? "bg-on-surface text-surface shadow-md scale-105"
                      : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Notes <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Bring previous reports, fasting required..."
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-tertiary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm resize-none"
            />
          </div>

          {/* Packet Integration */}
          {!appointment?.packet_id ? (
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
          ) : (
            <div className="pt-4 border-t border-outline-variant/30">
               <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
                    <FolderHeart className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-label-lg font-bold text-on-surface">Packet Linked</h4>
                    <p className="text-body-xs text-on-surface-variant font-medium">This appointment is ready for the visit.</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="w-full bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex justify-center items-center"
            >
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (isEditing ? "Save Changes" : "Schedule Appointment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
