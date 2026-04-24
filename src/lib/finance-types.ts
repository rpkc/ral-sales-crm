// Finance / Accounts module types
export type RevenueStream =
  | "Student Admissions"
  | "B2B Associations"
  | "Events"
  | "Digital Products"
  | "Merchandise"
  | "Misc Income";

export type PaymentMode = "Cash" | "Bank" | "UPI" | "Card" | "Cheque" | "Online";
export type GstType = "Taxable" | "Exempt" | "Zero Rated";
export type InvoiceStatus = "Draft" | "Sent" | "Partial" | "Paid" | "Overdue" | "Cancelled" | "Converted" | "Expired";
export type InvoiceType = "PI" | "TI";
export type ExpenseCategory = "Marketing" | "Salaries" | "Travel" | "Rent" | "Vendor" | "Trainer" | "Office" | "Misc";
export type ExpenseStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Paid" | "Hold";
export type VendorBillStatus = "Pending" | "Approved" | "Paid" | "Overdue";
export type EmiStatus = "Upcoming" | "Due" | "Paid" | "Overdue";

export interface Invoice {
  id: string;
  /** PI = Proforma Invoice (receivable, no GST liability), TI = Tax Invoice (revenue) */
  invoiceType?: InvoiceType;
  /** When TI was created from a PI, holds the PI's id */
  linkedPiId?: string;
  /** When PI has been (partially) converted, list of TI ids derived from it */
  convertedTiIds?: string[];
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerType: "Student" | "Institution" | "Event" | "Other";
  revenueStream: RevenueStream;
  programId?: string;
  programName?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  gstType: GstType;
  gstRate: number;     // %
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  gstin?: string;
  createdBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNo: string;
  invoiceId?: string;
  customerId: string;
  customerName: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  paidOn: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface EmiSchedule {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: EmiStatus;
  paidOn?: string;
  paymentId?: string;
}

export interface Expense {
  id: string;
  expenseNo: string;
  category: ExpenseCategory;
  vendorId?: string;
  vendorName?: string;
  amount: number;
  gst: number;
  total: number;
  spendDate: string;
  description: string;
  status: ExpenseStatus;
  paymentMode?: PaymentMode;
  attachmentRef?: string;
  submittedBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  gstin?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance: number;
  createdAt: string;
}

export interface VendorBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  billDate: string;
  dueDate: string;
  amount: number;
  gst: number;
  total: number;
  paid: number;
  status: VendorBillStatus;
  notes?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  department: string;
  category: ExpenseCategory;
  month: string; // YYYY-MM
  plannedAmount: number;
  notes?: string;
  createdAt: string;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  type: "Inflow" | "Outflow";
  source: string; // e.g. "Invoice", "Expense", "Vendor Bill"
  refId?: string;
  amount: number;
  notes?: string;
}

export interface FinanceLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  by: string;
  at: string;
  detail?: string;
}
