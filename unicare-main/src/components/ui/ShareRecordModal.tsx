"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Share2, ExternalLink, QrCode, Clock, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { HealthRecord, createShareLink } from "@/services/recordsService";

interface ShareRecordModalProps {
  record: HealthRecord;
  onClose: () => void;
}

type ExpiryOption = { label: string; days: number | null };

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "Never", days: null },
];

export default function ShareRecordModal({ record, onClose }: ShareRecordModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryOption>(EXPIRY_OPTIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateLink = async (expiry: ExpiryOption) => {
    try {
      setGenerating(true);
      setGenerated(false);
      setShareUrl("");
      const shareId = await createShareLink(record.id, expiry.days);
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${shareId}`);
      setGenerated(true);
    } catch (err) {
      console.error("Failed to create share link:", err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    generateLink(selectedExpiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExpiryChange = (opt: ExpiryOption) => {
    setSelectedExpiry(opt);
    generateLink(opt);
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `UniCare Share: ${record.title}`,
          text: `View my medical record: ${record.title} from ${record.provider}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  const expiryText = selectedExpiry.days
    ? `Expires in ${selectedExpiry.label}`
    : "Never expires";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-[3rem] shadow-ambient overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <header className="p-8 pb-4 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-headline-md font-manrope font-bold text-on-surface">Share Record</h2>
              <p className="text-label-sm text-on-surface-variant font-medium truncate max-w-[180px]">{record.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-8 space-y-7 overflow-y-auto no-scrollbar">
          {/* Expiry selector */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Link Expiry
            </label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleExpiryChange(opt)}
                  className={`flex-1 py-2.5 px-3 rounded-full text-label-sm font-bold transition-all ${
                    selectedExpiry.label === opt.label
                      ? "bg-on-surface text-surface scale-105 shadow-md"
                      : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="p-5 bg-white rounded-[2rem] shadow-ambient mb-4 border-8 border-surface-container-high relative">
              {(generating || !generated) ? (
                <div className="w-[160px] h-[160px] flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              ) : (
                <QRCodeSVG
                  value={shareUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/favicon.ico",
                    x: undefined,
                    y: undefined,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
              )}
            </div>
            <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest flex items-center">
              <QrCode className="w-4 h-4 mr-2" />
              Scan to view on mobile
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant font-medium opacity-70">
              {expiryText}
            </p>
          </div>

          {/* Share link */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Secure Share Link
            </label>
            <div className="flex items-center space-x-2 bg-surface-container-high p-4 rounded-[1.5rem] border border-outline-variant/30">
              <div className="flex-1 truncate text-label-md font-mono text-on-surface">
                {generating ? (
                  <span className="text-on-surface-variant animate-pulse">Generating link...</span>
                ) : shareUrl}
              </div>
              <button
                onClick={handleCopy}
                disabled={!shareUrl || generating}
                className={`p-3 rounded-xl transition-all disabled:opacity-40 ${
                  copied ? "bg-success text-white" : "bg-primary text-on-primary hover:scale-105 active:scale-95"
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-3 text-label-sm text-on-surface-variant text-center font-medium opacity-70">
              Anyone with this link can view the document. {selectedExpiry.days ? `Valid for ${selectedExpiry.label}.` : "Link never expires."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleNativeShare}
              disabled={!shareUrl || generating}
              className="w-full flex items-center justify-center space-x-3 bg-surface-container-highest text-on-surface py-4 rounded-full font-bold text-label-lg hover:bg-surface-container-low transition-colors shadow-sm disabled:opacity-40"
            >
              <Share2 className="w-5 h-5" />
              <span>More sharing options</span>
            </button>

            <a
              href={record.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-3 text-primary py-3 rounded-full font-bold text-label-lg hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View original document</span>
            </a>
          </div>
        </div>

        <footer className="p-8 pt-0 text-center">
          <button
            onClick={onClose}
            className="text-on-surface-variant font-bold text-label-md uppercase tracking-wider hover:text-on-surface transition-colors"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
