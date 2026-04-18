"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import RecordsList from "@/components/ui/RecordsList";
import VisitPacketBuilder from "@/components/ui/VisitPacketBuilder";
import ProfileQrCard from "@/components/ui/ProfileQrCard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfileRecords } from "@/services/recordsService";
import { getProfileAppointments, Appointment } from "@/services/appointmentsService";
import { useProfile } from "@/components/auth/ProfileContext";
import { Loader2, CalendarCheck, ChevronRight, Clock, BellRing, CheckCircle2, ScanLine, QrCode } from "lucide-react";
import BookAppointmentModal from "@/components/ui/BookAppointmentModal";
import dynamic from "next/dynamic";
import { resolveDoctorFromScannedQr } from "@/services/qrIdentityService";

// Dynamically import scanner to avoid SSR issues
const QrScannerModal = dynamic(() => import("@/components/ui/QrScannerModal"), { ssr: false });

function DashboardContent() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [prefillClinicCode, setPrefillClinicCode] = useState<string | undefined>(undefined);

  // Scan-to-Book flow state
  const [showScanner, setShowScanner] = useState(false);
  const [scanResolving, setScanResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Dashboard data
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [newTodayCount, setNewTodayCount] = useState<number>(0);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!activeProfile) return;
    setRecordCount(null);
    getProfileRecords(activeProfile.id).then((records) => {
      setRecordCount(records.length);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setNewTodayCount(records.filter((r) => new Date(r.created_at) >= today).length);
    });
    getProfileAppointments(activeProfile.id).then((appts) => {
      setUpcomingAppts(
          appts.filter((a) => a.status === "pending" || a.status === "upcoming" || a.status === "confirmed" || a.status === "checked_in")
        );
    });
  }, [activeProfile?.id]);

  const refreshAppointments = () => {
    if (!activeProfile) return;
    getProfileAppointments(activeProfile.id).then((appts) => {
      setUpcomingAppts(
        appts.filter((a) => a.status === "pending" || a.status === "upcoming" || a.status === "confirmed" || a.status === "checked_in")
      );
    });
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserFirstName = () => {
    if (!user) return "there";
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (fullName) return fullName.split(" ")[0];
    return user.email?.split("@")[0] || "User";
  };

  // ── Scan-to-Book: handle the raw QR scan result ──
  const handleScanResult = async (raw: string) => {
    setShowScanner(false);
    setScanResolving(true);
    setScanError(null);

    // Audit log (fire-and-forget)
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
        setScanError("Could not identify a valid doctor QR. Try entering the code manually.");
        setScanResolving(false);
        return;
      }
      // Open booking modal pre-filled with the resolved clinic code
      setPrefillClinicCode(resolved.code);
      setShowBookingModal(true);
    } catch {
      setScanError("Scan resolution failed. Please try again or enter the code manually.");
    } finally {
      setScanResolving(false);
    }
  };

  // ── Scan-to-Book: manual code fallback from scanner modal ──
  const handleManualCode = (code: string) => {
    setShowScanner(false);
    setPrefillClinicCode(code);
    setShowBookingModal(true);
  };

  const openScanToBook = () => {
    setScanError(null);
    setPrefillClinicCode(undefined);
    setShowScanner(true);
  };

  return (
    <div className="px-6 py-8 md:px-0 md:py-12 flex flex-col items-center selection:bg-primary/10">
      <div className="w-full max-w-2xl">
        <main>
          {/* Hero / Stats panel */}
          <div className="bg-gradient-to-br from-primary to-primary-container rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-ambient text-on-primary relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 blur-2xl rounded-full -translate-x-1/4 translate-y-1/4" />

            <div className="relative z-10">
              <h2 className="text-display-sm font-bold mb-3">
                {getTimeGreeting()}, {getUserFirstName()}
              </h2>
              <p className="text-body-md text-primary-fixed-dim opacity-90 font-medium max-w-xs leading-relaxed">
                {activeProfile
                  ? `Viewing ${activeProfile.name}'s health sanctuary.`
                  : "Your health sanctuary is up to date."}
              </p>

              <div className="mt-8 md:mt-10 grid grid-cols-2 gap-4 md:flex md:items-center md:space-x-10">
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {recordCount === null ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                    ) : (
                      <p className="text-3xl md:text-4xl font-manrope font-bold tracking-tighter">{recordCount}</p>
                    )}
                  </div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-primary-fixed-dim opacity-70">Total Docs</p>
                </div>
                <div className="hidden md:block w-px h-10 bg-white/20" />
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    {recordCount === null ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                    ) : (
                      <p className="text-3xl md:text-4xl font-manrope font-bold tracking-tighter text-secondary-fixed">{newTodayCount}</p>
                    )}
                  </div>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-primary-fixed-dim opacity-70">New Today</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Patient QR & Code ── */}
          {activeProfile && (
            <div className="mt-8 mb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <h2 className="text-display-sm font-manrope font-bold text-on-surface">Your Patient QR</h2>
              </div>
              <ProfileQrCard profile={activeProfile} />
            </div>
          )}

          {/* Appointments compact card */}
          <div className="mt-10 mb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display-sm font-manrope font-bold text-on-surface">Appointments</h2>
              <Link
                href="/appointments"
                className="flex items-center gap-1 text-label-md font-bold text-tertiary hover:text-tertiary/80 transition-colors"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {upcomingAppts.length === 0 ? (
              <Link
                href="/appointments"
                className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-[2rem] border-2 border-dashed border-outline-variant/30 hover:border-tertiary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-body-md font-bold text-on-surface">No upcoming appointments</p>
                  <p className="text-label-md text-on-surface-variant font-medium">Tap to book one</p>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant ml-auto" />
              </Link>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.slice(0, 2).map((appt) => (
                  <Link
                    key={appt.id}
                    href="/appointments"
                    className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-[1.5rem] border border-white/50 shadow-ambient hover:border-tertiary/20 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      appt.status === "checked_in" ? "bg-purple-500/15 text-purple-600" :
                      appt.status === "confirmed" ? "bg-blue-500/10 text-blue-600" :
                      "bg-tertiary/10 text-tertiary"
                    }`}>
                      {appt.status === "checked_in" ? <BellRing className="w-5 h-5" /> :
                       appt.status === "confirmed" ? <CheckCircle2 className="w-5 h-5" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-bold text-on-surface truncate">{appt.title}</p>
                      <p className="text-label-sm text-on-surface-variant font-medium">
                        {new Date(appt.date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0" />
                  </Link>
                ))}
                {upcomingAppts.length > 2 && (
                  <Link href="/appointments" className="block text-center text-label-md font-bold text-tertiary py-2 hover:text-tertiary/80 transition-colors">
                    +{upcomingAppts.length - 2} more →
                  </Link>
                )}
              </div>
            )}

            {/* Scan to Book CTA */}
            {scanError && (
              <div className="mt-3 flex items-center gap-2.5 p-3.5 bg-error/10 text-error rounded-2xl text-label-sm font-medium">
                <span className="shrink-0">⚠</span>
                {scanError}
              </div>
            )}
            <button
              onClick={openScanToBook}
              disabled={scanResolving}
              className="mt-4 w-full flex items-center justify-between p-5 bg-tertiary text-on-tertiary rounded-[2rem] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all group disabled:opacity-60 disabled:hover:scale-100"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-on-tertiary/20 flex items-center justify-center">
                  {scanResolving
                    ? <Loader2 className="w-6 h-6 animate-spin" />
                    : <ScanLine className="w-6 h-6" />
                  }
                </div>
                <div>
                  <p className="text-body-lg font-bold">
                    {scanResolving ? "Resolving doctor…" : "Scan to Book"}
                  </p>
                  <p className="text-label-md font-medium text-on-tertiary/80">
                    {scanResolving ? "Please wait…" : "Scan a doctor's QR code to book instantly"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <VisitPacketBuilder />

          {/* QR Scanner overlay — opened directly from Scan to Book */}
          {showScanner && (
            <QrScannerModal
              onScan={handleScanResult}
              onClose={() => setShowScanner(false)}
              onManualCode={handleManualCode}
            />
          )}

          {/* Booking modal — opened after scan resolves with prefilled clinic code */}
          {showBookingModal && (
            <BookAppointmentModal
              initialClinicCode={prefillClinicCode}
              onClose={() => {
                setShowBookingModal(false);
                setPrefillClinicCode(undefined);
              }}
              onSuccess={refreshAppointments}
            />
          )}

          <RecordsList />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return <DashboardContent />;
}
