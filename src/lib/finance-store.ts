import {
  Invoice, Payment, EmiSchedule, Expense, Vendor, VendorBill,
  Budget, CashFlowEntry, FinanceLog, ExpenseCategory, PaymentMode, InvoiceType,
} from "./finance-types";

const KEY = "ral_finance_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

interface FinanceState {
  invoices: Invoice[];
  payments: Payment[];
  emiSchedules: EmiSchedule[];
  expenses: Expense[];
  vendors: Vendor[];
  vendorBills: VendorBill[];
  budgets: Budget[];
  cashflow: CashFlowEntry[];
  logs: FinanceLog[];
  counters: { inv: number; rcpt: number; exp: number; bill: number; pi: number; ti: number };
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const todayISO = () => new Date().toISOString();
const pad = (n: number, w = 4) => String(n).padStart(w, "0");

function seed(): FinanceState {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}`;
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const daysAhead = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

  const vendors: Vendor[] = [
    { id: "v1", name: "BrightAds Media", category: "Marketing", gstin: "19ABCDE1234F1Z2", contactName: "Aditi", phone: "9830000001", email: "ops@brightads.in", openingBalance: 0, createdAt: daysAgo(120) },
    { id: "v2", name: "Cloudways Hosting", category: "IT/SaaS", gstin: "29CLOUD1234X1Z9", contactName: "Sales", phone: "9000000002", email: "billing@cloudways.in", openingBalance: 0, createdAt: daysAgo(200) },
    { id: "v3", name: "Trainer - Riya Sen", category: "Trainer", contactName: "Riya Sen", phone: "9830000003", openingBalance: 0, createdAt: daysAgo(80) },
    { id: "v4", name: "Office Landlord", category: "Rent", contactName: "Mr. Roy", phone: "9830000004", openingBalance: 0, createdAt: daysAgo(365) },
  ];

  const inv = (i: number, over: Partial<Invoice>): Invoice => {
    const subtotal = over.subtotal ?? 50000;
    const discount = over.discount ?? 0;
    const taxable = subtotal - discount;
    const gstRate = over.gstRate ?? 18;
    const gst = (over.gstType === "Exempt" ? 0 : taxable * gstRate / 100);
    const cgst = gst / 2, sgst = gst / 2, igst = 0;
    const total = taxable + gst;
    const amountPaid = over.amountPaid ?? 0;
    const status: Invoice["status"] = over.status ?? (amountPaid >= total ? "Paid" : amountPaid > 0 ? "Partial" : "Sent");
    return {
      id: uid("inv"),
      invoiceNo: `INV-${monthKey.replace("-", "")}-${pad(i)}`,
      customerId: "c" + i,
      customerName: "Customer " + i,
      customerType: "Student",
      revenueStream: "Student Admissions",
      issueDate: daysAgo(10),
      dueDate: daysAhead(20),
      subtotal, discount, gstType: "Taxable", gstRate, cgst, sgst, igst, total,
      amountPaid, status,
      createdBy: "u7", createdAt: daysAgo(10),
      ...over,
    };
  };

  const invoices: Invoice[] = [
    inv(1, { customerName: "Aarav Patel", customerType: "Student", programName: "UI/UX Design", subtotal: 90000, amountPaid: 90000 }),
    inv(2, { customerName: "Diya Roy", customerType: "Student", programName: "Digital Marketing", subtotal: 90000, amountPaid: 30000, dueDate: daysAhead(5) }),
    inv(3, { customerName: "Karan Mehta", customerType: "Student", programName: "Full Stack Dev", subtotal: 410000, amountPaid: 100000, dueDate: daysAhead(10) }),
    inv(4, { customerName: "Sister Nivedita Univ.", customerType: "Institution", revenueStream: "B2B Associations", programName: "Campus Workshop", subtotal: 250000, amountPaid: 0, dueDate: daysAgo(3), status: "Overdue" }),
    inv(5, { customerName: "TechCon 2025", customerType: "Event", revenueStream: "Events", subtotal: 150000, amountPaid: 150000 }),
    inv(6, { customerName: "Riya Ghosh", customerType: "Student", programName: "Graphic Design", subtotal: 45000, amountPaid: 45000 }),
    inv(7, { customerName: "Maulana Azad College", customerType: "Institution", revenueStream: "B2B Associations", subtotal: 180000, amountPaid: 90000, dueDate: daysAhead(15) }),
    inv(8, { customerName: "eBook - UX Foundations", customerType: "Other", revenueStream: "Digital Products", gstType: "Exempt", subtotal: 5000, amountPaid: 5000 }),
  ];

  const payments: Payment[] = invoices
    .filter(i => i.amountPaid > 0)
    .map((i, idx) => ({
      id: uid("pay"),
      receiptNo: `RCP-${monthKey.replace("-", "")}-${pad(idx + 1)}`,
      invoiceId: i.id,
      customerId: i.customerId,
      customerName: i.customerName,
      amount: i.amountPaid,
      mode: idx % 3 === 0 ? "UPI" : idx % 3 === 1 ? "Bank" : "Card",
      reference: `TXN${1000 + idx}`,
      paidOn: i.issueDate,
      recordedBy: "u7",
      createdAt: i.issueDate,
    }));

  const expCat: ExpenseCategory[] = ["Marketing", "Salaries", "Rent", "Travel", "Trainer", "Office", "Vendor"];
  const expenses: Expense[] = expCat.map((c, idx) => {
    const amount = [80000, 320000, 60000, 12500, 25000, 8000, 18000][idx];
    const gst = c === "Salaries" || c === "Rent" ? 0 : amount * 0.18;
    return {
      id: uid("exp"),
      expenseNo: `EXP-${monthKey.replace("-", "")}-${pad(idx + 1)}`,
      category: c,
      vendorId: c === "Marketing" ? "v1" : c === "Trainer" ? "v3" : c === "Rent" ? "v4" : undefined,
      vendorName: c === "Marketing" ? "BrightAds Media" : c === "Trainer" ? "Trainer - Riya Sen" : c === "Rent" ? "Office Landlord" : undefined,
      amount, gst, total: amount + gst,
      spendDate: daysAgo(idx * 3 + 1),
      description: `${c} expense ${monthKey}`,
      status: idx % 4 === 0 ? "Pending" : "Approved",
      paymentMode: "Bank",
      submittedBy: "u7",
      createdAt: daysAgo(idx * 3 + 1),
    };
  });

  const vendorBills: VendorBill[] = [
    { id: uid("vb"), billNo: "BAM-2410", vendorId: "v1", vendorName: "BrightAds Media", billDate: daysAgo(15), dueDate: daysAhead(5), amount: 80000, gst: 14400, total: 94400, paid: 0, status: "Pending", createdAt: daysAgo(15) },
    { id: uid("vb"), billNo: "CW-9921", vendorId: "v2", vendorName: "Cloudways Hosting", billDate: daysAgo(20), dueDate: daysAgo(2), amount: 22000, gst: 3960, total: 25960, paid: 0, status: "Overdue", createdAt: daysAgo(20) },
    { id: uid("vb"), billNo: "RENT-NOV", vendorId: "v4", vendorName: "Office Landlord", billDate: daysAgo(5), dueDate: daysAhead(10), amount: 60000, gst: 0, total: 60000, paid: 60000, status: "Paid", createdAt: daysAgo(5) },
  ];

  const budgets: Budget[] = [
    { id: uid("bud"), department: "Marketing", category: "Marketing", month: monthKey, plannedAmount: 100000, createdAt: now.toISOString() },
    { id: uid("bud"), department: "HR", category: "Salaries", month: monthKey, plannedAmount: 350000, createdAt: now.toISOString() },
    { id: uid("bud"), department: "Admin", category: "Rent", month: monthKey, plannedAmount: 60000, createdAt: now.toISOString() },
    { id: uid("bud"), department: "Operations", category: "Travel", month: monthKey, plannedAmount: 30000, createdAt: now.toISOString() },
    { id: uid("bud"), department: "Academics", category: "Trainer", month: monthKey, plannedAmount: 50000, createdAt: now.toISOString() },
  ];

  // EMI plan for invoice 3 (Karan / Full Stack)
  const fsInv = invoices[2];
  const emiSchedules: EmiSchedule[] = [];
  const totalDue = fsInv.total - fsInv.amountPaid;
  const emiCount = 6;
  const emiAmt = Math.round(totalDue / emiCount);
  for (let k = 1; k <= emiCount; k++) {
    const due = new Date(Date.now() + (k * 30 - 5) * 86400000).toISOString();
    emiSchedules.push({
      id: uid("emi"),
      invoiceId: fsInv.id,
      customerId: fsInv.customerId,
      customerName: fsInv.customerName,
      installmentNo: k,
      dueDate: due,
      amount: emiAmt,
      status: k === 1 ? "Due" : "Upcoming",
    });
  }

  const cashflow: CashFlowEntry[] = [
    ...payments.map<CashFlowEntry>(p => ({ id: uid("cf"), date: p.paidOn, type: "Inflow", source: "Payment", refId: p.id, amount: p.amount })),
    ...expenses.filter(e => e.status === "Approved").map<CashFlowEntry>(e => ({ id: uid("cf"), date: e.spendDate, type: "Outflow", source: "Expense", refId: e.id, amount: e.total })),
    ...vendorBills.filter(b => b.status === "Paid").map<CashFlowEntry>(b => ({ id: uid("cf"), date: b.billDate, type: "Outflow", source: "Vendor Bill", refId: b.id, amount: b.total })),
  ];

  return {
    invoices, payments, emiSchedules, expenses, vendors, vendorBills, budgets, cashflow,
    logs: [],
    counters: { inv: invoices.length, rcpt: payments.length, exp: expenses.length, bill: vendorBills.length, pi: 0, ti: 0 },
  };
}

function load(): FinanceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: FinanceState = JSON.parse(raw);
      // Backward-compat: ensure counters has pi/ti
      parsed.counters = { pi: 0, ti: 0, ...parsed.counters };
      // Backfill invoiceType for legacy seeded invoices by status
      let mutated = false;
      parsed.invoices.forEach(i => {
        if (!i.invoiceType) {
          i.invoiceType = (i.status === "Draft" || i.status === "Sent") ? "PI" : "TI";
          mutated = true;
        }
      });
      if (mutated) {
        try { localStorage.setItem(KEY, JSON.stringify(parsed)); } catch {}
      }
      return parsed;
    }
  } catch {}
  const s = seed();
  // First-time seed: backfill PI/TI by status
  s.invoices.forEach(i => {
    if (!i.invoiceType) i.invoiceType = (i.status === "Draft" || i.status === "Sent") ? "PI" : "TI";
  });
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

let state: FinanceState = typeof window !== "undefined" ? load() : seed();

function save(s: FinanceState) {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  listeners.forEach(l => l());
}

export function subscribeFinance(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getFinance() { return state; }

export function resetFinance() { save(seed()); }

/**
 * One-time auto-seeding: any Partial invoice without an EMI schedule gets
 * its balance split into 3 EMIs over 90 days. Idempotent + safe to call on every mount.
 */
export function autoSeedEmisForPartial(): number {
  const seeded: EmiSchedule[] = [];
  const targets = state.invoices.filter(i =>
    (i.status === "Partial" || i.status === "Overdue") &&
    i.amountPaid > 0 && i.amountPaid < i.total &&
    !state.emiSchedules.some(e => e.invoiceId === i.id),
  );
  if (targets.length === 0) return 0;
  targets.forEach(inv => {
    const balance = inv.total - inv.amountPaid;
    const each = Math.round(balance / 3);
    for (let k = 1; k <= 3; k++) {
      const due = new Date(Date.now() + (k * 30 - 5) * 86400000).toISOString();
      seeded.push({
        id: uid("emi"),
        invoiceId: inv.id,
        customerId: inv.customerId,
        customerName: inv.customerName,
        installmentNo: k,
        dueDate: due,
        amount: k === 3 ? balance - each * 2 : each,
        status: k === 1 ? "Due" : "Upcoming",
      });
    }
  });
  state.emiSchedules = [...state.emiSchedules, ...seeded];
  save({ ...state });
  return seeded.length;
}


function log(entity: string, entityId: string, action: string, by: string, detail?: string) {
  state.logs.unshift({ id: uid("log"), entity, entityId, action, by, at: todayISO(), detail });
}

function nextNo(kind: keyof FinanceState["counters"], prefix: string): string {
  const n = state.counters[kind] + 1;
  state.counters[kind] = n;
  const d = new Date();
  // PI/TI use yearly sequence: PI-2026-0001
  if (kind === "pi" || kind === "ti") {
    return `${prefix}-${d.getFullYear()}-${pad(n)}`;
  }
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1, 2)}-${pad(n)}`;
}

