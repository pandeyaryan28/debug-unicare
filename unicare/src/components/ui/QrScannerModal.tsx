"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, CameraOff, Zap, ZapOff, AlertCircle, Loader2 } from "lucide-react";

interface QrScannerModalProps {
  onScan: (raw: string) => void;
  onClose: () => void;
  /** Called when user submits a manual code instead of scanning */
  onManualCode?: (code: string) => void;
}

export default function QrScannerModal({ onScan, onClose, onManualCode }: QrScannerModalProps) {
  const scannerContainerId = "qr-scanner-region";
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const startedRef = useRef(false);
  const scannedRef = useRef(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        // Dynamic import — avoids SSR issues with html5-qrcode
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setErrorMsg("No camera found on this device.");
          setStatus("error");
          return;
        }

        // Prefer back camera
        const backCamera = cameras.find((c) =>
          /back|rear|environment/i.test(c.label)
        );
        const cameraId = backCamera?.id ?? cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 12,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            // Brief success flash, then return result
            scanner?.stop().catch(() => {});
            onScan(decodedText);
            onClose();
          },
          () => {
            // scan failure (frame by frame) — ignore, keep scanning
          }
        );

        // Check torch support
        const capabilities = scanner
          .getRunningTrackCameraCapabilities();
        if (capabilities?.torchFeature().isSupported()) {
          setTorchSupported(true);
        }

        setStatus("scanning");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("permission")) {
          setErrorMsg("Camera access denied. Please allow camera permission and try again.");
        } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
          setErrorMsg("No camera found on this device.");
        } else {
          setErrorMsg("Could not start camera. " + msg);
        }
        setStatus("error");
      }
    };

    if (!startedRef.current) {
      startedRef.current = true;
      startScanner();
    }

    return () => {
      scanner?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = capabilities?.torchFeature();
      if (!torch) return;
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch {
      // Torch not available
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <header className="p-6 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-headline-xs font-manrope font-bold text-on-surface">Scan QR Code</h2>
              <p className="text-label-sm text-on-surface-variant font-medium">Point at doctor's clinic QR</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  torchOn
                    ? "bg-yellow-400/20 text-yellow-400"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
                title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scanner body */}
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-6 pt-2 space-y-5">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 text-tertiary animate-spin" />
              <p className="text-label-md text-on-surface-variant font-medium">Starting camera…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                <CameraOff className="w-8 h-8" />
              </div>
              <div>
                <p className="text-headline-xs font-manrope font-bold text-on-surface mb-1">Camera Unavailable</p>
                <p className="text-label-md text-on-surface-variant font-medium max-w-xs leading-relaxed">
                  {errorMsg}
                </p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-error/5 rounded-2xl border border-error/20">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-label-sm text-on-surface-variant">
                  Use the manual code input below as a fallback.
                </p>
              </div>
            </div>
          )}

          {/* Always render the container, even during loading — html5-qrcode needs it in the DOM */}
          <div className={`w-full relative ${status === "error" ? "hidden" : ""}`}>
            <div
              id={scannerContainerId}
              className="w-full rounded-[1.5rem] overflow-hidden bg-black"
              style={{ minHeight: "280px" }}
            />
            {/* Scanning frame overlay */}
            {status === "scanning" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[250px] h-[250px]">
                  {/* Corner brackets */}
                  {["top-0 left-0 border-t-4 border-l-4", "top-0 right-0 border-t-4 border-r-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map(
                    (cls, i) => (
                      <span
                        key={i}
                        className={`absolute w-8 h-8 border-tertiary rounded-sm ${cls}`}
                      />
                    )
                  )}
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-tertiary/70 rounded animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
          </div>

          {status === "scanning" && (
            <p className="text-label-sm text-on-surface-variant font-medium text-center">
              Hold steady — scanning automatically
            </p>
          )}

          {/* Manual code fallback — only shown if parent wants it */}
          {onManualCode && (
            <div className="w-full space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <p className="text-label-sm font-bold text-on-surface-variant/60 uppercase tracking-wider shrink-0">
                  OR Enter Doctor / Clinic Code
                </p>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="e.g. DR3F2A"
                  maxLength={6}
                  autoComplete="off"
                  className="flex-1 bg-surface-container-high rounded-[1.25rem] px-5 py-3.5 text-on-surface focus:outline-none focus:ring-4 focus:ring-tertiary/20 transition-all font-manrope placeholder:text-outline-variant text-lg font-bold tracking-[0.25em] uppercase shadow-sm border border-outline-variant/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualCode.length === 6) {
                      onManualCode(manualCode);
                      onClose();
                    }
                  }}
                  disabled={manualCode.length !== 6}
                  className="px-5 py-3.5 bg-tertiary text-on-tertiary rounded-[1.25rem] font-bold text-label-md disabled:opacity-40 hover:bg-tertiary/90 transition-all shrink-0"
                >
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 8px; }
          50% { top: calc(100% - 10px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
