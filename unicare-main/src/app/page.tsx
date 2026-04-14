"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import Login from "@/components/auth/Login";
import RecordsList from "@/components/ui/RecordsList";
import VisitPacketBuilder from "@/components/ui/VisitPacketBuilder";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfileRecords } from "@/services/recordsService";
import { getProfileAppointments, Appointment } from "@/services/appointmentsService";
import { useProfile } from "@/components/auth/ProfileContext";
import { Loader2, CalendarCheck, ChevronRight, Clock, BellRing, CheckCircle2 } from "lucide-react";

function DashboardContent() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
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
        appts.filter((a) => a.status === "upcoming" || a.status === "confirmed" || a.status === "checked_in")
      );
    });
  }, [activeProfile?.id]);


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
          </div>

          <VisitPacketBuilder />

          <RecordsList />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return <DashboardContent />;
}
