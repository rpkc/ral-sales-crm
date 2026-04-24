import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { createInvoice } from "@/lib/finance-store";
import { computeBreakup, detectIntraState, validateGstInput, type GstInputMode } from "@/lib/gst-calc";
import { GstAmountInput } from "./GstAmountInput";
import { fmtINR } from "./FinanceKpi";
import { FileCheck2 } from "lucide-react";

interface Props { open: boolean; onClose: () => void }

export function QuickInvoiceDialog({ open, onClose }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [program, setProgram] = useState("");
  const [gstin, setGstin] = useState("");
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<GstInputMode>("gross_inclusive");
  const [intra, setIntra] = useState(true);
  const [intraOverridden, setIntraOverridden] = useState(false);

  useEffect(() => {
    if (!open) {
      setRecipient(""); setProgram(""); setGstin(""); setAmount(0); setRate(18);
      setMode("gross_inclusive"); setIntra(true); setIntraOverridden(false);
    }
  }, [open]);

  // Auto-detect intra/inter from GSTIN unless user manually overrode
  useEffect(() => {
    if (!intraOverridden) setIntra(detectIntraState(gstin));
  }, [gstin, intraOverridden]);

  const submit = () => {
    if (!recipient.trim()) { toast({ title: "Recipient name required.", variant: "destructive" }); return; }
    const v = validateGstInput(amount, rate);
    if (!v.ok) { toast({ title: v.error || "Invalid amount", variant: "destructive" }); return; }
    const b = computeBreakup(amount, rate, mode, intra);
    const inv = createInvoice({
      invoiceType: "TI",
      customerId: "c_" + Math.random().toString(36).slice(2, 6),
      customerName: recipient.trim(), customerType: "Student",
      revenueStream: "Student Admissions",
      programName: program || "Tax Invoice",
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      subtotal: b.taxable, discount: 0,
      gstType: rate === 0 ? "Exempt" : "Taxable", gstRate: rate,
      gstin, notes: `Tax Invoice (TI) — ${mode === "gross_inclusive" ? "Gross" : "Net"} mode`,
    } as any, currentUser?.id || "u0");
    inv.cgst = b.cgst; inv.sgst = b.sgst; inv.igst = b.igst;
    toast({ title: `${inv.invoiceNo} issued (Tax Invoice)`, description: `${fmtINR(inv.total)} • Taxable ${fmtINR(b.taxable)} + GST ${fmtINR(b.gstAmount)}` });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
            Create Tax Invoice (TI)
            <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">TI</span>
          </DialogTitle>
          <DialogDescription>Use TI only after payment is received. Counts in collected revenue and creates GST liability.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Recipient</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Student / Institution" /></div>
            <div><Label>Program (optional)</Label><Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. UI/UX" /></div>
          </div>
          <div><Label>GSTIN (optional)</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="27AABCS1234F1Z9" /></div>
          <GstAmountInput
            amount={amount} rate={rate} mode={mode}
            intraState={intra} intraOverridden={intraOverridden} gstin={gstin}
            onAmountChange={setAmount} onRateChange={setRate} onModeChange={setMode}
            onIntraStateChange={(v, manual) => { setIntra(v); if (manual) setIntraOverridden(true); }}
          />
          <Button className="w-full" onClick={submit}>Generate Tax Invoice</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