/* ───────── Invoices ───────── */
export function createInvoice(
  input: Omit<Invoice, "id" | "invoiceNo" | "createdAt" | "cgst" | "sgst" | "igst" | "total" | "amountPaid" | "status">,
  by: string,
): Invoice {
  const taxable = input.subtotal - input.discount;
  const gst = input.gstType === "Exempt" ? 0 : taxable * input.gstRate / 100;
  const type: InvoiceType = input.invoiceType ?? "PI";
  const counterKind = type === "TI" ? "ti" : "pi";
  const prefix = type === "TI" ? "TI" : "PI";
  const inv: Invoice = {
    ...input,
    invoiceType: type,
    id: uid("inv"),
    invoiceNo: nextNo(counterKind, prefix),
    cgst: gst / 2, sgst: gst / 2, igst: 0,
    total: taxable + gst,
    amountPaid: 0,
    status: type === "TI" ? "Sent" : "Sent",
    createdBy: by,
    createdAt: todayISO(),
  };
  state.invoices.unshift(inv);
  log("Invoice", inv.id, `created ${type}`, by);
  save({ ...state });
  return inv;
}


export function recordPayment(input: Omit<Payment, "id" | "receiptNo" | "createdAt">, by: string): Payment {
  const pay: Payment = {
    ...input,
    id: uid("pay"),
    receiptNo: nextNo("rcpt", "RCP"),
    recordedBy: by,
    createdAt: todayISO(),
  };
  state.payments.unshift(pay);
  if (input.invoiceId) {
    const inv = state.invoices.find(i => i.id === input.invoiceId);
    if (inv) {
      inv.amountPaid += input.amount;
      inv.status = inv.amountPaid >= inv.total ? "Paid" : "Partial";
    }
  }
  state.cashflow.unshift({ id: uid("cf"), date: pay.paidOn, type: "Inflow", source: "Payment", refId: pay.id, amount: pay.amount });
  log("Payment", pay.id, "recorded", by);
  save({ ...state });
  return pay;
}

