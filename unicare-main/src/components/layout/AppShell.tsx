"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/ui/Sidebar";
import { usePathname } from "next/navigation";
import Login from "@/components/auth/Login";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPage = pathname?.startsWith("/share/");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-surface">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-on-surface-variant font-inter text-label-md uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  // Allow anyone to access public pages without login
  if (isPublicPage) {
    return <div className="bg-surface min-h-screen">{children}</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <Login />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto no-scrollbar relative pt-16 lg:pt-0">
        <div className="max-w-5xl mx-auto w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
