"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Activity, Microscope, Share2, MoreVertical, Plus, Eye,
  Loader2, Search, SortDesc, Tag, X, ChevronDown, ArrowUpDown,
  Edit, Trash2, AlertTriangle, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { getProfileRecords, HealthRecord, RecordType, deleteRecord } from "@/services/recordsService";
import RecordCreationForm from "./RecordCreationForm";
import ShareRecordModal from "./ShareRecordModal";
import { useProfile } from "../auth/ProfileContext";

type SortOption = "date_desc" | "date_asc" | "title_asc" | "title_desc" | "type";

const getIconForType = (type: RecordType) => {
  switch (type) {
    case "prescription": return <FileText className="w-5 h-5 text-tertiary" />;
    case "lab": return <Microscope className="w-5 h-5 text-secondary" />;
    case "imaging": return <Activity className="w-5 h-5 text-primary" />;
    default: return <FileText className="w-5 h-5 text-on-surface-variant" />;
  }
};

const getBgForType = (type: RecordType) => {
  switch (type) {
    case "prescription": return "bg-tertiary-container text-on-tertiary-container shadow-[0_0_15px_rgba(var(--tertiary-rgb),0.2)]";
    case "lab": return "bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(var(--secondary-rgb),0.2)]";
    case "imaging": return "bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]";
    default: return "bg-surface-container-high text-on-surface-variant";
  }
};

const SORT_LABELS: Record<SortOption, string> = {
  date_desc: "Newest First",
  date_asc: "Oldest First",
  title_asc: "Title A→Z",
  title_desc: "Title Z→A",
  type: "By Type",
};

