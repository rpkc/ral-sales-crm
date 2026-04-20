/**
 * Tally-ready voucher generator + CSV/JSON download helpers.
 * Builds a single normalized voucher schema from finance state so exports
 * can be filtered by transaction type and date range.
 */
import type { Invoice, Payment, Expense, VendorBill } from "./finance-types";
import { getFinance } from "./finance-store";

export type TxnType =
  | "sales_invoices"
  | "receipts"
  | "expense_vouchers"
  | "payment_vouchers"
  | "journal_entries"
  | "student_fee_collections"
  | "vendor_payments"
  | "all_transactions";

export type DateRange = "today" | "this_week" | "this_month" | "custom_range";

export interface TallyVoucher {
  voucher_date: string;       // YYYY-MM-DD
  voucher_type: string;       // Sales / Receipt / Payment / Journal
  voucher_number: string;
  ledger_name: string;
  party_name: string;
  debit_amount: number;
  credit_amount: number;
  narration: string;
  gst_number: string;
  reference_number: string;
}

const d10 = (iso: string) => (iso || "").slice(0, 10);

function fromInvoice(i: Invoice): TallyVoucher {
  return {
    voucher_date: d10(i.issueDate),
    voucher_type: "Sales",
    voucher_number: i.invoiceNo,
    ledger_name: i.revenueStream,
    party_name: i.customerName,
    debit_amount: i.total,
    credit_amount: 0,
    narration: `Invoice ${i.invoiceNo} — ${i.programName || i.revenueStream}`,
    gst_number: i.gstin || "",
    reference_number: i.invoiceNo,
  };
}

function fromPayment(p: Payment, isStudent: boolean): TallyVoucher {
  return {
    voucher_date: d10(p.paidOn),
    voucher_type: "Receipt",
    voucher_number: p.receiptNo,
    ledger_name: isStudent ? "Student Fees" : `Bank/${p.mode}`,
    party_name: p.customerName,
    debit_amount: 0,
    credit_amount: p.amount,
    narration: `Receipt ${p.receiptNo} via ${p.mode}${p.reference ? ` (${p.reference})` : ""}`,
    gst_number: "",
    reference_number: p.reference || p.receiptNo,
  };
}

function fromExpense(e: Expense): TallyVoucher {
  return {
    voucher_date: d10(e.spendDate),
    voucher_type: "Payment",
    voucher_number: e.expenseNo,
    ledger_name: e.category,
    party_name: e.vendorName || e.category,
    debit_amount: e.total,
    credit_amount: 0,
    narration: e.description || `${e.category} expense`,
    gst_number: "",
    reference_number: e.expenseNo,
  };
}

function fromVendorBill(b: VendorBill): TallyVoucher {
  return {
    voucher_date: d10(b.billDate),
    voucher_type: "Payment",
    voucher_number: b.billNo,
    ledger_name: "Vendor Payable",
    party_name: b.vendorName,
    debit_amount: b.total,
    credit_amount: 0,
    narration: `Vendor bill ${b.billNo}`,
    gst_number: "",
    reference_number: b.billNo,
  };
}

function rangeBounds(range: DateRange, customFrom?: string, customTo?: string): [number, number] {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (range === "today") return [start.getTime(), end.getTime()];
  if (range === "this_week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    return [start.getTime(), end.getTime()];
  }
  if (range === "this_month") {
    start.setDate(1);
    return [start.getTime(), end.getTime()];
  }
  // custom
  const f = customFrom ? new Date(customFrom).setHours(0, 0, 0, 0) : 0;
  const t = customTo ? new Date(customTo).setHours(23, 59, 59, 999) : Date.now();
  return [f, t];
}

export function buildVouchers(
  type: TxnType,
  range: DateRange,
  customFrom?: string,
  customTo?: string,
): TallyVoucher[] {
  const fin = getFinance();
  const [from, to] = rangeBounds(range, customFrom, customTo);
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= from && t <= to;
  };

  let rows: TallyVoucher[] = [];

  const wantSales = type === "sales_invoices" || type === "all_transactions";
  const wantReceipts = type === "receipts" || type === "all_transactions";
  const wantStudent = type === "student_fee_collections";
  const wantExpense = type === "expense_vouchers" || type === "all_transactions";
  const wantPayment = type === "payment_vouchers" || type === "all_transactions";
  const wantVendor = type === "vendor_payments" || type === "all_transactions";
  const wantJournal = type === "journal_entries" || type === "all_transactions";

  if (wantSales) rows.push(...fin.invoices.filter(i => inWindow(i.issueDate)).map(fromInvoice));

  if (wantReceipts) rows.push(...fin.payments.filter(p => inWindow(p.paidOn)).map(p => fromPayment(p, false)));

  if (wantStudent) {
    const studentInvIds = new Set(fin.invoices.filter(i => i.customerType === "Student").map(i => i.id));
    rows.push(
      ...fin.payments
        .filter(p => inWindow(p.paidOn) && p.invoiceId && studentInvIds.has(p.invoiceId))
        .map(p => fromPayment(p, true))
    );
  }

  if (wantExpense || wantPayment) {
    rows.push(
      ...fin.expenses
        .filter(e => e.status === "Approved" && inWindow(e.spendDate))
        .map(fromExpense)
    );
  }

  if (wantVendor) {
    rows.push(
      ...fin.vendorBills
        .filter(b => b.status === "Paid" && inWindow(b.billDate))
        .map(fromVendorBill)
    );
  }

  if (wantJournal) {
    // Treat EMI conversions as journal entries for now
    rows.push(
      ...fin.emiSchedules
        .filter(e => e.status === "Paid" && e.paidOn && inWindow(e.paidOn))
        .map<TallyVoucher>(e => ({
          voucher_date: d10(e.paidOn!),
          voucher_type: "Journal",
          voucher_number: `EMI-${e.id.slice(-6)}`,
          ledger_name: "Student Fees (EMI)",
          party_name: e.customerName,
          debit_amount: 0,
          credit_amount: e.amount,
          narration: `EMI #${e.installmentNo} settled`,
          gst_number: "",
          reference_number: `EMI-${e.installmentNo}`,
        }))
    );
  }

  // Stable sort by date desc
  return rows.sort((a, b) => b.voucher_date.localeCompare(a.voucher_date));
}

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function vouchersToCsv(rows: TallyVoucher[]): string {
  const headers: (keyof TallyVoucher)[] = [
    "voucher_date", "voucher_type", "voucher_number", "ledger_name",
    "party_name", "debit_amount", "credit_amount", "narration",
    "gst_number", "reference_number",
  ];
  const head = headers.join(",");
  const body = rows.map(r => headers.map(h => csvEscape(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
}

/** JSON shape uses camelCase per spec. */
export function vouchersToJson(rows: TallyVoucher[]) {
  return rows.map(r => ({
    voucherDate: r.voucher_date,
    voucherType: r.voucher_type,
    voucherNo: r.voucher_number,
    ledgerName: r.ledger_name,
    partyName: r.party_name,
    debit: r.debit_amount,
    credit: r.credit_amount,
    narration: r.narration,
    referenceNo: r.reference_number,
  }));
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
