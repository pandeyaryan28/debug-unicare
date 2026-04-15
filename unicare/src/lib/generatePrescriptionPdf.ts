/**
 * generatePrescriptionPdf.ts
 * Shared, side-effect-free PDF builder for prescription downloads.
 * Used by both PrescriptionView (appointment flow) and PrescriptionsSection (tab).
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

// ─── Colour palette (matches app design tokens) ───────────────────────────────
const COLORS = {
  primary: [0, 88, 188] as [number, number, number],
  secondary: [0, 110, 40] as [number, number, number],
  tertiary: [138, 43, 185] as [number, number, number],
  text: [26, 28, 31] as [number, number, number],
  textMuted: [113, 119, 134] as [number, number, number],
  surface: [249, 249, 254] as [number, number, number],
  surfaceCard: [255, 255, 255] as [number, number, number],
  border: [193, 198, 215] as [number, number, number],
  primaryLight: [216, 226, 255] as [number, number, number],
};

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: [number, number, number],
  strokeColor?: [number, number, number]
) {
  doc.setFillColor(...fillColor);
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  } else {
    doc.setDrawColor(...fillColor);
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

function sectionLabel(doc: jsPDF, text: string, y: number, pageWidth: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(text.toUpperCase(), 20, y);
  // Rule line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(20 + doc.getTextWidth(text.toUpperCase()) + 4, y - 1, pageWidth - 20, y - 1);
  return y + 6;
}

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
 * Throws on failure so the caller can show an error toast.
 */