export default function RecordsList() {
  const { activeProfile } = useProfile();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<RecordType | "all">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedShareRecord, setSelectedShareRecord] = useState<HealthRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<HealthRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<HealthRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRecords = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const data = await getProfileRecords(activeProfile.id);
      setRecords(data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      setRecords([]);
      setSearchQuery("");
      setActiveTags([]);
      setActiveFilter("all");
      fetchRecords();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  // All unique tags from records
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    records.forEach((r) => (r.tags || []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [records]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = records.filter((record) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        record.title.toLowerCase().includes(q) ||
        record.provider.toLowerCase().includes(q) ||
        (record.notes || "").toLowerCase().includes(q) ||
        (record.tags || []).some((t) => t.toLowerCase().includes(q));

      const matchesType = activeFilter === "all" || record.type === activeFilter;

      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((t) => (record.tags || []).includes(t));

      return matchesSearch && matchesType && matchesTags;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date_desc": return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date_asc": return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "title_asc": return a.title.localeCompare(b.title);
        case "title_desc": return b.title.localeCompare(a.title);
        case "type": return a.type.localeCompare(b.type);
        default: return 0;
      }
    });

    return result;
  }, [records, searchQuery, activeFilter, activeTags, sortBy]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      setDeleting(true);
      await deleteRecord(recordToDelete);
      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
    } catch (error) {
      console.error("Failed to delete record:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="font-sans mt-8 w-full">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="space-y-2">
          <h2 className="text-display-xs md:text-display-sm font-manrope font-bold text-on-surface">
            {activeProfile ? `${activeProfile.name}'s Records` : "Records"}
          </h2>
          <p className="text-body-sm md:text-body-md text-on-surface-variant font-medium">
            {records.length} document{records.length !== 1 ? "s" : ""} securely stored.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-low rounded-full py-3.5 pl-11 pr-4 text-label-md font-bold focus:outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all w-full sm:w-48 md:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="w-full flex items-center justify-between sm:justify-start gap-2 px-5 py-3.5 bg-surface-container-low rounded-full text-label-md font-bold text-on-surface hover:bg-surface-container-high transition-all border border-white/30"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  <span>{SORT_LABELS[sortBy]}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest rounded-[1.5rem] shadow-ambient z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 border border-white/60 p-2">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-label-md font-bold transition-all ${
                          sortBy === opt ? "bg-primary/10 text-primary" : "hover:bg-surface-container-low text-on-surface"
                        }`}
                      >
                        {SORT_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Add record button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center w-[52px] h-[52px] bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-ambient hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex space-x-3 overflow-x-auto pb-3 mb-1 no-scrollbar">
        {(["all", "prescription", "lab", "imaging", "general"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-6 py-2.5 rounded-full whitespace-nowrap text-label-md font-bold uppercase tracking-wider transition-all shadow-sm ${
              activeFilter === filter
                ? "bg-on-surface text-surface scale-105"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pb-4 mb-2">
          <Tag className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-label-sm font-bold transition-all ${
                activeTags.includes(tag)
                  ? "bg-primary text-on-primary scale-105 shadow-sm"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="px-3 py-1 rounded-full text-label-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-[3rem] shadow-ambient border border-outline-variant/20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">
            Synchronizing...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((record) => (
            <div
              key={record.id}
              className={`group bg-surface-container-lowest p-6 rounded-[2.5rem] shadow-ambient hover:shadow-xl transition-all relative border border-outline-variant/20 hover:border-primary/20 ${activeMenuId === record.id ? "z-30" : "z-10"}`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:space-x-5">
                <div className="flex items-start justify-between md:justify-start space-x-5 w-full">
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${getBgForType(record.type)}`}
                  >
                    {getIconForType(record.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-manrope font-bold text-on-surface truncate pr-4">
                      {record.title}
                    </h3>
                    <div className="flex items-center flex-wrap gap-y-1 mt-1">
                      <p className="text-body-sm md:text-body-md font-bold text-on-surface-variant/80">
                        {record.provider}
                      </p>
                      <span className="mx-2 w-1 h-1 rounded-full bg-outline-variant opacity-40 shrink-0" />
                      <p className="text-[10px] md:text-label-md font-bold text-on-surface-variant/60 uppercase tracking-wider">
                        {format(new Date(record.date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Desktop Actions Row (Hover) */}
                  <div className="hidden md:flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => window.open(record.file_url, "_blank")}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-primary hover:text-white transition-all"
                      title="View Document"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedShareRecord(record)}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high text-secondary hover:bg-secondary hover:text-white transition-all"
                      title="Share Record"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          activeMenuId === record.id ? "bg-on-surface text-surface" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        }`}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {activeMenuId === record.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest rounded-[1.5rem] shadow-ambient z-20 overflow-hidden border border-white/60 p-2">
                          <button onClick={() => { setRecordToEdit(record); setActiveMenuId(null); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-label-md font-bold hover:bg-surface-container-low transition-all"><Edit className="w-4 h-4 text-primary" /><span>Edit</span></button>
                          <button onClick={() => { setRecordToDelete(record); setActiveMenuId(null); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-label-md font-bold text-error hover:bg-error/10 transition-all"><Trash2 className="w-4 h-4" /><span>Delete</span></button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Mobile More Button */}
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
                    className="md:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-stretch md:items-start md:space-x-5">
                   {/* Tags and Notes (Mobile Row) */}
                   <div className="flex-1">
                    {record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 md:mt-3">
                        {record.tags.map((tag) => (
                          <span key={tag} className="px-2.5 py-0.5 bg-primary/8 text-primary text-[10px] md:text-label-sm font-bold rounded-full border border-primary/15">{tag}</span>
                        ))}
                      </div>
                    )}
                    {record.notes && (
                      <p className="mt-2 text-label-sm text-on-surface-variant/70 line-clamp-2 md:line-clamp-1 font-medium">
                        {record.notes}
                      </p>
                    )}
                  </div>

                  {/* Mobile Actions Row */}
                  <div className="md:hidden flex items-center gap-3 mt-5 pt-4 border-t border-outline-variant/10">
                    <button
                      onClick={() => window.open(record.file_url, "_blank")}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-primary/10 text-primary font-bold text-label-md active:bg-primary/20 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => setSelectedShareRecord(record)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-secondary/10 text-secondary font-bold text-label-md active:bg-secondary/20 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {activeMenuId === record.id && (
                  <div className="md:hidden fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="fixed inset-0" onClick={() => setActiveMenuId(null)} />
                    <div className="bg-surface-container-lowest w-full rounded-t-[2.5rem] p-6 shadow-ambient relative animate-in slide-in-from-bottom duration-400">
                      <div className="w-12 h-1.5 bg-outline-variant/20 rounded-full mx-auto mb-6" />
                      <div className="space-y-4">
                        <button onClick={() => { setRecordToEdit(record); setActiveMenuId(null); }} className="w-full flex items-center space-x-4 p-5 rounded-[1.5rem] bg-surface-container-low text-on-surface font-bold text-body-lg active:scale-95 transition-all"><Edit className="w-6 h-6 text-primary" /><span>Edit Record</span></button>
                        <button onClick={() => { setRecordToDelete(record); setActiveMenuId(null); }} className="w-full flex items-center space-x-4 p-5 rounded-[1.5rem] bg-error/10 text-error font-bold text-body-lg active:scale-95 transition-all"><Trash2 className="w-6 h-6" /><span>Delete Record</span></button>
                        <button onClick={() => setActiveMenuId(null)} className="w-full p-5 text-on-surface-variant font-bold text-body-lg">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredAndSorted.length === 0 && (
            <div className="text-center py-20 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/30">
              <Activity className="w-16 h-16 text-outline mx-auto mb-6 opacity-20" />
              <h3 className="text-headline-md font-manrope font-bold text-on-surface mb-2">
                No records found
              </h3>
              <p className="text-body-lg text-on-surface-variant font-medium">
                {searchQuery || activeTags.length > 0
                  ? "Try a different search term or filter"
                  : "Your digital sanctuary is empty. Start by adding a record."}
              </p>
              {!searchQuery && activeTags.length === 0 && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-8 px-8 py-4 bg-primary text-on-primary rounded-full font-bold text-label-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Add Your First Record
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isAddModalOpen && (
        <RecordCreationForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchRecords}
        />
      )}

      {recordToEdit && (
        <RecordCreationForm
          initialRecord={recordToEdit}
          onClose={() => setRecordToEdit(null)}
          onSuccess={fetchRecords}
        />
      )}

      {selectedShareRecord && (
        <ShareRecordModal
          record={selectedShareRecord}
          onClose={() => setSelectedShareRecord(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-[2.5rem] shadow-ambient overflow-hidden p-8 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-display-xs font-manrope font-bold text-on-surface mb-2">
              Delete Record?
            </h3>
            <p className="text-body-md text-on-surface-variant mb-8">
              Are you sure you want to delete <span className="font-bold text-on-surface">"{recordToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRecordToDelete(null)}
                disabled={deleting}
                className="flex-1 py-4 rounded-full font-bold text-label-lg text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 rounded-full font-bold text-label-lg text-on-error bg-error hover:bg-error/90 transition-all flex justify-center items-center shadow-lg shadow-error/20"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
