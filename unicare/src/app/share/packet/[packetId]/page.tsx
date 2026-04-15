export const dynamic = "force-dynamic";

import React from "react";
import { getSharedPacket } from "@/services/recordsService";
import { 
  FileText, Microscope, Activity, Calendar, Building2, 
  ExternalLink, ShieldCheck, Download, Clock, FolderHeart, 
  User, Phone, Mail, MapPin, CreditCard, Droplets, HeartPulse
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

interface PacketSharePageProps {
  params: Promise<{ packetId: string }>;
}

export default async function PacketSharePage({ params }: PacketSharePageProps) {
  const { packetId } = await params;
  const packet = await getSharedPacket(packetId);

  if (!packet) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-display-sm font-manrope font-bold text-on-surface mb-2">
          Packet Expired or Invalid
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-md">
          This secure visit packet has either expired, been revoked, or the link is incorrect.
        </p>
      </div>
    );
  }

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

  const profile = packet.profile_data;
  const history = packet.medical_history || [];

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        {/* Navigation */}
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
            <FolderHeart className="w-4 h-4 text-primary mr-2" />
            Visit Packet
          </div>
        </nav>

        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-lg">
              <FolderHeart className="w-8 h-8" />
            </div>
            <div className="bg-surface-container-low px-4 py-1.5 rounded-full border border-white/40 text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
              SECURE MEDICAL COLLECTION
            </div>
          </div>
          <h1 className="text-display-md md:text-display-lg font-manrope font-bold text-on-surface leading-tight mb-4">
            {packet.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center text-body-lg text-on-surface-variant font-medium">
              <ShieldCheck className="w-5 h-5 mr-2 text-success" />
              Verified Patient Shared
            </div>
            {packet.expires_at && (
              <div className="flex items-center text-body-lg text-on-surface-variant font-medium bg-error/5 text-error px-4 py-1 rounded-full border border-error/10">
                <Clock className="w-4 h-4 mr-2" />
                Expires: {format(new Date(packet.expires_at), "h:mm a, MMM dd")}
              </div>
            )}
          </div>
        </header>

        {/* Patient Identity Section */}
        {profile && (
          <section className="mb-16 animate-in slide-in-from-bottom-5 duration-700">
            <div className="flex items-center space-x-3 mb-8">
               <User className="w-5 h-5 text-primary" />
               <h2 className="text-headline-sm font-manrope font-bold text-on-surface-variant uppercase tracking-widest">
                  Patient Identity
               </h2>
            </div>
            
            <div className="bg-surface-container-lowest rounded-[3rem] p-8 md:p-12 border border-white/60 shadow-ambient overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                  {profile.name && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Legal Name</p>
                      <p className="text-headline-sm font-manrope font-bold text-on-surface">{profile.name}</p>
                    </div>
                  )}
                  {profile.dob && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Date of Birth</p>
                      <div className="flex items-center space-x-2 text-body-lg font-semibold text-on-surface">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{format(new Date(profile.dob), "MMMM dd, yyyy")}</span>
                      </div>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Gender</p>
                      <p className="text-body-lg font-semibold text-on-surface">{profile.gender}</p>
                    </div>
                  )}
                  {profile.blood_group && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Blood Group</p>
                      <div className="flex items-center space-x-2 text-body-lg font-bold text-error">
                        <Droplets className="w-4 h-4" />
                        <span>{profile.blood_group}</span>
                      </div>
                    </div>
                  )}
                  {profile.abha_id && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">ABHA ID</p>
                      <div className="flex items-center space-x-2 text-body-lg font-bold text-primary">
                        <CreditCard className="w-4 h-4" />
                        <span>{profile.abha_id}</span>
                      </div>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Emergency Phone</p>
                      <div className="flex items-center space-x-2 text-body-lg font-semibold text-on-surface">
                        <Phone className="w-4 h-4 opacity-40" />
                        <span>{profile.phone}</span>
                      </div>
                    </div>
                  )}
                  {profile.email && (
                    <div className="space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Email Address</p>
                      <div className="flex items-center space-x-2 text-body-lg font-semibold text-on-surface">
                        <Mail className="w-4 h-4 opacity-40" />
                        <span>{profile.email}</span>
                      </div>
                    </div>
                  )}
                  {profile.address && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.15em]">Residential Address</p>
                      <div className="flex items-start space-x-2 text-body-lg font-semibold text-on-surface">
                        <MapPin className="w-4 h-4 mt-1 opacity-40" />
                        <span>{profile.address}</span>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </section>
        )}

        {/* Medical History Section */}
        {history.length > 0 && (
          <section className="mb-16 animate-in slide-in-from-bottom-5 duration-700 delay-100">
             <div className="flex items-center space-x-3 mb-8">
               <HeartPulse className="w-5 h-5 text-secondary" />
               <h2 className="text-headline-sm font-manrope font-bold text-on-surface-variant uppercase tracking-widest">
                  Health History
               </h2>
            </div>
            
            <div className="bg-secondary-container/10 rounded-[3rem] p-8 md:p-12 border border-secondary/10 shadow-sm">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {history.map((item, idx) => (
                    <div key={idx} className="bg-white/40 rounded-3xl p-6 border border-white/60">
                      <p className="text-label-sm font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">{item.question}</p>
                      <p className="text-body-lg font-bold text-on-surface">{item.answer}</p>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        )}

        {/* Records Grid */}
        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700 delay-200">
          <div className="flex items-center space-x-3 mb-8">
             <FileText className="w-5 h-5 text-tertiary" />
             <h2 className="text-headline-sm font-manrope font-bold text-on-surface-variant uppercase tracking-widest">
                Clinical Documents ({packet.records.length})
             </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {packet.records.map((record) => (
              <div 
                key={record.id}
                className="group bg-surface-container-lowest rounded-[3rem] p-8 md:p-10 border border-white/60 shadow-ambient hover:shadow-xl transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-4 space-y-6">
                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${getBgForType(record.type)}`}>
                      {getIconForType(record.type)}
                    </div>
                    
                    <div>
                      <h3 className="text-headline-md font-manrope font-bold text-on-surface mb-2">{record.title}</h3>
                      <p className="text-label-md font-bold text-primary uppercase tracking-widest">{record.type}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-on-surface-variant">
                        <Building2 className="w-5 h-5 opacity-40" />
                        <span className="font-semibold">{record.provider}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-on-surface-variant">
                        <Calendar className="w-5 h-5 opacity-40" />
                        <span className="font-semibold">{format(new Date(record.date), "MMMM dd, yyyy")}</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <a
                        href={record.file_url}
                        download={record.file_name}
                        className="inline-flex items-center space-x-2 bg-on-surface text-surface px-6 py-3 rounded-full font-bold shadow-md hover:opacity-90 transition-all text-label-md"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Report</span>
                      </a>
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <a
                      href={record.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/link relative aspect-[16/9] rounded-[2.5rem] overflow-hidden bg-surface-container-high border border-white/40 shadow-inner"
                    >
                      {record.file_type.startsWith("image/") ? (
                        <Image
                          src={record.file_url}
                          alt={record.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover/link:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-on-surface-variant opacity-60">
                          <FileText className="w-20 h-20 mb-4" />
                          <p className="text-headline-sm font-manrope font-bold">PDF Document</p>
                          <p className="text-body-md mt-1">Full Clinical Report</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/link:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white text-on-surface px-8 py-4 rounded-full font-bold shadow-xl flex items-center space-x-3 translate-y-4 group-hover/link:translate-y-0 transition-transform duration-500">
                          <ExternalLink className="w-5 h-5" />
                          <span>Preview Full Screen</span>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-24 pt-12 border-t border-outline-variant/30 text-center">
          <div className="inline-flex items-center space-x-3 bg-surface-container-low px-8 py-4 rounded-[2rem] border border-white/50 text-on-surface-variant font-medium">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>End-to-End Secure Health Data Sanctuary</span>
          </div>
          <p className="mt-6 text-label-sm font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
            Powered by UniCare Privacy Engine
          </p>
        </footer>
      </div>
    </div>
  );
}
