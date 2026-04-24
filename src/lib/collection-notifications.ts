/**
 * Collection lifecycle notifications — toast + persistent log.
 * Six events per spec; pure in-memory + localStorage; no real channels.
 */
import { toast } from "sonner";
import type { Collection } from "./collection-store";

export type CollectionEvent =
  | "new_collection_logged"
  | "collection_pending_verification_24h"
  | "payment_verified"
  | "mismatch_detected"
  | "ti_ready_to_generate"
  | "ti_generated";

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