/** Apply a partial patch to an invoice with auto-recalc of cgst/sgst/igst/total/status. */
export function updateInvoice(
  id: string,
  patch: Partial<Pick<Invoice,
    "customerName" | "customerType" | "revenueStream" | "programName"
    | "issueDate" | "dueDate" | "subtotal" | "discount" | "gstType" | "gstRate"
    | "gstin" | "notes" | "status"
  >> & { intraState?: boolean },
  by: string,
): Invoice | null {
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return null;
  const intra = patch.intraState ?? (inv.igst === 0);

  Object.entries(patch).forEach(([k, v]) => {
    if (k === "intraState") return;
    if (v !== undefined) (inv as unknown as Record<string, unknown>)[k] = v;
  });

  // Recompute money fields
  const taxable = Math.max(0, inv.subtotal - inv.discount);
  const gst = inv.gstType === "Exempt" ? 0 : taxable * inv.gstRate / 100;
  if (intra) { inv.cgst = gst / 2; inv.sgst = gst / 2; inv.igst = 0; }
  else { inv.cgst = 0; inv.sgst = 0; inv.igst = gst; }
  inv.total = taxable + gst;

  // Recompute status based on amountPaid vs total
  if (patch.status) {
    inv.status = patch.status;
  } else if (inv.status !== "Cancelled" && inv.status !== "Draft") {
    if (inv.amountPaid >= inv.total && inv.total > 0) inv.status = "Paid";
    else if (inv.amountPaid > 0) inv.status = "Partial";
    else if (new Date(inv.dueDate).getTime() < Date.now()) inv.status = "Overdue";
    else inv.status = "Sent";
  }

  log("Invoice", inv.id, "edited", by);
  save({ ...state });
  return inv;
}

