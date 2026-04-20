/**
 * Invoice Dispatch Store
 * - Tracks generated/sent invoice documents (PDF/JPEG) per channel.
 * - Mock document vault: file *blobs* are not stored; we keep references and
 *   regenerate on demand. Folder paths (year/month/type/recipient) are computed.
 * - Audit logs every action (generate, send, fail, resend).
 */

export type InvoiceDocType =
  | "proforma_invoice"
  | "tax_invoice"
  | "receipt_voucher"
  | "fee_demand_note"
  | "quotation"
  | "credit_note"
  | "debit_note";

export type DispatchStatus =
  | "draft"
  | "generated"
  | "queued"
  | "pending_approval"
  | "sent_email"
  | "sent_whatsapp"
  | "sent_both"
  | "opened"
  | "failed"
  | "resent";

export type DispatchChannel = "email" | "whatsapp" | "download" | "manual";
export type DispatchFormat = "pdf" | "jpeg";

export interface DispatchAuditEntry {
  id: string;
  at: string;
  action: string;
  by: string;
  byName?: string;
  detail?: string;
  channel?: DispatchChannel;
  recipientEmail?: string;
  recipientPhone?: string;
}

export interface InvoiceDispatch {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  docType: InvoiceDocType;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amount: number;
  format: DispatchFormat;
  status: DispatchStatus;
  vaultPath: string;        // year/month/type/recipient/file.pdf
  approvalId?: string;
  generatedBy: string;
  generatedAt: string;
  lastSentAt?: string;
  sendCount: number;
  audit: DispatchAuditEntry[];
}

const KEY = "ral_invoice_dispatch_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

interface State { items: InvoiceDispatch[]; }

const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const nowIso = () => new Date().toISOString();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { items: [] };
}

let state: State = typeof window !== "undefined" ? load() : { items: [] };

function save(s: State) {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export function subscribeDispatch(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getDispatches(): InvoiceDispatch[] {
  return state.items;
}

export function dispatchForInvoice(invoiceId: string): InvoiceDispatch | undefined {
  return state.items.find(d => d.invoiceId === invoiceId);
}

export function vaultPathFor(d: { docType: InvoiceDocType; recipientName: string; invoiceNo: string; generatedAt: string; format: DispatchFormat }) {
  const dt = new Date(d.generatedAt);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const safeName = d.recipientName.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
  return `vault/${y}/${m}/${d.docType}/${safeName}/${d.invoiceNo}.${d.format}`;
}

export const DOC_TYPE_LABELS: Record<InvoiceDocType, string> = {
  proforma_invoice: "Proforma Invoice",
  tax_invoice: "Tax Invoice",
  receipt_voucher: "Receipt Voucher",
  fee_demand_note: "Fee Demand Note",
  quotation: "Quotation",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export const DOC_TYPE_PREFIX: Record<InvoiceDocType, string> = {
  proforma_invoice: "PI",
  tax_invoice: "TI",
  receipt_voucher: "RCP",
  fee_demand_note: "FDN",
  quotation: "QTN",
  credit_note: "CN",
  debit_note: "DN",
};

export interface RegisterInput {
  invoiceId: string;
  invoiceNo: string;
  docType: InvoiceDocType;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amount: number;
  format: DispatchFormat;
  by: string;
  byName?: string;
  approvalId?: string;
  initialStatus?: DispatchStatus;
}

/** Register or update a generated dispatch record. */
export function registerDispatch(input: RegisterInput): InvoiceDispatch {
  const existing = state.items.find(d => d.invoiceId === input.invoiceId && d.docType === input.docType);
  if (existing) {
    existing.format = input.format;
    existing.status = input.initialStatus ?? "generated";
    existing.audit.unshift({
      id: uid("aud"), at: nowIso(), action: "regenerated", by: input.by, byName: input.byName, detail: `format=${input.format}`,
    });
    save({ items: [...state.items] });
    return existing;
  }
  const generatedAt = nowIso();
  const item: InvoiceDispatch = {
    id: uid("dsp"),
    invoiceId: input.invoiceId,
    invoiceNo: input.invoiceNo,
    docType: input.docType,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    recipientPhone: input.recipientPhone,
    amount: input.amount,
    format: input.format,
    status: input.initialStatus ?? "generated",
    vaultPath: vaultPathFor({ docType: input.docType, recipientName: input.recipientName, invoiceNo: input.invoiceNo, generatedAt, format: input.format }),
    approvalId: input.approvalId,
    generatedBy: input.by,
    generatedAt,
    sendCount: 0,
    audit: [
      { id: uid("aud"), at: generatedAt, action: "generated", by: input.by, byName: input.byName, detail: `${input.docType} · ${input.format.toUpperCase()}` },
    ],
  };
  save({ items: [item, ...state.items] });
  return item;
}

export function setDispatchStatus(id: string, status: DispatchStatus, by: string, byName?: string, detail?: string) {
  const d = state.items.find(x => x.id === id);
  if (!d) return;
  d.status = status;
  d.audit.unshift({ id: uid("aud"), at: nowIso(), action: `status:${status}`, by, byName, detail });
  save({ items: [...state.items] });
}

export interface RecordSendInput {
  id: string;
  channel: DispatchChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  by: string;
  byName?: string;
  success: boolean;
  errorMessage?: string;
}

export function recordSend(input: RecordSendInput) {
  const d = state.items.find(x => x.id === input.id);
  if (!d) return;
  if (input.success) {
    d.sendCount += 1;
    d.lastSentAt = nowIso();
    if (input.channel === "email") {
      d.status = d.status === "sent_whatsapp" || d.status === "sent_both" ? "sent_both" : "sent_email";
      d.recipientEmail = input.recipientEmail || d.recipientEmail;
    } else if (input.channel === "whatsapp") {
      d.status = d.status === "sent_email" || d.status === "sent_both" ? "sent_both" : "sent_whatsapp";
      d.recipientPhone = input.recipientPhone || d.recipientPhone;
    } else if (input.channel === "manual") {
      d.status = "sent_email";
    }
  } else {
    d.status = "failed";
  }
  d.audit.unshift({
    id: uid("aud"),
    at: nowIso(),
    action: input.success ? `sent:${input.channel}` : `failed:${input.channel}`,
    by: input.by,
    byName: input.byName,
    channel: input.channel,
    recipientEmail: input.recipientEmail,
    recipientPhone: input.recipientPhone,
    detail: input.errorMessage,
  });
  save({ items: [...state.items] });
}

export function attachApproval(id: string, approvalId: string) {
  const d = state.items.find(x => x.id === id);
  if (!d) return;
  d.approvalId = approvalId;
  d.status = "pending_approval";
  d.audit.unshift({ id: uid("aud"), at: nowIso(), action: "approval:requested", by: d.generatedBy, detail: approvalId });
  save({ items: [...state.items] });
}

/** Reset (testing). */
export function resetDispatch() { save({ items: [] }); }
