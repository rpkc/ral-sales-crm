/**
 * Log Collection dialog — Counselor records a payment received from a student.
 * Mandatory fields per spec; mode-conditional reference field; optional EMI link
 * with auto-computed late fee chip (₹50/day).
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  COLLECTION_MODES, COLLECTION_REASONS, logCollection,
  type CollectionMode, type CollectionReason,
} from "@/lib/collection-store";
import { notifyCollectionLogged } from "@/lib/collection-notifications";

interface PrefilledStudent {
  id: string;
  name: string;
  course: string;
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
}

export function LogCollectionDialog({ open, onClose, students, prefilledStudentId, prefilledEmi }: Props) {
  const { currentUser } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<CollectionMode | "">("");
  const [reason, setReason] = useState<CollectionReason | "">("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStudentId(prefilledStudentId || "");
      setReason(prefilledEmi ? "emi_payment" : "");
      setAmount(prefilledEmi ? String(prefilledEmi.baseAmount) : "");
      setMode("");
      setReference("");
      setRemarks("");
      setError("");
    }
  }, [open, prefilledStudentId, prefilledEmi]);

  const student = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);

  const showLateFeeChip = !!prefilledEmi && prefilledEmi.lateFee > 0 && reason === "emi_payment";
  const includeLateFee = () => {
    if (!prefilledEmi) return;
    setAmount(String(prefilledEmi.baseAmount + prefilledEmi.lateFee));
  };

  const submit = () => {
    setError("");
    if (!student) return setError("Select a student.");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount received from the student.");
    if (!mode) return setError("Select payment mode.");
    if (!reason) return setError("Select collection reason.");
    if ((mode === "cheque" || mode === "bank_transfer" || mode === "upi") && !reference.trim()) {
      return setError("Reference number is required for non-cash payments.");
    }

    const c = logCollection(
      {
        studentId: student.id,
        studentName: student.name,
        courseName: student.course,
        amount: amt,
        mode,
        reason,
        remarks: [remarks, reference ? `Ref: ${reference}` : ""].filter(Boolean).join(" · "),
        emiId: prefilledEmi?.emiId,
        emiInstallmentNo: prefilledEmi?.installmentNo,
        lateFeeAmount:
          showLateFeeChip && amt >= (prefilledEmi.baseAmount + prefilledEmi.lateFee)
            ? prefilledEmi.lateFee
            : undefined,
      },
      {
        id: currentUser?.id || "u0",
        name: currentUser?.name || "Counselor",
        role: currentUser?.role || "counselor",
      },
    );
    notifyCollectionLogged(c);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Log Collection
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            Record exact amount received from student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

          {(mode === "cheque" || mode === "bank_transfer" || mode === "upi") && (
            <div>
              <Label className="text-xs">
                {mode === "cheque" ? "Cheque Number" : mode === "upi" ? "UPI Reference" : "Bank Reference"}
              </Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Required" />
            </div>
          )}

          <div>
            <Label className="text-xs">Remarks (optional)</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything admin should know" />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={submit}>Log Collection</Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Status will be <Badge variant="outline" className="text-[10px] px-1 py-0">Collected</Badge> · submit to admin from your queue.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
