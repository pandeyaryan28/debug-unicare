"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, LogOut, Plus, Shield, ChevronRight, 
  Menu, X, LayoutDashboard,
  ClipboardList, Sun, Moon, CalendarCheck, Pill
} from "lucide-react";
import { useProfile } from "@/components/auth/ProfileContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/auth/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { getAvatarInitials } from "@/services/profilesService";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { profiles, activeProfile, setActiveProfile, loading } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: "Records Vault", icon: LayoutDashboard, href: "/" },
    { name: "Appointments", icon: CalendarCheck, href: "/appointments" },
    { name: "Prescriptions", icon: Pill, href: "/prescriptions" },
    { name: "Medical History", icon: ClipboardList, href: "/medical-history" },
    { name: "Family Profiles", icon: Users, href: "/profiles" },
  ];

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant z-40 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-on-primary" />
          </div>
          <span className="font-manrope font-bold text-on-surface tracking-tight">UniCare</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all active:scale-90"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {activeProfile && (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm"
              style={{ backgroundColor: activeProfile.avatar_color }}
            >
              {getAvatarInitials(activeProfile.name)}
            </div>
          )}
          <button 
            onClick={toggleMobile}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-surface-container-lowest border-r border-outline-variant/50 transform transition-transform duration-500 lg:translate-x-0 lg:static lg:h-screen flex flex-col
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo Section */}
        <div className="p-8 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-on-primary" />
            </div>
            <div>
              <h1 className="font-manrope font-extrabold text-headline-sm text-on-surface tracking-tight leading-none">UniCare</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant/50 mt-1">Health Vault</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-8 py-4">
          <div className="space-y-1">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant/40 mb-4">Main Menu</p>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all group relative
                    ${isActive 
                      ? "bg-primary text-on-primary shadow-md shadow-primary/20" 
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "text-on-primary" : "text-primary/60"}`} />
                  <span className="font-bold text-label-lg">{item.name}</span>
                  {isActive && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white/40" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Switcher */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant/40">Switch Profile</p>
            <div className="space-y-1.5 h-max">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high" />
                    <div className="h-4 w-24 bg-surface-container-high rounded-full" />
                  </div>
                ))
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setActiveProfile(profile)}
                    className={`
                      w-full flex items-center space-x-4 px-4 py-2.5 rounded-2xl transition-all group
                      ${activeProfile?.id === profile.id 
                        ? "bg-surface-container-high ring-1 ring-primary/20" 
                        : "hover:bg-surface-container-low"}
                    `}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                      style={{ backgroundColor: profile.avatar_color }}
                    >
                      {getAvatarInitials(profile.name)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-label-md md:text-body-md font-bold truncate ${activeProfile?.id === profile.id ? "text-primary" : "text-on-surface"}`}>
                        {profile.name}
                      </p>
                      <p className="text-[9px] md:text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider">{profile.relation}</p>
                    </div>
                    {activeProfile?.id === profile.id && (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
            <Link 
              href="/profiles"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center space-x-4 px-4 py-2.5 rounded-2xl text-primary font-bold text-label-md hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span>Add Member</span>
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/30 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-bold text-label-lg text-on-surface-variant hover:bg-surface-container-high transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
              {theme === "dark" 
                ? <Sun className="w-4 h-4 text-amber-400" /> 
                : <Moon className="w-4 h-4 text-primary" />
              }
            </div>
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* User info */}
          <div className="flex items-center space-x-4 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant overflow-hidden border border-outline-variant/30">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-label-md font-bold text-on-surface truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-on-surface-variant/60 font-medium truncate">{user?.email}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-error font-bold text-label-lg hover:bg-error/10 transition-all group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={toggleMobile}
        />
      )}
    </>
  );
}