export function cancelInvoice(id: string, by: string, reason?: string): Invoice | null {
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return null;
  inv.status = "Cancelled";
  log("Invoice", id, "cancelled", by, reason);
  save({ ...state });
  return inv;
}

export function cloneInvoice(id: string, by: string): Invoice | null {
  const src = state.invoices.find(i => i.id === id);
  if (!src) return null;
  const cloned: Invoice = {
    ...src,
    id: uid("inv"),
    invoiceNo: nextNo("inv", "INV"),
    amountPaid: 0,
    status: "Draft",
    createdBy: by,
    createdAt: todayISO(),
    issueDate: todayISO(),
  };
  state.invoices.unshift(cloned);
  log("Invoice", cloned.id, "cloned", by, `from ${src.invoiceNo}`);
  save({ ...state });
  return cloned;
}

/* ───────── Expenses ───────── */
export function createExpense(input: Omit<Expense, "id" | "expenseNo" | "createdAt" | "total">, by: string): Expense {
  const exp: Expense = {
    ...input,
    id: uid("exp"),
    expenseNo: nextNo("exp", "EXP"),
    total: input.amount + input.gst,
    submittedBy: by,
    createdAt: todayISO(),
  };
  state.expenses.unshift(exp);
  if (exp.status === "Approved") {
    state.cashflow.unshift({ id: uid("cf"), date: exp.spendDate, type: "Outflow", source: "Expense", refId: exp.id, amount: exp.total });
  }
  log("Expense", exp.id, "created", by);
  save({ ...state });
  return exp;
}

