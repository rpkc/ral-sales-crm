/**
 * PI helpers — shared lookup utilities for PI-aware UI widgets
 * (Counselor PI Pending widget, Admissions auto-PI prompt, etc.)
 */
import { getFinance, piOpenBalance } from "./finance-store";
import type { Invoice } from "./finance-types";

/** Statuses considered "still open" for a PI (i.e. money not yet realized). */
const OPEN_PI_STATUSES = new Set<Invoice["status"]>(["Sent", "Draft", "Partial", "Overdue"]);

export interface PiPendingRow {
  invoice: Invoice;
  studentName: string;
  course: string;
  piNo: string;
  amount: number;
  openBalance: number;
  dueDate: string;
  daysOverdue: number;
}

/**
 * Resolve all open PIs whose customer is a student belonging to the given counselor.
 * We map by student name match against leads owned by the counselor (mock data).
 */
export function getPiPendingForCounselor(
  counselorId: string,
  studentNames: string[],
): PiPendingRow[] {
  const fin = getFinance();
  const today = Date.now();
  const nameSet = new Set(studentNames.map(n => n.trim().toLowerCase()));

  return fin.invoices
    .filter(i =>
      i.invoiceType === "PI" &&
      OPEN_PI_STATUSES.has(i.status) &&
      nameSet.has(i.customerName.trim().toLowerCase()),
    )
    .map(invoice => {
      const due = new Date(invoice.dueDate).getTime();
      const daysOverdue = Math.max(0, Math.floor((today - due) / 86400000));
      return {
        invoice,
        studentName: invoice.customerName,
        course: invoice.programName || "—",
        piNo: invoice.invoiceNo,
        amount: invoice.total,
        openBalance: piOpenBalance(invoice.id),
        dueDate: invoice.dueDate,
        daysOverdue,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface PiPendingSummary {
  pendingStudents: number;
  totalPiAmount: number;
  totalOpenBalance: number;
  overdueCount: number;
  dueTodayCount: number;
}

export function summarizePiPending(rows: PiPendingRow[]): PiPendingSummary {
  const todayKey = new Date().toDateString();
  const students = new Set(rows.map(r => r.studentName.toLowerCase()));
  return {
    pendingStudents: students.size,
    totalPiAmount: rows.reduce((s, r) => s + r.amount, 0),
    totalOpenBalance: rows.reduce((s, r) => s + r.openBalance, 0),
    overdueCount: rows.filter(r => r.daysOverdue > 0).length,
    dueTodayCount: rows.filter(r => new Date(r.dueDate).toDateString() === todayKey).length,
  };
}

/** Find any open PI for a given student name (case-insensitive). */
export function findOpenPiForStudent(studentName: string): Invoice | null {
  const fin = getFinance();
  const key = studentName.trim().toLowerCase();
  return fin.invoices.find(i =>
    i.invoiceType === "PI" &&
    OPEN_PI_STATUSES.has(i.status) &&
    i.customerName.trim().toLowerCase() === key,
  ) || null;
}
