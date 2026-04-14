export const dynamic = "force-dynamic";

import React from "react";
import { getSharedRecord } from "@/services/recordsService";
import { FileText, Microscope, Activity, Calendar, Building2, ExternalLink, ShieldCheck, Download, Clock } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  const result = await getSharedRecord(shareId);

  if (!result) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-display-sm font-manrope font-bold text-on-surface mb-2">
          Link Expired or Invalid
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-md">
          This secure medical record link has either expired, been revoked, or is incorrect.
        </p>
      </div>
    );
  }

  const { record, expiresAt } = result;

  const getIconForType = (type: string) => {
    switch (type) {
      case "prescription": return <FileText className="w-8 h-8 text-tertiary" />;
      case "lab": return <Microscope className="w-8 h-8 text-secondary" />;
      case "imaging": return <Activity className="w-8 h-8 text-primary" />;
      default: return <FileText className="w-8 h-8 text-on-surface-variant" />;
    }
  };

  const getBgForType = (type: string) => {
    switch (type) {
      case "prescription": return "bg-tertiary-container shadow-[0_0_20px_rgba(var(--tertiary-rgb),0.2)]";
      case "lab": return "bg-secondary-container shadow-[0_0_20px_rgba(var(--secondary-rgb),0.2)]";
      case "imaging": return "bg-primary-container shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]";
      default: return "bg-surface-container-high";
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-headline-sm font-manrope font-bold tracking-tight text-on-surface">
              UniCare<span className="text-primary">Wallet</span>
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-label-md font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-5 py-2.5 rounded-full border border-white/50">
            <ShieldCheck className="w-4 h-4 text-primary mr-2" />
            Secure Public Access
          </div>
        </nav>

        <main className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-7 space-y-10">
            <header>
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 ${getBgForType(record.type)}`}>
                {getIconForType(record.type)}
              </div>
              <h1 className="text-display-md font-manrope font-bold text-on-surface leading-tight mb-4">
                {record.title}
              </h1>
              <p className="text-headline-sm text-on-surface-variant/80 font-medium italic">
                Shared for professional consultation
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-surface-container-low p-6 rounded-[2rem] border border-white/40 shadow-ambient group hover:border-primary/20 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-all">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Medical Provider</span>
                </div>
                <p className="text-headline-sm font-manrope font-bold text-on-surface">{record.provider}</p>
              </div>

              <div className="bg-surface-container-low p-6 rounded-[2rem] border border-white/40 shadow-ambient group hover:border-primary/20 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-all">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Record Date</span>
                </div>
                <p className="text-headline-sm font-manrope font-bold text-on-surface">
                  {format(new Date(record.date), "MMMM dd, yyyy")}
                </p>
              </div>
            </div>

            {/* Expiry notice */}
            {expiresAt && (
              <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 text-on-surface-variant font-medium text-body-md">
                <Clock className="w-4 h-4 shrink-0 text-primary" />
                <span>This link expires on <strong>{format(new Date(expiresAt), "MMMM dd, yyyy 'at' h:mm a")}</strong></span>
              </div>
            )}

            <div className="bg-gradient-to-br from-surface-container-highest to-surface-container-low p-8 rounded-[3rem] border border-white/50 shadow-ambient">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-on-surface" />
                  </div>
                  <div>
                    <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Attached Document</p>
                    <p className="text-body-md font-medium text-on-surface truncate max-w-[200px]">{record.file_name}</p>
                  </div>
                </div>
                <a
                  href={record.file_url}
                  download
                  className="hidden sm:flex items-center space-x-2 text-primary font-bold hover:underline transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>

              <a
                href={record.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/5 border border-white/30 shadow-inner"
              >
                {record.file_type.startsWith("image/") ? (
                  <Image
                    src={record.file_url}
                    alt={record.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high p-8">
                    <FileText className="w-20 h-20 text-on-surface-variant/20 mb-6 group-hover:scale-110 transition-transform duration-500" />
                    <p className="text-headline-sm font-manrope font-bold text-on-surface">PDF Document Preview</p>
                    <p className="text-body-md text-on-surface-variant text-center mt-2">Click to open the full document in a new tab</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-white text-on-surface px-8 py-4 rounded-full font-bold shadow-xl flex items-center space-x-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <ExternalLink className="w-5 h-5" />
                    <span>Open Document</span>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <div className="md:col-span-1" />

          <aside className="md:col-span-4 sticky top-24 space-y-12">
            <div className="bg-primary text-on-primary p-8 md:p-10 rounded-[3rem] shadow-ambient-primary relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="text-headline-md font-manrope font-bold mb-4">Patient Owned</h3>
                <p className="text-body-lg text-primary-container font-medium leading-relaxed mb-8 opacity-90">
                  This record is stored in a patient-owned health sanctuary. No data is stored on external hospital servers.
                </p>
                <div className="flex items-center space-x-3 bg-black/10 p-4 rounded-2xl border border-white/10">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span className="text-label-md font-bold uppercase tracking-widest text-white/80">End-to-End Secure</span>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
