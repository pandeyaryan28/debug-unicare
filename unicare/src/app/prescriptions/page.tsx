"use client";

import PrescriptionsSection from "@/components/ui/PrescriptionsSection";

export default function PrescriptionsPage() {
  return (
    <div className="px-6 py-8 md:px-0 md:py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <PrescriptionsSection />
      </div>
    </div>
  );
}
