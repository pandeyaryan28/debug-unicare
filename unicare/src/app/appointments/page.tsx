"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import AppointmentsSection from "@/components/ui/AppointmentsSection";
import { getProfileAppointments, Appointment } from "@/services/appointmentsService";
import { useProfile } from "@/components/auth/ProfileContext";
import { useSearchParams } from "next/navigation";

function AppointmentsPageContent() {
  const { activeProfile } = useProfile();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const bookOpen = searchParams.get("book") === "1";
  const initialCode = searchParams.get("code") || searchParams.get("d") || undefined;

  const fetchAppointments = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const data = await getProfileAppointments(activeProfile.id);
      setAppointments(data);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const now = new Date().toISOString();
  
  // Separate into upcoming and past
  // Consider completed or cancelled past date as "past"
  // Keep everything else as upcoming
  const upcomingAppointments = appointments.filter(
    (a) => a.status === "upcoming" || a.status === "confirmed" || a.status === "checked_in" 
      || (a.status === "cancelled" && a.date >= now)
  );
  
  const pastAppointments = appointments.filter(
    (a) => a.status === "completed" || (a.status === "cancelled" && a.date < now)
  ).reverse();

  return (
    <div className="px-6 py-8 md:px-0 md:py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <AppointmentsSection 
          pastAppointments={pastAppointments}
          upcomingAppointments={upcomingAppointments}
          loading={loading}
          onRefresh={fetchAppointments}
          patientName={activeProfile?.name || "Patient"}
          openBookingOnLoad={bookOpen}
          initialClinicCode={initialCode}
        />
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-on-surface-variant font-medium">Loading appointments...</div>}>
      <AppointmentsPageContent />
    </Suspense>
  );
}

