"use client";

import React, { useState } from "react";
import { ChevronDown, Plus, Users, Trash2, AlertTriangle } from "lucide-react";
import { useProfile } from "../auth/ProfileContext";
import { deleteProfile, getAvatarInitials } from "@/services/profilesService";
import AddProfileModal from "./AddProfileModal";

export default function ProfileSelector() {
  const { profiles, activeProfile, setActiveProfile, refreshProfiles, loading } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading || !activeProfile) return (
    <div className="flex items-center space-x-3 bg-surface-container-high px-4 py-2.5 rounded-full shadow-sm border border-white/30 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-primary/20" />
      <div className="w-20 h-4 bg-surface-container-highest rounded-full" />
    </div>
  );

  const handleDelete = async (profileId: string) => {
    try {
      setDeleting(true);
      await deleteProfile(profileId);
      setConfirmDeleteId(null);
      await refreshProfiles();
    } catch (err: any) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative font-inter selection:bg-primary/20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 bg-surface-container-high hover:bg-surface-container-highest transition-all px-4 py-2.5 rounded-full shadow-sm border border-white/30"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs tracking-tight shadow-md text-white"
            style={{ backgroundColor: activeProfile.avatar_color }}
          >
            {getAvatarInitials(activeProfile.name)}
          </div>
          <div className="text-left flex-1 pr-1 min-w-[60px]">
            <p className="text-label-sm font-bold text-on-surface leading-tight truncate max-w-[150px]">
              {activeProfile.name}
            </p>
            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest leading-none mt-0.5">
              {activeProfile.relation}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-6 w-[20rem] sm:w-[24rem] bg-surface-container-lowest rounded-[3rem] shadow-ambient z-[100] overflow-hidden p-6 animate-in fade-in slide-in-from-top-4 duration-500 border border-white/60">
              <div className="space-y-1.5">
                <div className="px-5 py-3 mb-1">
                  <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Profiles
                  </p>
                </div>

                {profiles.map((profile) => (
                  <div key={profile.id} className="relative group/item">
                    {confirmDeleteId === profile.id ? (
                      /* Confirm delete inline */
                      <div className="p-4 rounded-[1.5rem] bg-error-container text-on-error-container animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-label-sm font-bold leading-snug">
                            Delete &ldquo;{profile.name}&rdquo;? All related medical records will be erased.
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-4 py-2 rounded-full text-label-sm font-bold bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors"
                            disabled={deleting}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(profile.id)}
                            className="px-4 py-2 rounded-full text-label-sm font-bold bg-error text-on-error hover:bg-error/90 transition-colors shadow-sm"
                            disabled={deleting}
                          >
                            {deleting ? "Deleting..." : "Delete Permanently"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveProfile(profile);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center space-x-4 p-4 rounded-[1.5rem] transition-all relative overflow-hidden ${
                          profile.id === activeProfile.id
                            ? "shadow-lg scale-[1.02]"
                            : "hover:bg-surface-container-low text-on-surface"
                        }`}
                        style={profile.id === activeProfile.id ? { backgroundColor: profile.avatar_color + "22" } : {}}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-md"
                          style={{ backgroundColor: profile.avatar_color }}
                        >
                          {getAvatarInitials(profile.name)}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className={`text-label-sm font-bold uppercase tracking-widest mb-0.5 text-on-surface-variant`}>
                            {profile.relation}
                          </p>
                          <p className="text-headline-sm font-manrope font-bold leading-tight text-on-surface truncate">
                            {profile.name}
                          </p>
                        </div>
                        {profile.id === activeProfile.id && (
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: profile.avatar_color }} />
                        )}
                      </button>
                    )}

                    {/* Delete button — only for non-Self profiles */}
                    {profile.relation !== "Self" && confirmDeleteId !== profile.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(profile.id); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 z-10"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-surface-container-high px-1">
                <button
                  onClick={() => { setIsOpen(false); setIsAddModalOpen(true); }}
                  className="w-full flex items-center justify-center space-x-2 p-5 text-primary font-bold text-label-md rounded-[1.5rem] hover:bg-surface-container-low transition-all group"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="tracking-wide">Add Family Member</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isAddModalOpen && (
        <AddProfileModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { refreshProfiles(); }}
        />
      )}
    </>
  );
}