export async function generatePrescriptionPdf(input: PrescriptionPdfInput): Promise<void> {
  const {
    patientName,
    appointmentTitle,
    appointmentDate,
    doctorName,
    location,
    appointmentNotes,
    prescription,
    recordTitle,
    recordDate,
    provider,
  } = input;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  // ── Header banner ──────────────────────────────────────────────────────────
  drawRoundedRect(doc, 0, 0, pageWidth, 38, 0, COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("UniCare", marginX, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  doc.text("Health Wallet — Prescription", marginX, 23);

  // Badge: "PRESCRIPTION"
  drawRoundedRect(doc, pageWidth - 52, 8, 32, 10, 3, [30, 80, 180]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("PRESCRIPTION", pageWidth - 49, 14.5);

  y = 46;

  // ── Section: Patient ───────────────────────────────────────────────────────
  if (patientName) {
    y = sectionLabel(doc, "Patient", y, pageWidth);
    drawRoundedRect(doc, marginX, y, contentWidth, 16, 3, COLORS.surfaceCard, COLORS.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text(patientName, marginX + 6, y + 10);
    y += 22;
  }

  // ── Section: Appointment ───────────────────────────────────────────────────
  const hasApptData = appointmentTitle || appointmentDate || doctorName || location;
  if (hasApptData) {
    y = sectionLabel(doc, "Appointment", y, pageWidth);
    drawRoundedRect(doc, marginX, y, contentWidth, 38, 3, COLORS.surfaceCard, COLORS.border);

    let iy = y + 10;
    if (appointmentTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.text);
      doc.text(appointmentTitle, marginX + 6, iy);
      iy += 6;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const metaParts: string[] = [];
    if (doctorName) metaParts.push(`Dr. ${doctorName}`);
    if (appointmentDate) {
      const d = new Date(appointmentDate);
      metaParts.push(
        d.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    }
    if (location) metaParts.push(location);
    doc.text(metaParts.join("  ·  "), marginX + 6, iy + 1);
    y += 46;
  } else if (recordTitle) {
    // Doctor-uploaded record info
    y = sectionLabel(doc, "Record", y, pageWidth);
    drawRoundedRect(doc, marginX, y, contentWidth, 22, 3, COLORS.surfaceCard, COLORS.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text(recordTitle, marginX + 6, y + 10);
    if (provider || recordDate) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      const parts: string[] = [];
      if (provider) parts.push(provider);
      if (recordDate) parts.push(format(new Date(recordDate), "dd MMM yyyy"));
      doc.text(parts.join("  ·  "), marginX + 6, y + 17);
    }
    y += 28;
  }

  // ── Section: Appointment Notes ─────────────────────────────────────────────
  if (appointmentNotes) {
    y = sectionLabel(doc, "Appointment Notes", y, pageWidth);
    const boxHeight = Math.max(16, doc.splitTextToSize(appointmentNotes, contentWidth - 12).length * 5 + 10);
    drawRoundedRect(doc, marginX, y, contentWidth, boxHeight, 3, COLORS.primaryLight, COLORS.border);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    y = wrappedText(doc, appointmentNotes, marginX + 6, y + 8, contentWidth - 12, 5);
    y += 10;
  }

  // ── Section: Diagnosis ─────────────────────────────────────────────────────
  if (prescription?.diagnosis) {
    y = sectionLabel(doc, "Diagnosis", y, pageWidth);
    const diagLines = doc.splitTextToSize(prescription.diagnosis, contentWidth - 12);
    const boxHeight = Math.max(16, diagLines.length * 5 + 10);
    drawRoundedRect(doc, marginX, y, contentWidth, boxHeight, 3, COLORS.primaryLight, COLORS.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    y = wrappedText(doc, prescription.diagnosis, marginX + 6, y + 8, contentWidth - 12, 5);
    y += 10;
  }

  // ── Section: Medications ───────────────────────────────────────────────────
  if (prescription?.medications && prescription.medications.length > 0) {
    y = sectionLabel(doc, "Medications", y, pageWidth);

    const tableBody = prescription.medications.map((med, i) => [
      String(i + 1),
      med.name,
      med.timing.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", "),
      med.food === "after" ? "After food" : "Before food",
      `${med.days} day${med.days !== 1 ? "s" : ""}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Medicine", "Timing", "Food", "Duration"]],
      body: tableBody,
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.text,
        cellPadding: 4,
      },
      alternateRowStyles: { fillColor: COLORS.surface },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto", fontStyle: "bold" },
        2: { cellWidth: 35 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22, halign: "center" },
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.3,
      styles: { overflow: "linebreak" },
      didDrawPage: (data) => {
        // Re-draw header on new pages
        if (data.pageNumber > 1) {
          drawRoundedRect(doc, 0, 0, pageWidth, 14, 0, COLORS.primary);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text("UniCare Prescription (continued)", marginX, 9);
        }
      },
    });

    // @ts-ignore – autoTable attaches lastAutoTable to jsPDF instance
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  } else if (prescription) {
    y = sectionLabel(doc, "Medications", y, pageWidth);
    drawRoundedRect(doc, marginX, y, contentWidth, 14, 3, COLORS.surfaceCard, COLORS.border);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("No medications listed for this prescription.", marginX + 6, y + 9);
    y += 20;
  }

  // ── Section: Doctor's Notes ────────────────────────────────────────────────
  if (prescription?.notes) {
    y = sectionLabel(doc, "Doctor's Notes", y, pageWidth);
    const noteLines = doc.splitTextToSize(prescription.notes, contentWidth - 12);
    const boxHeight = Math.max(16, noteLines.length * 5 + 10);
    // Ensure we don't overflow page
    if (y + boxHeight > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    drawRoundedRect(doc, marginX, y, contentWidth, boxHeight, 3, COLORS.surfaceCard, COLORS.border);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    y = wrappedText(doc, prescription.notes, marginX + 6, y + 8, contentWidth - 12, 5);
    y += 10;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 12;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(
      `Generated by UniCare Health Wallet · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      marginX,
      footerY
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, footerY, { align: "right" });
  }

  // ── File name & save ───────────────────────────────────────────────────────
  const namePart = toFilenameSlug(patientName || "patient");
  const datePart = appointmentDate
    ? format(new Date(appointmentDate), "yyyy-MM-dd")
    : recordDate
    ? format(new Date(recordDate), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  doc.save(`prescription_${namePart}_${datePart}.pdf`);
}
