/**
 * generatePrescriptionPdf.ts
 * Shared, side-effect-free PDF builder for prescription downloads.
 * Updated to match the specific layout seen in doctors-unicare EMR.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Prescription } from "@/services/appointmentsService";

export interface PrescriptionPdfInput {
  /** Active patient/profile name */
  patientName?: string | null;
  /** Appointment title (optional, from appointment flow) */
  appointmentTitle?: string | null;
  /** ISO date string of appointment */
  appointmentDate?: string | null;
  /** Doctor name */
  doctorName?: string | null;
  /** Clinic location */
  location?: string | null;
  /** Appointment notes */
  appointmentNotes?: string | null;
  /** Structured prescription data from DB */
  prescription: Prescription | null;
  /** For doctor-uploaded records: record title */
  recordTitle?: string | null;
  /** For doctor-uploaded records: ISO date */
  recordDate?: string | null;
  /** For doctor-uploaded records: provider name */
  provider?: string | null;
}

// ─── Colour palette (matching the provided design) ─────────────────────────
const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // #2563eb (Royal Blue)
  text: [31, 41, 55] as [number, number, number], // #1f2937 (Dark Gray)
  textLight: [255, 255, 255] as [number, number, number],
  textMute: [107, 114, 128] as [number, number, number], // #6b7280 (Gray)
  bgHeader: [37, 99, 235] as [number, number, number],
  bgInfoBox: [249, 250, 251] as [number, number, number], // #f9fafb (Very Light Gray)
  border: [229, 231, 235] as [number, number, number], // #e5e7eb
};

/**
 * Draw a text block that wraps and returns the updated Y position
 */
function wrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Sanitise a string for use in a filename */
function toFilenameSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generates and triggers a download of a prescription PDF.
 */
export async function generatePrescriptionPdf(input: PrescriptionPdfInput): Promise<void> {
  const {
    patientName,
    appointmentDate,
    doctorName,
    location,
    appointmentNotes,
    prescription,
    recordDate,
    provider,
  } = input;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  // 1. Top Banner (Blue Background)
  doc.setFillColor(...COLORS.bgHeader);
  doc.rect(0, 0, pageWidth, 40, "F");

  // App Name (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.textLight);
  doc.text("Unicare", marginX, 24);

  // Doctor Info (Right)
  const dName = doctorName || provider || "DR. UNKNOWN";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(dName.toUpperCase().startsWith("DR.") ? dName.toUpperCase() : `DR. ${dName.toUpperCase()}`, pageWidth - marginX, 18, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("General Physician", pageWidth - marginX, 24, { align: "right" });
  
  if (location) {
    doc.setFontSize(8);
    doc.text(location, pageWidth - marginX, 29, { align: "right" });
  }

  y = 50;

  // 2. Patient Info Box
  doc.setFillColor(...COLORS.bgInfoBox);
  doc.rect(marginX, y, contentWidth, 24, "F");

  const boxY = y + 8;
  // Patient Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMute);
  doc.text("PATIENT NAME", marginX + 6, boxY);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text((patientName || "UNKNOWN").toUpperCase(), marginX + 6, boxY + 6);

  // Age / Gender
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMute);
  doc.text("AGE / GENDER", marginX + 68, boxY);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text("N/A / NOT SPECIFIED", marginX + 68, boxY + 6);

  // Patient ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMute);
  doc.text("PATIENT ID", marginX + 118, boxY);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  // Generate a fake PID from name if missing
  const dummyId = patientName ? `#${btoa(patientName).substring(0,8).toUpperCase()}` : "#N/A";
  doc.text(dummyId, marginX + 118, boxY + 6);

  // Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMute);
  doc.text("DATE", marginX + 152, boxY);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  const dateStr = appointmentDate 
    ? format(new Date(appointmentDate), "d/M/yyyy") 
    : recordDate 
    ? format(new Date(recordDate), "d/M/yyyy")
    : format(new Date(), "d/M/yyyy");
  doc.text(dateStr, marginX + 152, boxY + 6);

  y += 38;

  // 3. Huge "Rx" Symbol
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.primary);
  doc.text("Rx", marginX, y);

  y += 18;

  // 4. Chief Complaints
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text("CHIEF COMPLAINTS:", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMute);
  y = wrappedText(doc, appointmentNotes || "None reported", marginX, y, contentWidth, 5);
  
  y += 6;

  // 5. Diagnosis
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text("DIAGNOSIS:", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMute);
  y = wrappedText(doc, prescription?.diagnosis || "Clinical evaluation pending", marginX, y, contentWidth, 5);
  
  y += 8;

  // 6. Doctor's Notes (Optional)
  if (prescription?.notes) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text("NOTES:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textMute);
    y = wrappedText(doc, prescription.notes, marginX, y, contentWidth, 5);
    y += 8;
  }

  // 7. Medications Table
  const tableBody = (prescription?.medications || []).map((med) => [
    med.name,
    med.timing.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", "),
    med.food === "after" ? "After food" : "Before food",
    `${med.days} day${med.days !== 1 ? "s" : ""}`,
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [["Medicine", "Timing", "Food", "Duration"]],
    body: tableBody,
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: "auto" },
    },
    theme: "plain", // Removes automatic borders/stripes
    didDrawCell: (data) => {
      // If we wanted to draw anything specifically inside the cells
    },
  });

  // 8. Footer (Fixed at bottom)
  const footerY = pageHeight - 35;
  
  // Custom separator line for footer (very subtle)
  doc.setDrawColor(240, 240, 240);
  doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // #9ca3af Very light gray
  doc.text("This is a digitally generated prescription. Valid only with doctor seal/signature.", pageWidth / 2, footerY, { align: "center" });
  
  // Generate random hash for dummy security hash
  const hash = btoa(`${patientName}-${appointmentDate || Date.now()}`).replace(/=/g, '').substring(0, 16);
  doc.text(`UniCare EMR Security Hash: ${hash}`, pageWidth / 2, footerY + 5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text("Digitally Signed by:", pageWidth - marginX, footerY + 14, { align: "right" });
  doc.text(dName.toUpperCase().startsWith("DR.") ? dName.toUpperCase() : `DR. ${dName.toUpperCase()}`, pageWidth - marginX, footerY + 19, { align: "right" });

  // ── File name & save ───────────────────────────────────────────────────────
  const namePart = toFilenameSlug(patientName || "patient");
  const datePart = appointmentDate
    ? format(new Date(appointmentDate), "yyyy-MM-dd")
    : recordDate
    ? format(new Date(recordDate), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  doc.save(`prescription_${namePart}_${datePart}.pdf`);
}
