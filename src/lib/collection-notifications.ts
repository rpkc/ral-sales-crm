/**
 * Collection lifecycle notifications — toast + persistent log.
 * Covers original 6 events + the dual-collection / invoice-request workflow events.
 */
import { toast } from "sonner";
import type { Collection } from "./collection-store";

export type CollectionEvent =
  | "new_collection_logged"
  | "collection_pending_verification_24h"
  | "payment_verified"
  | "mismatch_detected"
  | "ti_ready_to_generate"
  | "ti_generated"
  // Dual collection / invoice request workflow
  | "invoice_request_created"
  | "request_pending_over_6h"
  | "bank_mismatch_detected"
  | "invoice_issued"
  | "request_rejected";

export interface CollectionNotif {
  id: string;
  event: CollectionEvent;
  message: string;
  collectionId?: string;
  amount?: number;
  at: string;
}

const KEY = "ral_collection_notifs_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function load(): CollectionNotif[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
let state: CollectionNotif[] = typeof window !== "undefined" ? load() : [];

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state.slice(0, 200))); } catch {}
  listeners.forEach(l => l());
}

export function subscribeCollectionNotifs(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getCollectionNotifs() { return state; }

function emit(entry: Omit<CollectionNotif, "id" | "at">) {
  const e: CollectionNotif = {
    ...entry,
    id: `cnt_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    at: new Date().toISOString(),
  };
  state = [e, ...state];
  save();
  return e;
}

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export function notifyCollectionLogged(c: Collection) {
  const e = emit({ event: "new_collection_logged", message: `New collection ${c.receiptRef} · ${fmt(c.amount)} from ${c.studentName}`, collectionId: c.id, amount: c.amount });
  toast.success(e.message);
}

export function notifyVerified(c: Collection) {
  const e = emit({ event: "payment_verified", message: `Verified ${c.receiptRef} · ${fmt(c.amount)}`, collectionId: c.id, amount: c.amount });
  toast.success(e.message);
  emit({ event: "ti_ready_to_generate", message: `TI ready for ${c.receiptRef} · Accounts can now generate Tax Invoice`, collectionId: c.id, amount: c.amount });
}

export function notifyMismatch(c: Collection) {
  const e = emit({
    event: "mismatch_detected",
    message: `Mismatch on ${c.receiptRef}: collected ${fmt(c.amount)}, verified ${fmt(c.verifiedAmount ?? 0)}`,
    collectionId: c.id, amount: c.amount,
  });
  toast.warning(e.message);
}

export function notifyTiGeneratedFromCollection(c: Collection) {
  const e = emit({ event: "ti_generated", message: `TI ${c.invoiceNo} generated from ${c.receiptRef}`, collectionId: c.id, amount: c.amount });
  toast.success(e.message);
}

/** Invoice-request workflow notifications. */
export function notifyInvoiceRequestCreated(c: Collection) {
  if (!c.invoiceRequest || c.invoiceRequest.type === "none") return;
  const e = emit({
    event: "invoice_request_created",
    message: `${c.invoiceRequest.type} request for ${c.studentName} (${c.receiptRef}) · awaiting ${c.invoiceRequest.status === "awaiting_admin_review" ? "admin" : "accounts"}`,
    collectionId: c.id, amount: c.amount,
  });
  toast.success(e.message);
}
export function notifyInvoiceIssued(c: Collection) {
  const r = c.invoiceRequest;
  if (!r) return;
  const e = emit({
    event: "invoice_issued",
    message: `${r.type} ${r.invoiceNo} issued for ${c.studentName} (${c.receiptRef})`,
    collectionId: c.id, amount: c.amount,
  });
  toast.success(e.message);
}
export function notifyRequestRejected(c: Collection, reason: string) {
  const e = emit({
    event: "request_rejected",
    message: `Invoice request for ${c.receiptRef} rejected: ${reason}`,
    collectionId: c.id, amount: c.amount,
  });
  toast.warning(e.message);
}
export function notifyBankMismatch(c: Collection) {
  const e = emit({
    event: "bank_mismatch_detected",
    message: `Bank mismatch on ${c.receiptRef} (${fmt(c.amount)})`,
    collectionId: c.id, amount: c.amount,
  });
  toast.error(e.message);
}

/** Run once per session — surface collections older than 24h still awaiting verification. */
const seenStale = new Set<string>();
export function scanStalePendingVerifications(items: Collection[]) {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  items.forEach(c => {
    if (c.status !== "Awaiting Verification") return;
    if (new Date(c.collectedAt).getTime() > cutoff) return;
    if (seenStale.has(c.id)) return;
    seenStale.add(c.id);
    emit({
      event: "collection_pending_verification_24h",
      message: `${c.receiptRef} pending verification > 24h · ${fmt(c.amount)} from ${c.studentName}`,
      collectionId: c.id, amount: c.amount,
    });
  });
}

const seenStaleReq = new Set<string>();
export function scanStaleInvoiceRequests(items: Collection[]) {
  const cutoff = Date.now() - 6 * 3600 * 1000;
  items.forEach(c => {
    const r = c.invoiceRequest;
    if (!r || !["awaiting_admin_review", "awaiting_accounts"].includes(r.status)) return;
    if (!r.requestedAt || new Date(r.requestedAt).getTime() > cutoff) return;
    if (seenStaleReq.has(c.id)) return;
    seenStaleReq.add(c.id);
    emit({
      event: "request_pending_over_6h",
      message: `${r.type} request for ${c.studentName} (${c.receiptRef}) pending > 6h`,
      collectionId: c.id, amount: c.amount,
    });
  });
}
