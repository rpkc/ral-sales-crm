/**
 * Student Collection Control System — central store
 *
 * Workflow:
 *   1. Counselor logs a Collection (status: "Collected").
 *   2. Counselor submits to Admin (status: "Awaiting Verification").
 *   3. Admin verifies against cash/bank and Approves / Rejects / Marks Mismatch.
 *   4. Once Verified, the entry appears in the Accounts queue → "Ready For Invoice".
 *   5. Accounts generates a Tax Invoice → status flips to "Invoice Generated".
 *
 * EMI late-fee engine: ₹50 / day overdue, accrued on read (no schedule mutation).
 */

export type CollectionMode = "cash" | "upi" | "bank_transfer" | "cheque" | "card";

export type CollectionReason =
  | "admission_fee"
  | "registration_fee"
  | "seat_booking"
  | "emi_payment"
  | "emi_late_fine"
  | "id_card_charge"
  | "rfid_charge"
  | "stationery_sale"
  | "misc_approved_charge";

export type CollectionStatus =
  | "Collected"
  | "Awaiting Verification"
  | "Verified"
  | "Mismatch"
  | "Rejected"
  | "Ready For Invoice"
  | "Invoice Generated";

export const COLLECTION_REASONS: { value: CollectionReason; label: string }[] = [
  { value: "admission_fee", label: "Admission Fee" },
  { value: "registration_fee", label: "Registration Fee" },
  { value: "seat_booking", label: "Seat Booking" },
  { value: "emi_payment", label: "EMI Payment" },
  { value: "emi_late_fine", label: "EMI Late Fine" },
  { value: "id_card_charge", label: "ID Card Charge" },
  { value: "rfid_charge", label: "RFID Charge" },
  { value: "stationery_sale", label: "Stationery Sale" },
  { value: "misc_approved_charge", label: "Misc Approved Charge" },
];

