/**
 * Log Collection dialog — used by both Counselors and Admins.
 *
 * Captures the spec's full payload: collector role, branch, mode-conditional
 * reference fields (UPI/bank txn id + bank, cheque number/bank/date, cash
 * confirmation), optional attachments, and an Invoice Request selector
 * (PI / TI / No Invoice Yet).
 *
 * Counselor → request lands at Admin; Admin → goes straight to Accounts.
 */
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IndianRupee, Sparkles, AlertCircle, Paperclip, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  COLLECTION_MODES, COLLECTION_REASONS, logCollection,
  type CollectionMode, type CollectionReason,
  type InvoiceRequestType, type CollectionAttachment,
} from "@/lib/collection-store";
import { notifyCollectionLogged, notifyInvoiceRequestCreated } from "@/lib/collection-notifications";

interface PrefilledStudent {
  id: string;
  name: string;
  course: string;
  mobile?: string;
}

interface PrefilledEmi {
  emiId: string;
  installmentNo: number;
  baseAmount: number;
  lateFee: number;
  daysOverdue: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  students: PrefilledStudent[];
  prefilledStudentId?: string;
  prefilledEmi?: PrefilledEmi | null;
  /** When true, runs as the Admin direct-collection variant. Defaults to counselor. */
  asAdmin?: boolean;
  /** Optional list of branches to choose from. */
  branches?: string[];
}

const DEFAULT_BRANCHES = [
  "Kolkata - Park Street",
  "Kolkata - Salt Lake",
  "Howrah",
  "Online / Remote",
];

