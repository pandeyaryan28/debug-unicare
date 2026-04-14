"use client";

import React, { useState, useEffect } from "react";
import { FolderHeart, CheckCircle2, X, Share2, Calendar, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { getUserRecords, HealthRecord, createPacketLink } from "@/services/recordsService";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../auth/ProfileContext";

export default function VisitPacketBuilder() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [packetName, setPacketName] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [expiry, setExpiry] = useState(2); // hours
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const EXPIRY_OPTIONS = [
    { label: "1 Hour", value: 1 },
    { label: "2 Hours", value: 2 },
    { label: "12 Hours", value: 12 },
    { label: "1 Day", value: 24 },
    { label: "7 Days", value: 168 },
  ];

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // We use getUserRecords to show all records, but we could also filter by activeProfile if needed.
      // Usually packets are profile-specific if we're sharing history.
      const data = await getUserRecords();
      setRecords(data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchRecords();
    }
  }, [user, isOpen]);

  const handleToggleRecord = (id: string) => {
    setSelectedRecords((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGeneratePacket = async () => {
    try {
      setIsGenerating(true);
      const packetId = await createPacketLink(
        packetName || "Untitled Visit Packet", 
        selectedRecords,
        expiry,
        activeProfile?.id || null,
        includeHistory
      );
      setShareLink(`${window.location.origin}/share/packet/${packetId}`);
    } catch (error) {
      console.error("Failed to generate packet:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="font-sans mt-12 mb-8 selection:bg-tertiary/10">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between bg-surface-container-low hover:bg-surface-container-high transition-all p-6 md:p-8 rounded-[3rem] shadow-ambient group border border-white/40"
        >
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-tertiary text-on-tertiary flex items-center justify-center shadow-lg shadow-tertiary/20 group-hover:scale-110 transition-transform">
              <FolderHeart className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h3 className="text-headline-sm font-manrope font-bold text-on-surface group-hover:text-primary transition-colors">
                Create Visit Packet
              </h3>
              <p className="text-body-md text-on-surface-variant font-medium mt-0.5">
                Group multiple records to share with a doctor
              </p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
            <Share2 className="w-5 h-5" />
          </div>
        </button>
      ) : (
        <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3.5rem] shadow-ambient relative overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-white/60">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 blur-3xl rounded-full translate-x-1/4 -translate-y-1/4"></div>

          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-8 right-8 w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors z-20"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4 mb-10 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-md">
              <FolderHeart className="w-7 h-7" />
            </div>
            <h3 className="text-headline-md font-manrope font-bold text-on-surface">
              New Visit Packet
            </h3>
          </div>

          {!shareLink ? (
            <div className="space-y-10 relative z-10">
              <div>
                <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-4 ml-1">
                  Packet Name
                </label>
                <input
                  type="text"
                  value={packetName}
                  onChange={(e) => setPacketName(e.target.value)}
                  placeholder="e.g. Cardiologist Visit - Checkup"
                  className="w-full bg-surface-container-high rounded-[2rem] p-6 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm border border-white/30"
                />
              </div>

              {/* Data Sharing Options */}
              <div className="bg-surface-container-low/50 rounded-[2.5rem] p-8 border border-white/20 space-y-6">
                <p className="text-label-md font-bold tracking-widest text-on-surface-variant uppercase ml-1">Sharing Options</p>
                
                <div className="flex items-start space-x-5 p-4 rounded-3xl bg-white/40 border border-white/60">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-bold text-on-surface">Include Profile Identity</p>
                    <p className="text-body-sm text-on-surface-variant">ABHA ID, Blood Group, and contact details will be shared.</p>
                  </div>
                  <div className="pt-1">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setIncludeHistory(!includeHistory)}
                  className={`w-full flex items-start space-x-5 p-4 rounded-3xl border transition-all text-left ${
                    includeHistory 
                      ? "bg-secondary/10 border-secondary/30" 
                      : "bg-white/40 border-white/60 hover:bg-white/60"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    includeHistory ? "bg-secondary text-white" : "bg-secondary/10 text-secondary"
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-bold text-on-surface">Share Medical History</p>
                    <p className="text-body-sm text-on-surface-variant">Include surgeries, vaccinations, and chronic conditions.</p>
                  </div>
                  <div className="pt-1">
                    {includeHistory ? (
                      <CheckCircle2 className="w-6 h-6 text-secondary" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-outline-variant" />
                    )}
                  </div>
                </button>

                <div className="space-y-4 pt-2">
                  <p className="text-label-sm font-bold tracking-widest text-on-surface-variant uppercase ml-1">Link Expiry</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPIRY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setExpiry(option.value)}
                        className={`px-4 py-2 rounded-2xl text-label-md font-bold transition-all border ${
                          expiry === option.value
                            ? "bg-on-surface text-surface border-transparent shadow-md"
                            : "bg-white/40 border-white/60 text-on-surface-variant hover:bg-white/60"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4 ml-1">
                   <p className="text-label-md font-bold tracking-widest text-on-surface-variant uppercase">
                     Select Records ({selectedRecords.length})
                   </p>
                   {loading && <Loader2 className="w-4 h-4 animate-spin text-tertiary" />}
                </div>
                
                <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar rounded-[2.5rem] bg-surface-container-low/50 p-4 border border-white/20">
                  {loading ? (
                    <div className="py-20 text-center">
                      <Loader2 className="w-10 h-10 text-tertiary animate-spin mx-auto mb-4" />
                      <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Loading documents...</p>
                    </div>
                  ) : records.length > 0 ? (
                    records.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => handleToggleRecord(record.id)}
                        className={`flex items-center space-x-5 p-5 rounded-[1.5rem] cursor-pointer transition-all border border-transparent ${
                          selectedRecords.includes(record.id) 
                            ? "bg-white shadow-lg border-primary/20 scale-[1.02]"
                            : "hover:bg-surface-container-high"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          selectedRecords.includes(record.id) ? "bg-primary text-white" : "border-2 border-outline-variant"
                        }`}>
                          {selectedRecords.includes(record.id) && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-body-md font-bold truncate ${selectedRecords.includes(record.id) ? "text-primary" : "text-on-surface"}`}>
                            {record.title}
                          </p>
                          <div className="flex items-center mt-1">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-on-surface-variant" />
                            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                              {format(new Date(record.date), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-body-md font-medium text-on-surface-variant">No records available to group.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleGeneratePacket}
                  disabled={!packetName || selectedRecords.length === 0 || isGenerating}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-6 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 flex justify-center items-center"
                >
                  {isGenerating ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    "Generate Secure Visit Link"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center animate-in fade-in zoom-in duration-700">
              <div className="w-24 h-24 bg-success text-white rounded-full mx-auto flex items-center justify-center mb-8 shadow-xl shadow-success/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-display-sm font-manrope font-bold text-on-surface mb-3">
                Packet Ready!
              </h3>
              <p className="text-body-lg text-on-surface-variant mb-10 max-w-xs mx-auto font-medium">
                Your visit packet has been generated. The link will expire in {EXPIRY_OPTIONS.find(o => o.value === expiry)?.label.toLowerCase()}.
              </p>
              
              <div className="bg-surface-container-high p-6 rounded-[2rem] flex items-center space-x-4 mb-10 shadow-inner border border-white/50 overflow-hidden">
                <div className="p-4 bg-white rounded-[1.5rem] shadow-sm shrink-0 border border-outline-variant/20">
                  <QRCodeSVG
                    value={shareLink}
                    size={100}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="flex-1 truncate text-label-md font-mono text-on-surface text-left pl-2">
                  {shareLink}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                  }}
                  className="px-6 py-3 bg-primary text-on-primary rounded-full text-label-md font-bold shadow-md hover:bg-primary-container transition-colors shrink-0"
                >
                  Copy
                </button>
              </div>

              <button 
                onClick={() => {
                  setShareLink("");
                  setIsOpen(false);
                  setSelectedRecords([]);
                  setPacketName("");
                  setIncludeHistory(false);
                }}
                className="text-on-surface-variant font-bold hover:text-on-surface p-2 transition-colors text-label-md tracking-widest uppercase border-b border-transparent hover:border-on-surface-variant"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