export function setExpenseStatus(id: string, status: Expense["status"], by: string) {
  const exp = state.expenses.find(e => e.id === id);
  if (!exp) return;
  const prev = exp.status;
  exp.status = status;
  if (status === "Approved" && prev !== "Approved") {
    state.cashflow.unshift({ id: uid("cf"), date: exp.spendDate, type: "Outflow", source: "Expense", refId: exp.id, amount: exp.total });
  }
  log("Expense", id, `status:${status}`, by);
  save({ ...state });
}

/* ───────── Vendors ───────── */
export function createVendor(input: Omit<Vendor, "id" | "createdAt">, by: string): Vendor {
  const v: Vendor = { ...input, id: uid("ven"), createdAt: todayISO() };
  state.vendors.unshift(v);
  log("Vendor", v.id, "created", by);
  save({ ...state });
  return v;
}

export function createVendorBill(input: Omit<VendorBill, "id" | "createdAt" | "total" | "paid" | "status"> & { paid?: number; status?: VendorBill["status"] }, by: string): VendorBill {
  const total = input.amount + input.gst;
  const paid = input.paid ?? 0;
  const status: VendorBill["status"] = input.status ?? (paid >= total ? "Paid" : new Date(input.dueDate) < new Date() ? "Overdue" : "Pending");
  const bill: VendorBill = {
    ...input,
    id: uid("vb"),
    total, paid, status,
    createdAt: todayISO(),
  };
  state.vendorBills.unshift(bill);
  log("VendorBill", bill.id, "created", by);
  save({ ...state });
  return bill;
}

export function payVendorBill(id: string, amount: number, by: string) {
  const b = state.vendorBills.find(x => x.id === id);
  if (!b) return;
  b.paid += amount;
  b.status = b.paid >= b.total ? "Paid" : "Pending";
  state.cashflow.unshift({ id: uid("cf"), date: todayISO(), type: "Outflow", source: "Vendor Bill", refId: b.id, amount });
  log("VendorBill", id, "paid", by, `₹${amount}`);
  save({ ...state });
}

