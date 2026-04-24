/**
 * Admissions auto-PI prompt
 * Triggered after a confirmed admission is created — opens a prefilled dialog so
 * the counselor / accounts user can formalize dues by generating a Proforma Invoice.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Admission } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { createInvoice } from "@/lib/finance-store";
import { computeBreakup } from "@/lib/gst-calc";
import { findOpenPiForStudent } from "@/lib/pi-helpers";
import { notifyHighValuePi } from "@/lib/pi-ti-notifications";
import { fmtINR } from "@/components/finance/FinanceKpi";

interface Props {
  admission: Admission | null;
  open: boolean;
  onClose: () => void;
}

export function AutoPiPromptDialog({ admission, open, onClose }: Props) {
  const { currentUser } = useAuth();
  const [feeStr, setFeeStr] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (admission && open) {
      setFeeStr(String(admission.totalFee || 0));
      // Default due date: +14 days from today
      const d = new Date(Date.now() + 14 * 86400000);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [admission, open]);

  const fee = parseFloat(feeStr) || 0;
  const breakup = useMemo(() => fee > 0 ? computeBreakup(fee, 18, "gross_inclusive", true) : null, [fee]);
  const duplicate = useMemo(() => admission ? findOpenPiForStudent(admission.studentName) : null, [admission, open]);

  if (!admission) return null;

  const submit = () => {
    if (fee <= 0) { toast.error("Enter a valid fee amount."); return; }
    if (!breakup) return;
    const inv = createInvoice({
      invoiceType: "PI",
      customerId: admission.id,
      customerName: admission.studentName,
      customerType: "Student",
      revenueStream: "Student Admissions",
      programName: admission.courseSelected,
      issueDate: new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      subtotal: breakup.taxable,
      discount: 0,
      gstType: "Taxable",
      gstRate: 18,
      notes: `Auto-generated on admission confirmation · Batch: ${admission.batch}`,
    } as Parameters<typeof createInvoice>[0], currentUser?.id || "u0");

    inv.cgst = breakup.cgst;
    inv.sgst = breakup.sgst;
    inv.igst = breakup.igst;

    toast.success(`Proforma Invoice ${inv.invoiceNo} generated`, {
      description: `${fmtINR(inv.total)} · Due ${new Date(inv.dueDate).toLocaleDateString("en-IN")}`,
    });
    notifyHighValuePi(inv, "created");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-warning" />
            Generate Proforma Invoice
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">PI</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            Student confirmed. Generate PI to formalize dues.
          </DialogDescription>
        </DialogHeader>

        {duplicate && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>An open PI <strong>{duplicate.invoiceNo}</strong> already exists for this student. Creating another will not duplicate revenue but may need accounts review.</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{admission.studentName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Course</span><span>{admission.courseSelected}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Batch</span><span>{admission.batch || "—"}</span></div>
            {admission.parentPhone && <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{admission.parentPhone}</span></div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Gross Fee (₹)</Label>
              <Input type="number" value={feeStr} onChange={(e) => setFeeStr(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {breakup && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="tabular-nums">{fmtINR(breakup.taxable)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span className="tabular-nums">{fmtINR(breakup.gstAmount)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total</span><span className="tabular-nums">{fmtINR(breakup.gross)}</span></div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Skip for now</Button>
            <Button className="flex-1" onClick={submit} disabled={fee <= 0}>Generate PI</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
