/**
 * PI/TI Notification Stubs
 * Toast + audit log entries on lifecycle events. No real channels — wired to
 * sonner toast + finance-store logs.
 */
import { toast } from "sonner";
import type { Invoice } from "./finance-types";
import { fmtINR } from "@/components/finance/FinanceKpi";

export type PiTiEvent =
  | "PI_due_today"
  | "PI_overdue_3_days"
  | "TI_generated_successfully"
  | "PI_converted_to_TI"
  | "high_value_PI_pending"
  | "mapping_error_detected";

const KEY = "ral_pi_ti_notifs_v1";

export interface NotifEntry {
  id: string;
  event: PiTiEvent;
  message: string;
  invoiceId?: string;
  invoiceNo?: string;
  amount?: number;
  at: string;
  channel: "in_app" | "email_ready" | "whatsapp_ready";
}

type Listener = () => void;
const listeners = new Set<Listener>();

function load(): NotifEntry[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
let state: NotifEntry[] = typeof window !== "undefined" ? load() : [];

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state.slice(0, 200))); } catch {}
  listeners.forEach(l => l());
}

export function subscribePiTiNotifs(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getPiTiNotifs() { return state; }

const HIGH_VALUE = 250000;

function emit(entry: Omit<NotifEntry, "id" | "at" | "channel">, channel: NotifEntry["channel"] = "in_app") {
  const e: NotifEntry = {
    ...entry,
    id: `ntf_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    at: new Date().toISOString(),
    channel,
  };
  state = [e, ...state];
  save();
  return e;
}

/* ───── Public emitters used by dialogs / hooks ───── */

export function notifyTiGenerated(ti: Invoice) {
  const e = emit({ event: "TI_generated_successfully", message: `Tax Invoice ${ti.invoiceNo} generated · ${fmtINR(ti.total)}`, invoiceId: ti.id, invoiceNo: ti.invoiceNo, amount: ti.total });
  toast.success(e.message);
  return e;
}

export function notifyPiConverted(pi: Invoice, ti: Invoice, linkedAmount: number) {
  const e = emit({ event: "PI_converted_to_TI", message: `${pi.invoiceNo} → ${ti.invoiceNo} · ${fmtINR(linkedAmount)} converted`, invoiceId: pi.id, invoiceNo: pi.invoiceNo, amount: linkedAmount });
  toast.success(e.message);
  if (pi.total >= HIGH_VALUE) {
    notifyHighValuePi(pi, "converted");
  }
  return e;
}

export function notifyHighValuePi(pi: Invoice, context: "created" | "pending" | "converted" = "pending") {
  if (pi.total < HIGH_VALUE) return null;
  const msg = context === "created"
    ? `High-value PI ${pi.invoiceNo} created · ${fmtINR(pi.total)}`
    : context === "converted"
    ? `High-value PI ${pi.invoiceNo} converted · ${fmtINR(pi.total)}`
    : `High-value PI pending: ${pi.invoiceNo} · ${fmtINR(pi.total)}`;
  const e = emit({ event: "high_value_PI_pending", message: msg, invoiceId: pi.id, invoiceNo: pi.invoiceNo, amount: pi.total });
  toast.warning(e.message);
  return e;
}

export function notifyMappingError(message: string, invoiceNo?: string) {
  const e = emit({ event: "mapping_error_detected", message: `Mapping error: ${message}`, invoiceNo });
  toast.error(e.message);
  return e;
}

/**
 * Scan invoices and emit due/overdue alerts for PIs. Idempotent within a session
 * via in-memory dedupe set keyed on `${event}:${invoiceId}:${dateKey}`.
 */
const seen = new Set<string>();
export function scanPiDueAlerts(invoices: Invoice[]) {
  const todayKey = new Date().toDateString();
  const now = Date.now();
  const out: NotifEntry[] = [];
  invoices.forEach(i => {
    if (i.invoiceType !== "PI") return;
    if (i.status === "Cancelled" || i.status === "Converted" || i.status === "Paid") return;
    const due = new Date(i.dueDate);
    const dueKey = due.toDateString();
    const dayDelta = Math.floor((now - due.getTime()) / 86400000);

    if (dueKey === todayKey) {
      const k = `due:${i.id}:${todayKey}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(emit({ event: "PI_due_today", message: `${i.invoiceNo} due today · ${fmtINR(i.total)} from ${i.customerName}`, invoiceId: i.id, invoiceNo: i.invoiceNo, amount: i.total }));
      }
    }
    if (dayDelta >= 3 && dayDelta <= 4) {
      const k = `od3:${i.id}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(emit({ event: "PI_overdue_3_days", message: `${i.invoiceNo} overdue 3d · ${fmtINR(i.total)} from ${i.customerName}`, invoiceId: i.id, invoiceNo: i.invoiceNo, amount: i.total }));
      }
    }
    if (i.total >= HIGH_VALUE && dayDelta >= 0) {
      const k = `hv:${i.id}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(emit({ event: "high_value_PI_pending", message: `High-value PI pending: ${i.invoiceNo} · ${fmtINR(i.total)}`, invoiceId: i.id, invoiceNo: i.invoiceNo, amount: i.total }));
      }
    }
  });
  return out;
}