export const COLLECTION_MODES: { value: CollectionMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

export interface CollectionAuditEntry {
  id: string;
  at: string;
  byId: string;
  byName: string;
  byRole: string;
  action: string;
  fromStatus?: CollectionStatus;
  toStatus?: CollectionStatus;
  remarks?: string;
}

export interface Collection {
  id: string;
  receiptRef: string; // human-readable reference, e.g. RC-2026-0001
  studentId: string;
  studentName: string;
  courseName: string;
  amount: number;
  mode: CollectionMode;
  reason: CollectionReason;
  collectedAt: string;
  collectedById: string;
  collectedByName: string;
  remarks?: string;

  /** Optional reference to an EMI schedule when reason = emi_payment / emi_late_fine */
  emiId?: string;
  emiInstallmentNo?: number;
  /** Late fee component (₹50/day × days overdue) included in this collection */
  lateFeeAmount?: number;

  status: CollectionStatus;

  /** Verification metadata */
  verifiedAmount?: number;
  verificationMode?: "cash_in_hand" | "bank_statement" | "upi_confirmation" | "cheque_status";
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verificationRemarks?: string;
  mismatchAmount?: number;

  /** Linked TI after invoice generation */
  invoiceId?: string;
  invoiceNo?: string;
  invoicedById?: string;
  invoicedByName?: string;
  invoicedAt?: string;

  audit: CollectionAuditEntry[];
  createdAt: string;
}

const KEY = "ral_collections_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

function load(): Collection[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}

function seed(): Collection[] {
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
  const make = (over: Partial<Collection>): Collection => ({
    id: uid("col"),
    receiptRef: `RC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    studentId: "s_seed",
    studentName: "Seed Student",
    courseName: "UI/UX Design",
    amount: 5000,
    mode: "cash",
    reason: "admission_fee",
    collectedAt: daysAgo(0),
    collectedById: "u5",
    collectedByName: "Manjari Chakraborty",
    status: "Collected",
    audit: [],
    createdAt: daysAgo(0),
    ...over,
  });
  return [
    make({
      studentName: "Aarav Patel", courseName: "UI/UX Design", amount: 25000, reason: "admission_fee",
      mode: "upi", status: "Awaiting Verification", collectedAt: daysAgo(1),
    }),
    make({
      studentName: "Diya Roy", courseName: "Digital Marketing", amount: 12500, reason: "emi_payment",
      mode: "cash", status: "Awaiting Verification", collectedAt: daysAgo(0),
    }),
    make({
      studentName: "Karan Mehta", courseName: "Full Stack Dev", amount: 50000, reason: "admission_fee",
      mode: "bank_transfer", status: "Verified", collectedAt: daysAgo(3),
      verifiedAmount: 50000, verificationMode: "bank_statement",
      verifiedById: "u1", verifiedByName: "Amit Sharma", verifiedAt: daysAgo(2),
    }),
    make({
      studentName: "Riya Ghosh", courseName: "Graphic Design", amount: 5000, reason: "id_card_charge",
      mode: "cash", status: "Mismatch", collectedAt: daysAgo(2),
      verifiedAmount: 4500, mismatchAmount: 500, verificationMode: "cash_in_hand",
      verifiedById: "u1", verifiedByName: "Amit Sharma", verifiedAt: daysAgo(1),
      verificationRemarks: "₹500 short in cash count.",
    }),
  ];
}

let state: Collection[] = typeof window !== "undefined" ? load() : [];

function save(next: Collection[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach(l => l());
}

export function subscribeCollections(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getCollections(): Collection[] { return state; }
export function resetCollections() { save(seed()); }

function pushAudit(c: Collection, entry: Omit<CollectionAuditEntry, "id" | "at">) {
  c.audit = [
    { id: uid("aud"), at: new Date().toISOString(), ...entry },
    ...c.audit,
  ];
}

/* ───────── Counselor actions ───────── */

export interface LogCollectionInput {
  studentId: string;
  studentName: string;
  courseName: string;
  amount: number;
  mode: CollectionMode;
  reason: CollectionReason;
  remarks?: string;
  emiId?: string;
  emiInstallmentNo?: number;
  lateFeeAmount?: number;
}

export function logCollection(
  input: LogCollectionInput,
  by: { id: string; name: string; role: string },
): Collection {
  const c: Collection = {
    id: uid("col"),
    receiptRef: `RC-${new Date().getFullYear()}-${String(state.length + 1).padStart(4, "0")}`,
    ...input,
    collectedAt: new Date().toISOString(),
    collectedById: by.id,
    collectedByName: by.name,
    status: "Collected",
    audit: [],
    createdAt: new Date().toISOString(),
  };
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Collection logged",
    toStatus: "Collected",
    remarks: input.remarks,
  });
  save([c, ...state]);
  return c;
}

export function submitToAdmin(id: string, by: { id: string; name: string; role: string }, remarks?: string): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  if (c.status !== "Collected") return null;
  const prev = c.status;
  c.status = "Awaiting Verification";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Submitted to admin",
    fromStatus: prev, toStatus: c.status,
    remarks,
  });
  save([...state]);
  return c;
}

/* ───────── Admin verification ───────── */

export interface VerificationInput {
  verifiedAmount: number;
  verificationMode: NonNullable<Collection["verificationMode"]>;
  remarks?: string;
}

export function verifyCollection(
  id: string,
  input: VerificationInput,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  if (c.status !== "Awaiting Verification" && c.status !== "Mismatch") return null;
  const prev = c.status;
  const matches = Math.abs(input.verifiedAmount - c.amount) < 0.5;
  c.verifiedAmount = input.verifiedAmount;
  c.verificationMode = input.verificationMode;
  c.verifiedById = by.id;
  c.verifiedByName = by.name;
  c.verifiedAt = new Date().toISOString();
  c.verificationRemarks = input.remarks;
  c.mismatchAmount = matches ? 0 : c.amount - input.verifiedAmount;
  c.status = matches ? "Verified" : "Mismatch";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: matches ? "Verified" : "Mismatch flagged",
    fromStatus: prev, toStatus: c.status,
    remarks: input.remarks,
  });
  save([...state]);
  return c;
}

export function rejectCollection(
  id: string,
  remarks: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  const prev = c.status;
  c.status = "Rejected";
  c.verifiedById = by.id;
  c.verifiedByName = by.name;
  c.verifiedAt = new Date().toISOString();
  c.verificationRemarks = remarks;
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Rejected",
    fromStatus: prev, toStatus: c.status,
    remarks,
  });
  save([...state]);
  return c;
}

export function markReadyForInvoice(
  id: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c || c.status !== "Verified") return null;
  const prev = c.status;
  c.status = "Ready For Invoice";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: "Marked ready for invoice",
    fromStatus: prev, toStatus: c.status,
  });
  save([...state]);
  return c;
}

/* ───────── Accounts: link generated TI ───────── */

export function linkTiToCollection(
  id: string,
  invoiceId: string,
  invoiceNo: string,
  by: { id: string; name: string; role: string },
): Collection | null {
  const c = state.find(x => x.id === id);
  if (!c) return null;
  const prev = c.status;
  c.invoiceId = invoiceId;
  c.invoiceNo = invoiceNo;
  c.invoicedById = by.id;
  c.invoicedByName = by.name;
  c.invoicedAt = new Date().toISOString();
  c.status = "Invoice Generated";
  pushAudit(c, {
    byId: by.id, byName: by.name, byRole: by.role,
    action: `Linked TI ${invoiceNo}`,
    fromStatus: prev, toStatus: c.status,
  });
  save([...state]);
  return c;
}

/* ───────── Selectors ───────── */

export function getCollectionsByCounselor(counselorId: string) {
  return state.filter(c => c.collectedById === counselorId);
}

export function getCollectionsAwaitingVerification() {
  return state.filter(c => c.status === "Awaiting Verification" || c.status === "Mismatch");
}

export function getVerifiedReadyForInvoice() {
  return state.filter(c => c.status === "Verified" || c.status === "Ready For Invoice");
}

export function getMismatches() {
  return state.filter(c => c.status === "Mismatch");
}

/** Sum of amounts where status would still reasonably be "money in counselor's hand" */
export function getUnverifiedTotal() {
  return state
    .filter(c => c.status === "Collected" || c.status === "Awaiting Verification")
    .reduce((s, c) => s + c.amount, 0);
}

/* ───────── EMI late-fee engine ───────── */

const LATE_FEE_PER_DAY = 50;

export interface LateFeeInfo {
  daysOverdue: number;
  fee: number;
}

/** Pure helper — accrues ₹50/day on read; never mutates the EMI schedule. */
export function computeEmiLateFee(dueDateIso: string, asOf: number = Date.now()): LateFeeInfo {
  const due = new Date(dueDateIso).getTime();
  const days = Math.max(0, Math.floor((asOf - due) / 86400000));
  return { daysOverdue: days, fee: days * LATE_FEE_PER_DAY };
}

export const LATE_FEE_RATE = LATE_FEE_PER_DAY;

/* ───────── Audit access ───────── */

export function getAllAuditEntries(): (CollectionAuditEntry & { collectionId: string; receiptRef: string; studentName: string })[] {
  return state.flatMap(c =>
    c.audit.map(a => ({
      ...a,
      collectionId: c.id,
      receiptRef: c.receiptRef,
      studentName: c.studentName,
    })),
  );
}
