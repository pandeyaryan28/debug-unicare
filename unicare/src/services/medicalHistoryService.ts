import { supabase } from "@/lib/supabase";

export interface MedicalHistoryEntry {
  id?: string;
  profile_id: string;
  question_id: string;
  answer: string;
  updated_at?: string;
  question?: string; // Virtual field for UI
}

export const QUESTIONS = [
  { id: "past_history", category: "History", label: "Past medical history", description: "Illnesses, chronic conditions, long-term treatments" },
  { id: "surgeries", category: "History", label: "Previous surgeries and hospitalizations", description: "Dates and reasons for any past surgical procedures" },
  { id: "family_history", category: "Family", label: "Family medical history", description: "Conditions prevalent in close relatives" },
  { id: "lifestyle", category: "Lifestyle", label: "Lifestyle details", description: "Smoking, alcohol, diet, exercise habits" },
  { id: "current_symptoms", category: "Current", label: "Current symptoms and complaints", description: "What are you feeling right now?" },
  { id: "symptom_details", category: "Current", label: "Duration and severity of symptoms", description: "How long has this been happening?" },
  { id: "medications", category: "Medications", label: "Current medications", description: "Include dosages and any supplements/vitamins" },
  { id: "past_prescriptions", category: "Medications", label: "Past prescriptions", description: "Significant medications taken in the past" },
  { id: "drug_allergies", category: "Allergies", label: "Drug allergies", description: "Any adverse reactions to medications" },
  { id: "blood_tests", category: "Reports", label: "Blood test reports", description: "CBC, sugar, lipid profile, etc." },
  { id: "urine_tests", category: "Reports", label: "Urine test reports", description: "Recent urinalysis results" },
  { id: "organ_function", category: "Reports", label: "Organ function reports", description: "Thyroid, liver, and kidney function results" },
  { id: "imaging", category: "Diagnostics", label: "Imaging reports", description: "X-ray, MRI, CT scan, ultrasound" },
  { id: "heart_reports", category: "Diagnostics", label: "Heart-related reports", description: "ECG, Echo, etc." },
  { id: "vital_signs", category: "Vitals", label: "Recent vital signs", description: "Blood pressure, heart rate, temperature" },
  { id: "physicals", category: "Vitals", label: "Body measurements", description: "Weight, height, and BMI records" },
  { id: "vaccinations", category: "Preventive", label: "Vaccination history", description: "Immunization records and boosters" },
  { id: "screenings", category: "Preventive", label: "Preventive screening reports", description: "Cancer screenings, eye tests, etc." },
  { id: "consultations", category: "Advanced", label: "Specialist consultation reports", description: "Summary of visits to specialists" },
  { id: "discharge_summaries", category: "Advanced", label: "Hospital discharge summaries", description: "Records from past hospital stays" },
  { id: "treatment_plans", category: "Advanced", label: "Ongoing treatment plans", description: "Current protocols or therapy schedules" },
  { id: "insurance", category: "Admin", label: "Health insurance details", description: "Provider and policy information" },
  { id: "admin_records", category: "Admin", label: "Medical bills & admin records", description: "Invoices or administrative documentation" },
];

export const getMedicalHistory = async (profileId: string): Promise<MedicalHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('medical_history')
    .select('*')
    .eq('profile_id', profileId);

  if (error) throw error;
  
  // Map labels to entries
  const results = data || [];
  return results.map(entry => ({
    ...entry,
    question: QUESTIONS.find(q => q.id === entry.question_id)?.label || entry.question_id
  }));
};

export const saveMedicalHistoryEntry = async (entry: MedicalHistoryEntry) => {
  const { data, error } = await supabase
    .from('medical_history')
    .upsert({
      profile_id: entry.profile_id,
      question_id: entry.question_id,
      answer: entry.answer,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'profile_id,question_id'
    })
    .select();

  if (error) throw error;
  return data[0];
};