/* ───────── Budgets ───────── */
export function createBudget(input: Omit<Budget, "id" | "createdAt">, by: string): Budget {
  const b: Budget = { ...input, id: uid("bud"), createdAt: todayISO() };
  state.budgets.unshift(b);
  log("Budget", b.id, "created", by);
  save({ ...state });
  return b;
}

/* ───────── EMI ───────── */
export function payEmi(id: string, mode: PaymentMode, by: string) {
  const e = state.emiSchedules.find(x => x.id === id);
  if (!e) return;
  e.status = "Paid";
  e.paidOn = todayISO();
  const inv = state.invoices.find(i => i.id === e.invoiceId);
  if (inv) {
    const pay = recordPayment({
      invoiceId: inv.id, customerId: inv.customerId, customerName: inv.customerName,
      amount: e.amount, mode, paidOn: todayISO(), reference: `EMI-${e.installmentNo}`,
      recordedBy: by,
    } as any, by);
    e.paymentId = pay.id;
  }
  // Move next upcoming → Due
  const upcoming = state.emiSchedules
    .filter(x => x.invoiceId === e.invoiceId && x.status === "Upcoming")
    .sort((a, b) => a.installmentNo - b.installmentNo)[0];
  if (upcoming) upcoming.status = "Due";
  log("EMI", id, "paid", by);
  save({ ...state });
}

/* ───────── Helpers / analytics ───────── */
export function recomputeOverdue() {
  const now = Date.now();
  state.invoices.forEach(i => {
    if (i.status !== "Paid" && i.status !== "Cancelled" && new Date(i.dueDate).getTime() < now && i.amountPaid < i.total) {
      i.status = "Overdue";
    }
  });
  state.emiSchedules.forEach(e => {
    if (e.status !== "Paid" && new Date(e.dueDate).getTime() < now) e.status = "Overdue";
  });
  state.vendorBills.forEach(b => {
    if (b.status !== "Paid" && new Date(b.dueDate).getTime() < now) b.status = "Overdue";
  });
  save({ ...state });
}

/* ───────── PI / TI helpers ───────── */
import { recordMapping, getMappingsForPi } from "./pi-ti-store";

/** How much of a PI has already been converted to TI(s). */
export function piConvertedAmount(piId: string): number {
  return getMappingsForPi(piId).reduce((s, m) => s + m.linkedAmount, 0);
}

/** Open balance still convertible on a PI. */
export function piOpenBalance(piId: string): number {
  const pi = state.invoices.find(i => i.id === piId);
  if (!pi) return 0;
  return Math.max(0, pi.total - piConvertedAmount(piId));
}

/** Update PI lifecycle status after conversion delta. */
function refreshPiStatus(pi: Invoice) {
  const converted = piConvertedAmount(pi.id);
  if (converted >= pi.total - 0.5) pi.status = "Converted";
  else if (converted > 0) pi.status = "Partial";
}

/**
 * Convert (part of) a PI into a new TI. Optionally also record a payment.
 * Returns { ti, mapping } or null if guard fails.
 */