export function LogCollectionDialog({
  open, onClose, students, prefilledStudentId, prefilledEmi,
  asAdmin = false, branches = DEFAULT_BRANCHES,
}: Props) {
  const { currentUser } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [mobile, setMobile] = useState("");
  const [branch, setBranch] = useState(branches[0]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<CollectionMode | "">("");
  const [reason, setReason] = useState<CollectionReason | "">("");
  const [txnId, setTxnId] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [requestType, setRequestType] = useState<InvoiceRequestType>("none");
  const [attachments, setAttachments] = useState<CollectionAttachment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStudentId(prefilledStudentId || "");
      setReason(prefilledEmi ? "emi_payment" : "");
      setAmount(prefilledEmi ? String(prefilledEmi.baseAmount) : "");
      setMode("");
      setTxnId("");
      setBankName("");
      setChequeNumber("");
      setChequeDate("");
      setCashConfirmed(false);
      setRemarks("");
      setRequestType("none");
      setAttachments([]);
      setMobile("");
      setBranch(branches[0]);
      setError("");
    }
  }, [open, prefilledStudentId, prefilledEmi, branches]);

  const student = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);
  useEffect(() => {
    if (student?.mobile && !mobile) setMobile(student.mobile);
  }, [student, mobile]);

  const showLateFeeChip = !!prefilledEmi && prefilledEmi.lateFee > 0 && reason === "emi_payment";
  const includeLateFee = () => {
    if (!prefilledEmi) return;
    setAmount(String(prefilledEmi.baseAmount + prefilledEmi.lateFee));
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>, kind: CollectionAttachment["kind"]) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 600 * 1024) { setError("Attachments must be under 600 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [
        ...prev.filter(a => a.kind !== kind),
        {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          kind, name: f.name, dataUrl: String(reader.result),
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const submit = () => {
    setError("");
    if (!student) return setError("Select a student.");
    if (!mobile.trim()) return setError("Mobile number is required.");
    if (!branch) return setError("Branch / location is required.");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount received from the student.");
    if (!mode) return setError("Select payment mode.");
    if (!reason) return setError("Select collection reason.");

    if (mode === "upi" || mode === "bank_transfer") {
      if (!txnId.trim()) return setError("Transaction ID is required for UPI / Bank Transfer.");
      if (!bankName.trim()) return setError("Bank name is required.");
    }
    if (mode === "cheque") {
      if (!chequeNumber.trim()) return setError("Cheque number is required.");
      if (!bankName.trim()) return setError("Bank name is required.");
      if (!chequeDate) return setError("Cheque date is required.");
    }
    if (mode === "cash" && !cashConfirmed) {
      return setError("Confirm physical cash receipt.");
    }

    const c = logCollection(
      {
        studentId: student.id,
        studentName: student.name,
        studentMobile: mobile.trim(),
        courseName: student.course,
        branch,
        amount: amt,
        mode,
        reason,
        remarks,
        emiId: prefilledEmi?.emiId,
        emiInstallmentNo: prefilledEmi?.installmentNo,
        lateFeeAmount:
          showLateFeeChip && amt >= (prefilledEmi.baseAmount + prefilledEmi.lateFee)
            ? prefilledEmi.lateFee
            : undefined,
        txnId: txnId || undefined,
        bankName: bankName || undefined,
        chequeNumber: chequeNumber || undefined,
        chequeDate: chequeDate || undefined,
        attachments: attachments.length ? attachments : undefined,
        requestInvoiceType: requestType,
      },
      {
        id: currentUser?.id || "u0",
        name: currentUser?.name || (asAdmin ? "Admin" : "Counselor"),
        role: currentUser?.role || (asAdmin ? "admin" : "counselor"),
      },
    );
    notifyCollectionLogged(c);
    if (requestType !== "none") notifyInvoiceRequestCreated(c);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            {asAdmin ? "Direct Collection (Admin)" : "Log Collection"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            Record exact amount received from student.
            {asAdmin ? " Admin entries skip counselor review." : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Branch / Location</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mobile Number</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Student mobile" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.course}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showLateFeeChip && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                <span className="text-warning">
                  Late fee accrued: <strong>₹{prefilledEmi.lateFee.toLocaleString("en-IN")}</strong> ({prefilledEmi.daysOverdue}d × ₹50)
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-warning/40 text-warning" onClick={includeLateFee}>
                Add to amount
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" />
            </div>
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as CollectionMode)}>
                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>
                  {COLLECTION_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Collection Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as CollectionReason)}>
              <SelectTrigger><SelectValue placeholder="Why is this being collected?" /></SelectTrigger>
              <SelectContent>
                {COLLECTION_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Mode-conditional fields */}
          {(mode === "upi" || mode === "bank_transfer") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{mode === "upi" ? "UPI Transaction ID" : "Bank Transaction ID"}</Label>
                <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="Required" />
              </div>
              <div>
                <Label className="text-xs">Bank</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC" />
              </div>
            </div>
          )}
          {mode === "cheque" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Cheque Number</Label>
                <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bank</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cheque Date</Label>
                <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
              </div>
            </div>
          )}
          {mode === "cash" && (
            <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs cursor-pointer">
              <Checkbox checked={cashConfirmed} onCheckedChange={(v) => setCashConfirmed(!!v)} />
              <span>I have physically received this cash and counted it.</span>
            </label>
          )}

          {/* Invoice Request */}
          <div>
            <Label className="text-xs">Invoice Request</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as InvoiceRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No invoice yet</SelectItem>
                <SelectItem value="PI">Request Proforma Invoice (PI)</SelectItem>
                <SelectItem value="TI">Request Tax Invoice (TI)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              {requestType === "none"
                ? "You can request an invoice later from your queue."
                : asAdmin
                  ? "Submit verified details for PI/TI issuance — goes straight to Accounts."
                  : "Submit verified details for PI/TI issuance — Admin will review first."}
            </p>
          </div>

          {/* Attachments */}
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" /> Attachments (optional, ≤600 KB each)
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <label className="rounded border bg-card px-2 py-1.5 text-center cursor-pointer hover:bg-muted">
                Payment screenshot
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e, "payment_screenshot")} />
              </label>
              <label className="rounded border bg-card px-2 py-1.5 text-center cursor-pointer hover:bg-muted">
                Deposit slip
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e, "deposit_slip")} />
              </label>
              <label className="rounded border bg-card px-2 py-1.5 text-center cursor-pointer hover:bg-muted">
                Student note
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e, "student_note")} />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-[10px] bg-card border rounded px-2 py-1">
                    <span className="truncate">{a.kind.replace(/_/g, " ")} · {a.name}</span>
                    <button type="button" onClick={() => removeAttachment(a.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Remarks (optional)</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything admin/accounts should know" />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={submit}>
              {requestType === "none" ? "Log Collection" : "Log + Request Invoice"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Status will be <Badge variant="outline" className="text-[10px] px-1 py-0">Collected</Badge>
            {requestType !== "none" && (
              <> · Invoice request → <Badge variant="outline" className="text-[10px] px-1 py-0">{asAdmin ? "Awaiting Accounts" : "Awaiting Admin"}</Badge></>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
