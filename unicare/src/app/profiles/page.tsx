"use client";

import React, { useState } from "react";
import { 
  Users, Plus, Edit2, Trash2, Calendar, Shield, 
  ChevronRight, AlertTriangle, Loader2, Phone, Droplets,
  QrCode, ChevronDown,
} from "lucide-react";
import { useProfile } from "@/components/auth/ProfileContext";
import { deleteProfile, getAvatarInitials, Profile } from "@/services/profilesService";
import AddProfileModal from "@/components/ui/AddProfileModal";
import ProfileQrCard from "@/components/ui/ProfileQrCard";

export default function ProfilesPage() {
  const { profiles, activeProfile, setActiveProfile, refreshProfiles, loading } = useProfile();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);

  const handleDelete = async () => {
    if (!profileToDelete) return;
    try {
      setDeleting(true);
      await deleteProfile(profileToDelete.id);
      if (activeProfile?.id === profileToDelete.id) {
        // Fallback to another profile if active one deleted
        const remaining = profiles.filter(p => p.id !== profileToDelete.id);
        if (remaining.length > 0) setActiveProfile(remaining[0]);
      }
      await refreshProfiles();
      setProfileToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-primary">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-bold">Manage Family</span>
          </div>
          <h1 className="text-display-xs md:text-display-sm font-manrope font-extrabold text-on-surface">Family Profiles</h1>
          <p className="text-body-sm md:text-body-md text-on-surface-variant max-w-sm">
            Manage medical sanctuaries for your family members.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-3 bg-primary text-on-primary px-6 py-4 rounded-full font-bold text-label-md md:text-label-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Add Family Member</span>
        </button>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-surface-container-low rounded-[2.5rem] animate-pulse" />
          ))
        ) : (
          <>
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className={`
                  group relative p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-500
                  ${activeProfile?.id === profile.id 
                    ? "bg-surface-container-high border-primary/20 shadow-lg ring-1 ring-primary/10" 
                    : "bg-surface-container-lowest border-outline-variant/30 hover:shadow-ambient"}
                `}
              >
                <div className="flex items-start justify-between mb-6 md:mb-8">
                  <div className="flex items-center space-x-4 md:space-x-5">
                    <div 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-manrope font-bold text-xl shadow-lg transform group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundColor: profile.avatar_color }}
                    >
                      {getAvatarInitials(profile.name)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60">
                          {profile.relation}
                        </span>
                        {profile.id === activeProfile?.id && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] uppercase font-bold tracking-widest">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-headline-xs md:text-headline-sm font-manrope font-bold text-on-surface">
                        {profile.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingProfile(profile)}
                      className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                    >
                      <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    {profile.relation !== "Self" && (
                      <button 
                        onClick={() => setProfileToDelete(profile)}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-high text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4 text-on-surface-variant/60">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[11px] md:text-label-sm font-medium">
                        {profile.dob ? new Date(profile.dob).toLocaleDateString() : "No DOB set"}
                      </span>
                    </div>
                    {profile.blood_group && (
                      <div className="flex items-center space-x-1.5 text-error/80">
                        <Droplets className="w-3.5 h-3.5" />
                        <span className="text-[11px] md:text-label-sm font-bold">{profile.blood_group}</span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-[11px] md:text-label-sm font-medium">{profile.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setActiveProfile(profile)}
                    disabled={activeProfile?.id === profile.id}
                    className={`
                      px-5 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-[11px] md:text-label-md transition-all
                      ${activeProfile?.id === profile.id 
                        ? "bg-primary/10 text-primary" 
                        : "bg-surface-container-highest text-on-surface active:bg-on-surface active:text-surface"}
                    `}
                  >
                    {activeProfile?.id === profile.id ? "Viewing" : "Switch"}
                  </button>
                </div>
              </div>
            ))}

            {/* Add Member Quick Card */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="group p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col items-center justify-center space-y-4 min-h-[160px] md:min-h-[200px]"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                <Plus className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="font-manrope font-bold text-on-surface text-label-lg md:text-body-lg">Add Member</p>
                <p className="text-[11px] md:text-label-sm text-on-surface-variant">Expand your health vault</p>
              </div>
            </button>
          </>
        )}
      </div>

      {/* ── Patient QR Section ── */}
      {activeProfile && (
        <div className="space-y-4">
          <button
            onClick={() => setQrExpanded(!qrExpanded)}
            className={`w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all ${
              qrExpanded
                ? "bg-primary/5 border-primary/20 shadow-sm"
                : "bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                qrExpanded ? "bg-primary text-on-primary" : "bg-primary/10 text-primary"
              }`}>
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-label-lg font-bold text-on-surface">My Patient QR</p>
                <p className="text-label-sm text-on-surface-variant font-medium">
                  Show doctors your unique patient code
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-on-surface-variant transition-transform duration-300 shrink-0 ${
                qrExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {qrExpanded && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <ProfileQrCard profile={activeProfile} />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(isAddModalOpen || editingProfile) && (
        <AddProfileModal
          initialProfile={editingProfile || undefined}
          onClose={() => { setIsAddModalOpen(false); setEditingProfile(null); }}
          onSuccess={refreshProfiles}
        />
      )}

      {/* Delete Confirmation */}
      {profileToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[2.5rem] shadow-ambient overflow-hidden p-8">
            <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-headline-sm font-manrope font-bold text-on-surface mb-2">Delete Profile?</h3>
            <p className="text-body-md text-on-surface-variant mb-8">
              All records for <span className="font-bold text-on-surface">&ldquo;{profileToDelete.name}&rdquo;</span> will be permanently erased.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-4 rounded-full font-bold text-label-lg bg-surface-container-high hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 rounded-full font-bold text-label-lg bg-error text-on-error hover:bg-error/90 transition-all flex justify-center items-center"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
