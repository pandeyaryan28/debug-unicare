"use client";

import AppointmentsSection from "@/components/ui/AppointmentsSection";

export default function AppointmentsPage() {
  return (
    <div className="px-6 py-8 md:px-0 md:py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <AppointmentsSection />
      </div>
    </div>
  );
}
