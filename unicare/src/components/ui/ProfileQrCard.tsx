"use client";

import React, { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, CheckCircle2, QrCode, Loader2, AlertCircle, User } from "lucide-react";
import { Profile, getAvatarInitials } from "@/services/profilesService";
import { generatePatientQrPayload } from "@/services/qrIdentityService";

interface ProfileQrCardProps {
  profile: Profile;
}

export default function ProfileQrCard({ profile }: ProfileQrCardProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQrPayload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If patient_code is already on the profile object, use it directly
      if (profile.patient_code) {
        const payload = JSON.stringify({ v: 1, type: "patient", code: profile.patient_code });
        setQrData(payload);
        setCode(profile.patient_code);
        return;
      }
      // Fallback: fetch from DB (handles edge case if profile was loaded without patient_code)
      const result = await generatePatientQrPayload(profile.id);
      if (!result) {
        setError("Patient code not yet assigned. Please refresh.");
        return;
      }
      setQrData(result.qrData);
      setCode(result.code);
    } catch {
      setError("Failed to load QR code.");
    } finally {
      setLoading(false);
    }
  }, [profile.id, profile.patient_code]);

  useEffect(() => {
    loadQrPayload();
  }, [loadQrPayload]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard not available — silently ignore
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/20 overflow-hidden">
      {/* Card header with profile context */}
      <div className="p-6 pb-0 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-manrope font-bold text-lg shadow-md shrink-0"
          style={{ backgroundColor: profile.avatar_color }}
        >
          {getAvatarInitials(profile.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-0.5">
            {profile.relation}
          </p>
          <h3 className="font-manrope font-bold text-on-surface text-headline-xs truncate">
            {profile.name}
          </h3>
        </div>
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4" />
        </div>
      </div>

      {/* Attribution label */}
      <p className="px-6 pt-3 text-label-sm text-on-surface-variant font-medium">
        This QR belongs to{" "}
        <span className="font-bold text-on-surface">{profile.name}</span>{" "}
        <span className="opacity-70">({profile.relation})</span>
      </p>

      {/* QR + code section */}
      <div className="p-6 flex flex-col items-center gap-5">
        {loading && (
          <div className="w-[200px] h-[200px] bg-surface-container-low rounded-[1.5rem] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-14 h-14 bg-error/10 text-error rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <p className="text-label-md text-on-surface-variant font-medium">{error}</p>
            <button
              onClick={loadQrPayload}
              className="text-label-sm font-bold text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && qrData && (
          <>
            {/* QR Code */}
            <div className="p-4 bg-white rounded-[1.5rem] shadow-sm">
              <QRCodeSVG
                value={qrData}
                size={180}
                level="M"
                marginSize={1}
                style={{ display: "block" }}
              />
            </div>

            {/* Patient Code + Copy */}
            <div className="w-full bg-surface-container-low rounded-[1.5rem] p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-0.5">
                  Patient Code
                </p>
                <p className="font-manrope font-bold text-on-surface text-xl tracking-[0.2em]">
                  {code}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  copied
                    ? "bg-secondary text-on-secondary shadow-md"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                }`}
                title="Copy patient code"
              >
                {copied ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Info notice */}
            <div className="w-full flex items-start gap-2.5 p-3 bg-primary/5 rounded-2xl border border-primary/10">
              <User className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-label-sm text-on-surface-variant leading-relaxed">
                Show this QR to your doctor for instant registration. Your code is permanent and unique to this profile.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
