"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Heart, Stethoscope, Pill, 
  FileSearch, Activity, ShieldCheck, Save, Loader2,
  CheckCircle2, History, UserCheck
} from "lucide-react";
import { useProfile } from "@/components/auth/ProfileContext";
import { 
  getMedicalHistory, 
  saveMedicalHistoryEntry, 
  MedicalHistoryEntry,
  QUESTIONS 
} from "@/services/medicalHistoryService";

// Questions imported from service

const CATEGORY_ICONS: Record<string, any> = {
  History: History,
  Family: UserCheck,
  Lifestyle: Activity,
  Current: Stethoscope,
  Medications: Pill,
  Allergies: ShieldCheck,
  Reports: FileSearch,
  Diagnostics: Activity,
  Vitals: Heart,
  Preventive: ShieldCheck,
  Advanced: ClipboardList,
  Admin: ClipboardList,
};

export default function MedicalHistoryPage() {
  const { activeProfile } = useProfile();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile) {
      fetchHistory();
    }
  }, [activeProfile]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getMedicalHistory(activeProfile!.id);
      const answerMap: Record<string, string> = {};
      data.forEach(entry => {
        answerMap[entry.question_id] = entry.answer;
      });
      setAnswers(answerMap);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (questionId: string) => {
    if (!activeProfile) return;
    try {
      setSavingId(questionId);
      await saveMedicalHistoryEntry({
        profile_id: activeProfile.id,
        question_id: questionId,
        answer: answers[questionId] || "",
      });
      setSuccessId(questionId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (error) {
      console.error("Failed to save entry:", error);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs">Loading Medical Profile...</p>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(QUESTIONS.map(q => q.category)));

  return (
    <div className="p-6 lg:p-12 space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 text-primary">
          <ClipboardList className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Comprehensive Profile</span>
        </div>
        <h1 className="text-display-sm font-manrope font-extrabold text-on-surface">General Medical History</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Maintain a detailed overview of {activeProfile?.name}'s health journey. This static record provides doctors with critical context at a glance.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-16">
        {categories.map(category => {
          const Icon = CATEGORY_ICONS[category] || ClipboardList;
          const questionsInCategory = QUESTIONS.filter(q => q.category === category);
          
          return (
            <section key={category} className="space-y-8">
              <div className="flex items-center space-x-4 border-b border-outline-variant/30 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-display-xs font-manrope font-bold text-on-surface">{category}</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {questionsInCategory.map(q => (
                  <div 
                    key={q.id}
                    className="group bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] border border-outline-variant/30 hover:shadow-ambient hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex flex-col space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-headline-xs font-manrope font-bold text-on-surface">{q.label}</h3>
                        <p className="text-body-sm text-on-surface-variant/70 font-medium">{q.description}</p>
                      </div>

                      <div className="relative">
                        <textarea
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={`Enter details for ${q.label.toLowerCase()}...`}
                          className="w-full bg-surface-container-low rounded-3xl p-6 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px] resize-none font-inter text-body-md"
                        />
                        
                        <div className="absolute right-4 bottom-4 flex items-center space-x-3">
                          {successId === q.id && (
                            <div className="flex items-center space-x-2 text-primary animate-in fade-in slide-in-from-right-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleSave(q.id)}
                            disabled={savingId === q.id}
                            className={`
                              flex items-center space-x-2 px-6 py-2.5 rounded-full font-bold text-label-md transition-all
                              ${savingId === q.id 
                                ? "bg-primary/20 text-primary cursor-wait" 
                                : "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"}
                            `}
                          >
                            {savingId === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span>{savingId === q.id ? "Saving..." : "Save Answer"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Floating Sticky Footer for Mobile? Maybe just trust the manual save for now as requested "static one" */}
    </div>
  );
}
