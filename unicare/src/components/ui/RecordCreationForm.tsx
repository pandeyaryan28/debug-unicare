"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { X, Upload, FileText, AlertCircle, Loader2, Tag } from "lucide-react";
import { uploadRecord, updateRecord, RecordType, HealthRecord } from "@/services/recordsService";
import { useProfile } from "../auth/ProfileContext";

interface RecordCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialRecord?: HealthRecord;
}

export default function RecordCreationForm({ onClose, onSuccess, initialRecord }: RecordCreationFormProps) {
  const isEdit = !!initialRecord;
  const { activeProfile } = useProfile();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initialRecord?.title || "");
  const [provider, setProvider] = useState(initialRecord?.provider || "");
  const [type, setType] = useState<RecordType>(initialRecord?.type || "general");
  const [date, setDate] = useState(
    initialRecord?.date 
      ? new Date(initialRecord.date).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  const [tags, setTags] = useState<string[]>(initialRecord?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(initialRecord?.notes || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please upload a PDF or an image (JPG/PNG).");
        return;
      }
      setFile(selectedFile);
      setError(null);
      if (!title) setTitle(selectedFile.name.split(".")[0]);
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/,/g, "");
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!title || !provider) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!activeProfile) {
      setError("No active profile selected.");
      return;
    }

    setUploading(true);
    setError(null);
    let interval: any;

    try {
      if (isEdit) {
        // Just update metadata (file remains same)
        await updateRecord(initialRecord!.id, {
          title,
          provider,
          type,
          date: new Date(date),
          tags,
          notes: notes || undefined,
        });
      } else {
        // Upload new file
        interval = setInterval(() => setProgress((p) => Math.min(p + 5, 90)), 150);
        await uploadRecord(file!, {
          title,
          provider,
          type,
          date: new Date(date),
          profileId: activeProfile.id,
          tags,
          notes: notes || undefined,
        });
        clearInterval(interval);
      }
      
      setProgress(100);
      setTimeout(() => { 
        onSuccess(); 
        onClose(); 
      }, 600);
    } catch (err: any) {
      if (interval) clearInterval(interval);
      console.error("Operation failed:", err);
      setError(err.message || "Failed to save record. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest w-full max-w-xl rounded-[3rem] shadow-ambient overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <header className="p-6 md:p-8 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-headline-md font-manrope font-bold text-on-surface">
                {isEdit ? "Edit Record" : "Add Record"}
              </h2>
              {activeProfile && (
                <p className="text-[10px] md:text-label-sm font-bold text-on-surface-variant/70">
                  For <span className="text-primary">{activeProfile.name}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto no-scrollbar space-y-5 md:space-y-6">
          {error && (
            <div className="flex items-center space-x-3 p-4 bg-error-container text-on-error-container rounded-[1.5rem] animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-label-md font-medium">{error}</p>
            </div>
          )}

          {!isEdit && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-[2rem] p-6 md:p-10 text-center transition-all cursor-pointer group ${
                file ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary hover:bg-surface-container-high"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7 md:w-8 md:h-8" />
                  </div>
                  <p className="text-body-md md:text-body-lg font-bold text-on-surface truncate max-w-[200px] md:max-w-xs">{file.name}</p>
                  <p className="text-[11px] md:text-label-md text-on-surface-variant mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-3 text-error font-bold text-[10px] md:text-label-md uppercase tracking-wider hover:underline"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <p className="text-body-md md:text-body-lg font-bold text-on-surface">Tap to upload document</p>
                  <p className="text-[11px] md:text-label-md text-on-surface-variant mt-1">PDF, JPG, PNG supported</p>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[10px] md:text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-2 md:mb-3 ml-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test October 2023"
              className="w-full bg-surface-container-high rounded-[1.25rem] md:rounded-[1.5rem] p-4 md:p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-inter placeholder:text-outline-variant text-[15px] md:text-body-lg shadow-sm"
            />
          </div>

          {/* Provider + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-[10px] md:text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-2 md:mb-3 ml-1">
                Provider / Lab *
              </label>
              <input
                type="text"
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Apollo Diagnostics"
                className="w-full bg-surface-container-high rounded-[1.25rem] md:rounded-[1.5rem] p-4 md:p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-inter placeholder:text-outline-variant text-[15px] md:text-body-lg shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-2 md:mb-3 ml-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container-high rounded-[1.25rem] md:rounded-[1.5rem] p-4 md:p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-inter text-[15px] md:text-body-lg shadow-sm"
              />
            </div>
          </div>

          {/* Record type */}
          <div>
            <label className="block text-[10px] md:text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-2 md:mb-3 ml-1">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(["prescription", "lab", "imaging", "general"] as RecordType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setType(cat)}
                  className={`px-3 py-3 rounded-2xl text-[10px] md:text-label-md font-bold uppercase tracking-wider transition-all break-words ${
                    type === cat
                      ? "bg-on-surface text-surface shadow-md scale-105"
                      : "bg-surface-container-low text-on-surface active:bg-surface-container-high"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> Tags
              <span className="normal-case tracking-normal font-medium opacity-60">(press Enter to add)</span>
            </label>
            <div className="min-h-[56px] w-full bg-surface-container-high rounded-[1.5rem] p-4 flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-bold"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? "diabetes, cardiology, follow-up..." : ""}
                className="flex-1 min-w-[120px] bg-transparent text-on-surface focus:outline-none font-inter placeholder:text-outline-variant text-body-md"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-label-md font-bold tracking-widest text-on-surface-variant uppercase mb-3 ml-1">
              Notes <span className="normal-case tracking-normal font-medium opacity-60">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes about this record..."
              className="w-full bg-surface-container-high rounded-[1.5rem] p-5 text-on-surface focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-inter placeholder:text-outline-variant text-body-lg shadow-sm resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 shrink-0">
            {uploading ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-label-md font-bold text-primary animate-pulse">Uploading...</p>
                  <p className="text-label-md font-bold text-primary">{Math.round(progress)}%</p>
                </div>
                <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={(!isEdit && !file) || !title || !provider}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-5 rounded-full font-bold text-headline-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex justify-center items-center"
              >
                {isEdit ? "Update Record Details" : "Save Record Securely"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
