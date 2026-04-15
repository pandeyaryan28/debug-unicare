"use client";

import React, { useState } from "react";
import { X, UserPlus, Loader2, AlertCircle, User, Phone, Mail, MapPin, ShieldAlert, CreditCard, Droplets } from "lucide-react";
import { createProfile, updateProfile, ProfileRelation, Profile } from "@/services/profilesService";

interface AddProfileModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialProfile?: Profile;
}

const RELATIONS: ProfileRelation[] = ["Parent", "Child", "Spouse", "Other"];
const GENDERS = ["Male", "Female", "Non-binary", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const AVATAR_COLORS = [
  "#6750A4", "#B5261E", "#006A60", "#6E4E37",
  "#904D00", "#344F5D", "#386A20", "#7A4F80",
];

export default function AddProfileModal({ onClose, onSuccess, initialProfile }: AddProfileModalProps) {
  const isEdit = !!initialProfile;
  
  // Core Fields
  const [name, setName] = useState(initialProfile?.name || "");
  const [relation, setRelation] = useState<ProfileRelation>(initialProfile?.relation || "Other");
  const [avatarColor, setAvatarColor] = useState(initialProfile?.avatar_color || AVATAR_COLORS[0]);
  
  // Extended Fields
  const [dob, setDob] = useState(initialProfile?.dob || "");
  const [gender, setGender] = useState(initialProfile?.gender || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [email, setEmail] = useState(initialProfile?.email || "");
  const [address, setAddress] = useState(initialProfile?.address || "");
  const [emergencyContact, setEmergencyContact] = useState(initialProfile?.emergency_contact || "");
  const [abhaId, setAbhaId] = useState(initialProfile?.abha_id || "");
  const [bloodGroup, setBloodGroup] = useState(initialProfile?.blood_group || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "?";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    
    const profileData = {
      name: name.trim(),
      relation,
      dob: dob || null,
      gender: gender || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      emergency_contact: emergencyContact || null,
      abha_id: abhaId || null,
      blood_group: bloodGroup || null,
      avatar_color: avatarColor
    };

    try {
      setSaving(true);
      if (isEdit && initialProfile) {
        await updateProfile(initialProfile.id, profileData);
      } else {
        await createProfile(profileData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-ambient overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <header className="px-6 md:px-10 pt-8 md:pt-10 pb-6 flex justify-between items-center bg-surface-container-low shrink-0 z-10 border-b border-outline-variant/20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              {isEdit ? <User className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl md:text-headline-small font-manrope font-bold text-on-surface">
                {isEdit ? "Medical Profile" : "Add Member"}
              </h2>
              <p className="text-[10px] md:text-label-small text-on-surface-variant font-medium uppercase tracking-[0.1em]">
                {isEdit ? "Comprehensive Health Identity" : "New Patient Sanctuary"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 space-y-10">
          {error && (
            <div className="flex items-center space-x-3 p-4 bg-error-container text-on-error-container rounded-2xl animate-in shake-1">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-label-md font-medium">{error}</p>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-10 pb-8 border-b border-outline-variant/10">
            <div
              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-white font-manrope font-bold text-3xl md:text-4xl shadow-xl transition-all shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <p className="text-label-md font-bold tracking-widest text-on-surface-variant uppercase">Visual Identity</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all active:scale-90"
                    style={{
                      backgroundColor: c,
                      borderColor: avatarColor === c ? "white" : "transparent",
                      boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <User className="w-4 h-4" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-body-lg shadow-sm"
              />
            </div>

            {/* Relation */}
            <div className="md:col-span-2">
              <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                Relation
              </label>
              <div className="flex flex-wrap gap-2.5">
                {RELATIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRelation(r)}
                    className={`flex-1 sm:flex-none px-5 py-3 rounded-full text-label-md font-bold uppercase tracking-widest transition-all ${
                      relation === r
                        ? "bg-on-surface text-surface shadow-md scale-105"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* DOB */}
            <div>
              <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm appearance-none"
              >
                <option value="">Select Gender</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <Droplets className="w-4 h-4 text-error" />
                <span>Blood Group</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm appearance-none"
              >
                <option value="">Select Group</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>

            {/* ABHA ID */}
            <div>
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>ABHA ID</span>
              </label>
              <input
                type="text"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                placeholder="14-digit ID"
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <Phone className="w-4 h-4" />
                <span>Mobile Number</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 00000 00000"
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <Mail className="w-4 h-4" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@health.com"
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <ShieldAlert className="w-4 h-4 text-error" />
                <span>Emergency Contact (Name & Phone)</span>
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Person Name - 9876543210"
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
                <MapPin className="w-4 h-4" />
                <span>Residential Address</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full home address..."
                className="w-full bg-surface-container-high rounded-2xl p-4 md:p-5 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="pt-6 sticky bottom-0 bg-surface-container-lowest pb-4">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 flex justify-center items-center"
            >
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (isEdit ? "Update Health Identity" : "Establish Profile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
