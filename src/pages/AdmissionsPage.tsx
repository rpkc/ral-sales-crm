import { useState, useRef, useEffect, useCallback } from "react";
import { store } from "@/lib/mock-data";
import { Admission, PaymentStatus, PaymentMode, PaymentType, PaymentHistoryEntry } from "@/lib/types";
import {
  MASTER_PAYMENT_MODES, MASTER_COURSE_NAMES, MASTER_BATCH_TIMINGS,
  MASTER_SCHOLARSHIP_LEVELS, getCourseFee,
} from "@/lib/master-schema";
import { computeBreakup } from "@/lib/gst-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { AutoPiPromptDialog } from "@/components/admissions/AutoPiPromptDialog";
import { findOpenPiForStudent } from "@/lib/pi-helpers";
import { fmtINR } from "@/components/finance/FinanceKpi";
import { Button as UiButton } from "@/components/ui/button";
import { GraduationCap, IndianRupee, UserCheck, Plus, CreditCard, AlertCircle, CheckCircle2, User, Phone, Building2, CalendarClock, FileText, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PAYMENT_MODES: PaymentMode[] = [...MASTER_PAYMENT_MODES] as PaymentMode[];
const PAYMENT_TYPES: PaymentType[] = ["Admission Fee", "Seat Booking", "Registration", "EMI"];

function getReferenceDisplay(mode: PaymentMode | "", chequeNumber: string, transactionId: string) {
  if (mode === "Cheque") return chequeNumber || "—";
  if (mode === "Online Transfer") return transactionId || "—";
  return "Cash Payment";
}

// Smart Suggestion Card
function SuggestionCard({ admission }: { admission: Admission | null }) {
  if (!admission) return null;

  const lastPayment = admission.paymentHistory.length > 0
    ? admission.paymentHistory[admission.paymentHistory.length - 1]
    : null;

  const totalPaid = admission.paymentHistory.reduce((s, p) => s + p.amountPaid, 0);
  const remaining = admission.totalFee - totalPaid;

  // Calculate next EMI due date (30 days after last payment)
  let nextEmiDate = "";
  let isOverdue = false;
  if (admission.paymentType === "EMI" && lastPayment) {
    const last = new Date(lastPayment.paymentDate);
    last.setDate(last.getDate() + 30);
    nextEmiDate = last.toISOString().split("T")[0];
    isOverdue = new Date(nextEmiDate) < new Date();
  }

  return (
    <div className="rounded-xl bg-card shadow-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        Student Payment Summary
      </h3>

      {/* Student Details */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Student Details</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-card-foreground"><User className="h-3.5 w-3.5 text-muted-foreground" />{admission.studentName}</div>
          <div className="flex items-center gap-2 text-muted-foreground"><span className="text-xs">{admission.courseSelected} · {admission.batch}</span></div>
        </div>
      </div>

      {/* Parent Details */}
      {admission.parentName && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parent Details</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-card-foreground"><User className="h-3.5 w-3.5 text-muted-foreground" />{admission.parentName}</div>
            {admission.parentPhone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{admission.parentPhone}</div>}
          </div>
        </div>
      )}

      {/* Bank Details */}
      {(admission.studentBankName || admission.parentBankName) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Details</p>
          <div className="space-y-1 text-sm">
            {admission.studentBankName && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />Student: {admission.studentBankName}</div>}
            {admission.parentBankName && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />Parent: {admission.parentBankName}</div>}
          </div>
        </div>
      )}

      {/* Payment Insights */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Insights</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Fee</span>
            <span className="font-medium text-card-foreground">₹{admission.totalFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-medium text-success">₹{totalPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-primary">₹{remaining.toLocaleString()}</span>
          </div>
          {lastPayment && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Payment</span>
              <span className="text-card-foreground">{lastPayment.paymentDate}</span>
            </div>
          )}
          {lastPayment?.emiNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last EMI</span>
              <span className="text-card-foreground">EMI {lastPayment.emiNumber} of {admission.totalEmis}</span>
            </div>
          )}
        </div>
      </div>

      {/* EMI Reminder */}
      {nextEmiDate && (
        <div className={`rounded-lg p-3 text-xs flex items-start gap-2 ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
          <CalendarClock className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {isOverdue
              ? `EMI overdue! Was due on ${nextEmiDate}. Please follow up.`
              : `Next EMI due on ${nextEmiDate}`}
          </span>
        </div>
      )}

      {/* TI Suggestion Banner — non-blocking */}
      {lastPayment && (
        <TiSuggestionBanner admission={admission} totalPaid={totalPaid} remaining={remaining} />
      )}
    </div>
  );
}

/** Non-blocking banner suggesting Tax Invoice generation after a payment is logged. */
function TiSuggestionBanner({
  admission,
  totalPaid,
  remaining,
}: {
  admission: Admission;
  totalPaid: number;
  remaining: number;
}) {
  const navigate = useNavigate();
  const fullyPaid = remaining <= 0.5;
  const linkedPi = findOpenPiForStudent(admission.studentName);

  const message = fullyPaid
    ? "Payment complete. Generate Tax Invoice now."
    : "Partial payment received. Generate TI for received amount or wait per policy.";

  const handleGenerate = () => {
    toast.info("Opening billing — Create Tax Invoice", {
      description: `Recipient: ${admission.studentName} · Amount: ${fmtINR(totalPaid)}`,
    });
    navigate("/accounts");
  };

  return (
    <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Receipt className="h-4 w-4 text-success shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-success" />
            <p className="text-xs font-semibold text-success">TI Suggested</p>
          </div>
          <p className="text-[11px] text-foreground mt-0.5">{message}</p>
          {linkedPi && (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Linked PI: <span className="font-medium">{linkedPi.invoiceNo}</span>
            </p>
          )}
        </div>
      </div>
      <UiButton size="sm" variant="outline" className="w-full h-7 text-xs border-success/40 text-success hover:bg-success/10" onClick={handleGenerate}>
        Generate Tax Invoice
      </UiButton>
    </div>
  );
}

// Payment Form inside dialog
function PaymentForm({
  admission,
  onSave,
}: {
  admission: Admission;
  onSave: (updated: Admission) => void;
}) {
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(admission.paymentStatus);
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [emiNumber, setEmiNumber] = useState("");
  const [totalEmis, setTotalEmis] = useState(admission.totalEmis?.toString() || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chequeRef = useRef<HTMLInputElement>(null);
  const txnRef = useRef<HTMLInputElement>(null);
  const emiRef = useRef<HTMLInputElement>(null);

  // Auto-focus revealed fields
  useEffect(() => {
    if (paymentMode === "Cheque") chequeRef.current?.focus();
    if (paymentMode === "Online Transfer") txnRef.current?.focus();
  }, [paymentMode]);

  useEffect(() => {
    if (paymentType === "EMI") emiRef.current?.focus();
  }, [paymentType]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!amountPaid || parseFloat(amountPaid) <= 0) errs.amountPaid = "Please enter a valid payment amount.";
    if (!paymentMode) errs.paymentMode = "Please select a payment mode.";
    if (paymentMode === "Cheque" && !chequeNumber.trim()) errs.chequeNumber = "Please enter the cheque number to continue.";
    if (paymentMode === "Online Transfer" && !transactionId.trim()) errs.transactionId = "Transaction ID is required for online payments.";
    if (paymentStatus === "Partial" && !paymentType) errs.paymentType = "Select the purpose of this payment.";
    if (paymentType === "EMI") {
      if (!emiNumber) errs.emiNumber = "Please specify which EMI installment this payment belongs to.";
      if (!totalEmis) errs.totalEmis = "Please enter the total number of EMIs.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [amountPaid, paymentMode, chequeNumber, transactionId, paymentStatus, paymentType, emiNumber, totalEmis]);

  const handleSave = () => {
    if (!validate()) return;

    const entry: PaymentHistoryEntry = {
      id: `ph${Date.now()}`,
      paymentDate: new Date().toISOString().split("T")[0],
      amountPaid: parseFloat(amountPaid),
      paymentMode: paymentMode as PaymentMode,
      referenceNumber: getReferenceDisplay(paymentMode, chequeNumber, transactionId),
      paymentType: paymentType,
      emiNumber: paymentType === "EMI" ? parseInt(emiNumber) : null,
    };

    const updated: Admission = {
      ...admission,
      paymentStatus,
      paymentMode: paymentMode as PaymentMode,
      chequeNumber,
      transactionId,
      paymentType,
      emiNumber: paymentType === "EMI" ? parseInt(emiNumber) : null,
      totalEmis: paymentType === "EMI" ? parseInt(totalEmis) : admission.totalEmis,
      paymentHistory: [...admission.paymentHistory, entry],
    };

    onSave(updated);
    toast.success("Payment recorded successfully.", { icon: <CheckCircle2 className="h-4 w-4" /> });
  };

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {msg}
      </p>
    ) : null;

  return (
    <div className="space-y-4 pt-2">
      {/* Amount */}
      <div>
        <Label>Amount Paid (₹)</Label>
        <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="e.g. 25000" />
        <FieldError msg={errors.amountPaid} />
      </div>

      {/* Payment Mode */}
      <div>
        <Label>Payment Mode</Label>
        <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v as PaymentMode); setChequeNumber(""); setTransactionId(""); }}>
          <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
          <SelectContent>
            {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldError msg={errors.paymentMode} />
      </div>

      {/* Conditional: Cheque Number */}
      {paymentMode === "Cheque" && (
        <div className="animate-slide-down">
          <Label>Cheque Number</Label>
          <Input ref={chequeRef} value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="e.g. 000123" />
          <p className="text-xs text-muted-foreground mt-1">Enter the cheque number printed on the cheque.</p>
          <FieldError msg={errors.chequeNumber} />
        </div>
      )}

      {/* Conditional: Transaction ID */}
      {paymentMode === "Online Transfer" && (
        <div className="animate-slide-down">
          <Label>Transaction ID</Label>
          <Input ref={txnRef} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. TXN20260325001" />
          <p className="text-xs text-muted-foreground mt-1">Enter the bank or payment gateway transaction reference.</p>
          <FieldError msg={errors.transactionId} />
        </div>
      )}

      {/* Payment Status */}
      <div>
        <Label>Payment Status</Label>
        <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v as PaymentStatus); if (v !== "Partial") setPaymentType(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["Pending", "Partial", "Paid"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional: Payment Type (only for Partial) */}
      {paymentStatus === "Partial" && (
        <div className="animate-slide-down">
          <Label>Payment Type</Label>
          <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
            <SelectTrigger><SelectValue placeholder="Select the purpose of this payment" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Select the purpose of this payment.</p>
          <FieldError msg={errors.paymentType} />
        </div>
      )}

      {/* Conditional: EMI Details */}
      {paymentType === "EMI" && (
        <div className="animate-slide-down grid grid-cols-2 gap-3">
          <div>
            <Label>EMI Number</Label>
            <Input ref={emiRef} type="number" value={emiNumber} onChange={(e) => setEmiNumber(e.target.value)} placeholder="e.g. 2" />
            <p className="text-xs text-muted-foreground mt-1">Current EMI installment number.</p>
            <FieldError msg={errors.emiNumber} />
          </div>
          <div>
            <Label>Total EMIs</Label>
            <Input type="number" value={totalEmis} onChange={(e) => setTotalEmis(e.target.value)} placeholder="e.g. 6" />
            {emiNumber && totalEmis && (
              <p className="text-xs text-muted-foreground mt-1">Example: EMI {emiNumber} of {totalEmis}.</p>
            )}
            <FieldError msg={errors.totalEmis} />
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">Record Payment</Button>
    </div>
  );
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>(store.getAdmissions());
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentDialogAdm, setPaymentDialogAdm] = useState<Admission | null>(null);
  const [selectedAdm, setSelectedAdm] = useState<Admission | null>(admissions[0] || null);
  const [newPaymentIds, setNewPaymentIds] = useState<Set<string>>(new Set());
  const [autoPiAdm, setAutoPiAdm] = useState<Admission | null>(null);
  const navigate = useNavigate();

  const leads = store.getLeads();
  const qualifiedLeads = leads.filter((l) => l.status === "Admission" || l.status === "Qualified");

  const [form, setForm] = useState({
    leadId: "", courseSelected: "", batch: "", admissionDate: "", totalFee: "",
    paymentStatus: "Pending" as PaymentStatus,
    parentName: "", parentPhone: "", studentBankName: "", parentBankName: "",
  });

  const handleCreate = () => {
    const lead = leads.find((l) => l.id === form.leadId);
    if (!lead) return;
    const newAdm: Admission = {
      id: `a${Date.now()}`,
      leadId: form.leadId,
      studentName: lead.name,
      phone: lead.phone,
      email: lead.email,
      courseSelected: form.courseSelected,
      batch: form.batch,
      admissionDate: form.admissionDate,
      totalFee: parseFloat(form.totalFee) || 0,
      paymentStatus: form.paymentStatus,
      paymentMode: "",
      chequeNumber: "",
      transactionId: "",
      paymentType: "",
      emiNumber: null,
      totalEmis: null,
      paymentHistory: [],
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      studentBankName: form.studentBankName,
      parentBankName: form.parentBankName,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...admissions, newAdm];
    setAdmissions(updated);
    store.saveAdmissions(updated);

    const updatedLeads = leads.map((l) => l.id === form.leadId ? { ...l, status: "Admission" as const } : l);
    store.saveLeads(updatedLeads);

    setForm({ leadId: "", courseSelected: "", batch: "", admissionDate: "", totalFee: "", paymentStatus: "Pending", parentName: "", parentPhone: "", studentBankName: "", parentBankName: "" });
    setCreateOpen(false);
    toast.success("Admission created successfully.");
    // Auto-PI prompt: open prefilled PI dialog after admission confirmation
    setAutoPiAdm(newAdm);
  };

  const handlePaymentSave = (updated: Admission) => {
    const newHistory = updated.paymentHistory;
    const lastEntry = newHistory[newHistory.length - 1];
    const all = admissions.map((a) => (a.id === updated.id ? updated : a));
    setAdmissions(all);
    store.saveAdmissions(all);
    setSelectedAdm(updated);
    setPaymentDialogAdm(null);
    if (lastEntry) {
      setNewPaymentIds((prev) => new Set(prev).add(lastEntry.id));
      setTimeout(() => setNewPaymentIds((prev) => { const n = new Set(prev); n.delete(lastEntry.id); return n; }), 1600);
    }
  };

  const totalRevenue = admissions.reduce((sum, a) => sum + a.totalFee, 0);
  const paidCount = admissions.filter((a) => a.paymentStatus === "Paid").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admissions</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Convert qualified leads into student records</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Admission</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Admission</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Select Lead</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose qualified lead" /></SelectTrigger>
                  <SelectContent>{qualifiedLeads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} — {l.interestedCourse}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course</Label>
                  <Select
                    value={form.courseSelected}
                    onValueChange={(v) => {
                      const fee = getCourseFee(v);
                      setForm({ ...form, courseSelected: v, totalFee: fee ? String(fee) : form.totalFee });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{MASTER_COURSE_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Batch Timing</Label>
                  <Select value={form.batch} onValueChange={(v) => setForm({ ...form, batch: v })}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{MASTER_BATCH_TIMINGS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Admission Date</Label><Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></div>
                <div>
                  <Label>Total Fee (GST Included, ₹)</Label>
                  <Input type="number" value={form.totalFee} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground mt-1">Auto-fills from selected course; edit if scholarship applies.</p>
                </div>
              </div>
              {parseFloat(form.totalFee) > 0 && (() => {
                const b = computeBreakup(parseFloat(form.totalFee), 18, "gross_inclusive", true);
                return (
                  <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                    <p className="font-medium text-foreground">Student Payable Breakup (GST 18%)</p>
                    <div className="flex justify-between text-muted-foreground"><span>Course Fee (Taxable)</span><span className="tabular-nums">₹{b.taxable.toLocaleString()}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>CGST (9%)</span><span className="tabular-nums">₹{b.cgst.toLocaleString()}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>SGST (9%)</span><span className="tabular-nums">₹{b.sgst.toLocaleString()}</span></div>
                    <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border"><span>Total Payable</span><span className="tabular-nums">₹{b.gross.toLocaleString()}</span></div>
                  </div>
                );
              })()}
              <div>
                <Label>Payment Status</Label>
                <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v as PaymentStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["Pending", "Partial", "Paid"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Parent & Bank info */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Parent & Bank Details (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Parent Name</Label><Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></div>
                <div><Label>Parent Phone</Label><Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Student Bank</Label><Input value={form.studentBankName} onChange={(e) => setForm({ ...form, studentBankName: e.target.value })} /></div>
                <div><Label>Parent Bank</Label><Input value={form.parentBankName} onChange={(e) => setForm({ ...form, parentBankName: e.target.value })} /></div>
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={!form.leadId || !form.courseSelected}>Create Admission</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard title="Fully Paid" value={paidCount} icon={<UserCheck className="h-5 w-5" />} />
      </div>

      {/* Main content: Table + Suggestion Card */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Admissions Table */}
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Course</th>
                <th className="p-4 font-medium">Batch</th>
                <th className="p-4 font-medium">Fee</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selectedAdm?.id === a.id ? "bg-accent/40" : ""}`}
                  onClick={() => setSelectedAdm(a)}
                >
                  <td className="p-4">
                    <p className="font-medium text-card-foreground">{a.studentName}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{a.courseSelected}</td>
                  <td className="p-4 text-muted-foreground">{a.batch}</td>
                  <td className="p-4 font-medium text-card-foreground">₹{a.totalFee.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      a.paymentStatus === "Paid" ? "bg-success/10 text-success" :
                      a.paymentStatus === "Partial" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{a.paymentStatus}</span>
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setPaymentDialogAdm(a); }}>
                      <CreditCard className="mr-1 h-3.5 w-3.5" />Pay
                    </Button>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No admissions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Suggestion Card */}
        <SuggestionCard admission={selectedAdm} />
      </div>

      {/* Payment History for selected admission */}
      {selectedAdm && selectedAdm.paymentHistory.length > 0 && (
        <div className="rounded-xl bg-card shadow-card">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-foreground">Payment History — {selectedAdm.studentName}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Mode</th>
                  <th className="p-4 font-medium">Reference</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">EMI</th>
                </tr>
              </thead>
              <tbody>
                {selectedAdm.paymentHistory.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b last:border-0 ${newPaymentIds.has(p.id) ? "animate-highlight-row" : ""}`}
                  >
                    <td className="p-4 text-muted-foreground">{p.paymentDate}</td>
                    <td className="p-4 font-medium text-card-foreground">₹{p.amountPaid.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{p.paymentMode}</td>
                    <td className="p-4 text-muted-foreground">{p.referenceNumber}</td>
                    <td className="p-4 text-muted-foreground">{p.paymentType || "—"}</td>
                    <td className="p-4 text-muted-foreground">{p.emiNumber ? `EMI ${p.emiNumber}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentDialogAdm} onOpenChange={(open) => { if (!open) setPaymentDialogAdm(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment — {paymentDialogAdm?.studentName}</DialogTitle>
          </DialogHeader>
          {paymentDialogAdm && (
            <PaymentForm admission={paymentDialogAdm} onSave={handlePaymentSave} />
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-PI prompt — opens after admission confirmation */}
      <AutoPiPromptDialog admission={autoPiAdm} open={!!autoPiAdm} onClose={() => setAutoPiAdm(null)} />
    </div>
  );
}