export function convertPiToTi(args: {
  piId: string;
  amount: number;
  by: string;
  byName?: string;
  reason?: string;
  recordPaymentMode?: PaymentMode;
}): { ti: Invoice; mappingId: string } | null {
  const pi = state.invoices.find(i => i.id === args.piId);
  if (!pi || pi.invoiceType !== "PI") return null;
  const open = piOpenBalance(pi.id);
  if (args.amount <= 0 || args.amount > open + 0.5) return null;

  // Compute taxable + gst back from amount as gross-inclusive
  const ratio = pi.total > 0 ? args.amount / pi.total : 1;
  const taxable = pi.subtotal - pi.discount;
  const tiTaxable = taxable * ratio;
  const tiGst = pi.gstType === "Exempt" ? 0 : tiTaxable * pi.gstRate / 100;
  const intra = pi.igst === 0;

  const ti: Invoice = {
    id: uid("inv"),
    invoiceType: "TI",
    invoiceNo: nextNo("ti", "TI"),
    linkedPiId: pi.id,
    customerId: pi.customerId,
    customerName: pi.customerName,
    customerType: pi.customerType,
    revenueStream: pi.revenueStream,
    programId: pi.programId,
    programName: pi.programName,
    issueDate: todayISO(),
    dueDate: todayISO(),
    subtotal: tiTaxable,
    discount: 0,
    gstType: pi.gstType,
    gstRate: pi.gstRate,
    cgst: intra ? tiGst / 2 : 0,
    sgst: intra ? tiGst / 2 : 0,
    igst: intra ? 0 : tiGst,
    total: tiTaxable + tiGst,
    amountPaid: 0,
    status: "Sent",
    notes: `Converted from ${pi.invoiceNo}`,
    gstin: pi.gstin,
    createdBy: args.by,
    createdAt: todayISO(),
  };
  state.invoices.unshift(ti);

  // Track mapping
  const mapping = recordMapping({
    piId: pi.id, piNo: pi.invoiceNo,
    tiId: ti.id, tiNo: ti.invoiceNo,
    studentId: pi.customerId, studentName: pi.customerName,
    linkedAmount: args.amount,
    convertedBy: args.by, convertedByName: args.byName,
    mode: "convert", reason: args.reason,
  });

  // Update PI tracking
  pi.convertedTiIds = [...(pi.convertedTiIds ?? []), ti.id];
  refreshPiStatus(pi);

  // Optional immediate payment on the new TI
  if (args.recordPaymentMode) {
    const pay: Payment = {
      id: uid("pay"),
      receiptNo: nextNo("rcpt", "RCP"),
      invoiceId: ti.id,
      customerId: ti.customerId,
      customerName: ti.customerName,
      amount: ti.total,
      mode: args.recordPaymentMode,
      reference: `TI-${ti.invoiceNo}`,
      paidOn: todayISO(),
      recordedBy: args.by,
      createdAt: todayISO(),
    };
    state.payments.unshift(pay);
    ti.amountPaid = ti.total;
    ti.status = "Paid";
    state.cashflow.unshift({ id: uid("cf"), date: pay.paidOn, type: "Inflow", source: "Payment", refId: pay.id, amount: pay.amount });
  }

  log("Invoice", ti.id, `converted from ${pi.invoiceNo}`, args.by, args.reason);
  save({ ...state });
  return { ti, mappingId: mapping.id };
}

/**
 * Link an existing standalone TI back to a PI (e.g. walk-in cash case).
 * Linked amount is min(TI total, PI open balance).
 */
export function linkExistingTiToPi(args: {
  piId: string;
  tiId: string;
  by: string;
  byName?: string;
  reason?: string;
}): { mappingId: string } | null {
  const pi = state.invoices.find(i => i.id === args.piId);
  const ti = state.invoices.find(i => i.id === args.tiId);
  if (!pi || pi.invoiceType !== "PI" || !ti || ti.invoiceType !== "TI") return null;
  if (ti.linkedPiId) return null;
  const open = piOpenBalance(pi.id);
  const linked = Math.min(ti.total, open);
  if (linked <= 0) return null;

  ti.linkedPiId = pi.id;
  pi.convertedTiIds = [...(pi.convertedTiIds ?? []), ti.id];

  const mapping = recordMapping({
    piId: pi.id, piNo: pi.invoiceNo,
    tiId: ti.id, tiNo: ti.invoiceNo,
    studentId: pi.customerId, studentName: pi.customerName,
    linkedAmount: linked,
    convertedBy: args.by, convertedByName: args.byName,
    mode: "link_existing", reason: args.reason,
  });

  refreshPiStatus(pi);
  log("Invoice", ti.id, `linked to ${pi.invoiceNo}`, args.by, args.reason);
  save({ ...state });
  return { mappingId: mapping.id };
}

