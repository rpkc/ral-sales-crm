import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { createInvoice } from "@/lib/finance-store";
import { computeBreakup, validateGstInput, GST_SLABS, type GstInputMode } from "@/lib/gst-calc";
import { fmtINR } from "./FinanceKpi";
import { Layers, Plus, Trash2 } from "lucide-react";

interface Row { id: string; recipient: string; program: string; amount: number }

interface Props { open: boolean; onClose: () => void }

const newRow = (): Row => ({ id: Math.random().toString(36).slice(2, 8), recipient: "", program: "", amount: 0 });

export function BulkInvoiceDialog({ open, onClose }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<GstInputMode>("gross_inclusive");
  const [intra, setIntra] = useState(true);

  useEffect(() => {
    if (!open) { setRows([newRow(), newRow(), newRow()]); setRate(18); setMode("gross_inclusive"); setIntra(true); }
  }, [open]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) => setRows(rs => rs.filter(r => r.id !== id));
  const addRow = () => setRows(rs => [...rs, newRow()]);

  const valid = rows.filter(r => r.recipient.trim() && r.amount > 0);
  const totals = valid.reduce(
    (acc, r) => {
      const b = computeBreakup(r.amount, rate, mode, intra);
      acc.taxable += b.taxable; acc.gst += b.gstAmount; acc.gross += b.gross;
      return acc;
    },
    { taxable: 0, gst: 0, gross: 0 },
  );

  const submit = () => {
    const v = validateGstInput(valid[0]?.amount || 0, rate);
    if (!valid.length) { toast({ title: "Add at least one valid row.", variant: "destructive" }); return; }
    if (!v.ok) { toast({ title: v.error || "Invalid GST configuration.", variant: "destructive" }); return; }
    valid.forEach(r => {
      const b = computeBreakup(r.amount, rate, mode, intra);
      const inv = createInvoice({
        customerId: "c_" + Math.random().toString(36).slice(2, 6),
        customerName: r.recipient.trim(), customerType: "Student",
        revenueStream: "Student Admissions",
        programName: r.program || "Bulk Invoice",
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        subtotal: b.taxable, discount: 0,
        gstType: rate === 0 ? "Exempt" : "Taxable", gstRate: rate,
        notes: "Generated via Bulk Invoice Generator",
      } as any, currentUser?.id || "u0");
      inv.cgst = b.cgst; inv.sgst = b.sgst; inv.igst = b.igst;
    });
    toast({ title: `${valid.length} invoices generated`, description: `Total ${fmtINR(totals.gross)} (GST ${fmtINR(totals.gst)})` });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Bulk Invoice Generator</DialogTitle>
          <DialogDescription>Generate multiple invoices in one go with a shared GST slab.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as GstInputMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gross_inclusive">Gross (GST included)</SelectItem>
                  <SelectItem value="net_exclusive">Net (Add GST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GST %</Label>
              <Select value={String(rate)} onValueChange={(v) => setRate(+v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GST_SLABS.map(s => <SelectItem key={s} value={String(s)}>{s}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Place of Supply</Label>
              <Select value={intra ? "intra" : "inter"} onValueChange={(v) => setIntra(v === "intra")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intra">Intra-state (CGST+SGST)</SelectItem>
                  <SelectItem value="inter">Inter-state (IGST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_140px_140px_140px_32px] gap-2 text-[11px] font-medium text-muted-foreground px-1">
              <span>Recipient</span><span>Program</span>
              <span className="text-right">{mode === "gross_inclusive" ? "Gross (₹)" : "Net (₹)"}</span>
              <span className="text-right">Taxable</span>
              <span className="text-right">GST</span>
              <span></span>
            </div>
            {rows.map(r => {
              const b = r.amount > 0 ? computeBreakup(r.amount, rate, mode, intra) : null;
              return (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_140px_140px_140px_32px] gap-2 items-center">
                  <Input value={r.recipient} onChange={e => update(r.id, { recipient: e.target.value })} placeholder="Name" className="h-9" />
                  <Input value={r.program} onChange={e => update(r.id, { program: e.target.value })} placeholder="Program" className="h-9" />
                  <Input type="number" min={0} value={r.amount || ""} onChange={e => update(r.id, { amount: +e.target.value })} className="h-9 text-right" />
                  <span className="text-xs text-right tabular-nums text-muted-foreground">{b ? fmtINR(b.taxable) : "—"}</span>
                  <span className="text-xs text-right tabular-nums text-muted-foreground">{b ? fmtINR(b.gstAmount) : "—"}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)} disabled={rows.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Row</Button>
          </div>

          <Card className="p-3 bg-muted/30 text-xs grid grid-cols-4 gap-3">
            <div><div className="text-muted-foreground">Rows ready</div><div className="font-semibold text-sm">{valid.length}</div></div>
            <div><div className="text-muted-foreground">Total Taxable</div><div className="font-semibold text-sm tabular-nums">{fmtINR(totals.taxable)}</div></div>
            <div><div className="text-muted-foreground">Total GST</div><div className="font-semibold text-sm tabular-nums">{fmtINR(totals.gst)}</div></div>
            <div><div className="text-muted-foreground">Grand Total</div><div className="font-semibold text-sm tabular-nums text-primary">{fmtINR(totals.gross)}</div></div>
          </Card>

          <Button className="w-full" onClick={submit} disabled={!valid.length}>Generate {valid.length || ""} Invoice{valid.length === 1 ? "" : "s"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
