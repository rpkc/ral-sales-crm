/**
 * Invoice Edit Store
 * - Tracks every owner / manager edit to an invoice.
 * - Stores old → new field deltas + reason + actor + timestamp.
 * - Persists in localStorage. Drives "Edits Today", "High-value Changes",
 *   "Recent Owner Changes" dashboard tiles.
 *
 * Companion to finance-store.ts (which mutates the invoice itself) and
 * invoice-dispatch-store.ts (which we mark "superseded" on edit).
 */
import type { Invoice } from "./finance-types";

export type InvoiceEditAction = "edit" | "cancel" | "clone" | "convert_pi_to_ti" | "regenerate";

export interface InvoiceEditEntry {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  action: InvoiceEditAction;
  oldValues: Partial<Invoice>;
  newValues: Partial<Invoice>;
  reason: string;
  amountAfter: number;
  amountDelta: number;       // newTotal - oldTotal
  highValue: boolean;        // newTotal > 250000 OR oldTotal > 250000
  reauthConfirmed: boolean;  // typed-CONFIRM reauth?
  approvalId?: string;       // when manager edits high-value invoice
  editedBy: string;
  editedByName?: string;
  editedByRole?: string;
  at: string;
  device?: string;
}

const KEY = "ral_invoice_edits_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

interface State { entries: InvoiceEditEntry[]; }

const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const nowIso = () => new Date().toISOString();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { entries: [] };
}

let state: State = typeof window !== "undefined" ? load() : { entries: [] };

function save(s: State) {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export function subscribeInvoiceEdits(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getInvoiceEdits(): InvoiceEditEntry[] {
  return state.entries;
}

export function editsForInvoice(invoiceId: string): InvoiceEditEntry[] {
  return state.entries.filter(e => e.invoiceId === invoiceId);
}

export const HIGH_VALUE_THRESHOLD = 250000;

export interface RecordEditInput {
  invoiceId: string;
  invoiceNo: string;
  action: InvoiceEditAction;
  oldValues: Partial<Invoice>;
  newValues: Partial<Invoice>;
  oldTotal: number;
  newTotal: number;
  reason: string;
  reauthConfirmed: boolean;
  approvalId?: string;
  editedBy: string;
  editedByName?: string;
  editedByRole?: string;
}

export function recordInvoiceEdit(input: RecordEditInput): InvoiceEditEntry {
  const entry: InvoiceEditEntry = {
    id: uid("ied"),
    invoiceId: input.invoiceId,
    invoiceNo: input.invoiceNo,
    action: input.action,
    oldValues: input.oldValues,
    newValues: input.newValues,
    reason: input.reason,
    amountAfter: input.newTotal,
    amountDelta: input.newTotal - input.oldTotal,
    highValue: input.newTotal > HIGH_VALUE_THRESHOLD || input.oldTotal > HIGH_VALUE_THRESHOLD,
    reauthConfirmed: input.reauthConfirmed,
    approvalId: input.approvalId,
    editedBy: input.editedBy,
    editedByName: input.editedByName,
    editedByRole: input.editedByRole,
    at: nowIso(),
    device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : undefined,
  };
  save({ entries: [entry, ...state.entries] });
  return entry;
}

/** Compute changed-field deltas between two invoice snapshots. */
export function diffInvoice(oldInv: Invoice, patch: Partial<Invoice>): { oldValues: Partial<Invoice>; newValues: Partial<Invoice> } {
  const oldValues: Partial<Invoice> = {};
  const newValues: Partial<Invoice> = {};
  (Object.keys(patch) as (keyof Invoice)[]).forEach(k => {
    if (oldInv[k] !== patch[k]) {
      // @ts-expect-error – dynamic
      oldValues[k] = oldInv[k];
      // @ts-expect-error – dynamic
      newValues[k] = patch[k];
    }
  });
  return { oldValues, newValues };
}

/** Format a delta into human-readable rows for display. */
export function formatDeltaRows(entry: InvoiceEditEntry): { field: string; from: string; to: string }[] {
  const fmt = (v: unknown): string => {
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "number") return String(v);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    return String(v);
  };
  const keys = Array.from(new Set([...Object.keys(entry.oldValues), ...Object.keys(entry.newValues)]));
  return keys.map(k => ({
    field: k,
    from: fmt((entry.oldValues as any)[k]),
    to: fmt((entry.newValues as any)[k]),
  }));
}

export function resetInvoiceEdits() { save({ entries: [] }); }
