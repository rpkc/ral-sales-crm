import { useMemo, useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Link2, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  getFinance, subscribeFinance, convertPiToTi, linkExistingTiToPi, piOpenBalance, piConvertedAmount,
} from "@/lib/finance-store";
import type { Invoice, PaymentMode } from "@/lib/finance-types";
import { fmtINR } from "./FinanceKpi";
import { notifyTiGenerated, notifyPiConverted } from "@/lib/pi-ti-notifications";

interface Props { pi: Invoice | null; open: boolean; onClose: () => void }

function useFinance() {
  return useSyncExternalStore(subscribeFinance, getFinance, getFinance);
}

export function PiToTiConvertDialog({ pi, open, onClose }: Props) {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"convert" | "link">("convert");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "none">("none");
  const [pickedTi, setPickedTi] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");

  const open_ = open && !!pi;
  const openBalance = pi ? piOpenBalance(pi.id) : 0;
  const converted = pi ? piConvertedAmount(pi.id) : 0;
  const isOwner = currentUser?.role === "owner" || currentUser?.role === "admin";
  const wouldOverpost = pi ? amount > openBalance + 0.5 : false;

  const standaloneTis = useMemo(
    () => fin.invoices.filter(i =>
      i.invoiceType === "TI"
      && !i.linkedPiId
      && pi && i.customerName.toLowerCase() === pi.customerName.toLowerCase()
    ),
    [fin.invoices, pi],
  );

  const reset = () => {
    setAmount(0); setReason(""); setPaymentMode("none"); setPickedTi(""); setConfirmText(""); setTab("convert");
  };

  const close = () => { reset(); onClose(); };

  const submitConvert = () => {
    if (!pi) return;
    if (amount <= 0) { toast({ title: "Enter an amount > 0", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Conversion reason required", variant: "destructive" }); return; }
    if (wouldOverpost) {
      if (!isOwner) {
        toast({ title: "This action may duplicate revenue. System blocked entry.", variant: "destructive" });
        return;
      }
      if (confirmText.trim().toUpperCase() !== "CONFIRM") {
        toast({ title: "Type CONFIRM to override double-accounting guard", variant: "destructive" });
        return;
      }
    }
    const r = convertPiToTi({
      piId: pi.id, amount, by: currentUser?.id || "u0", byName: currentUser?.name,
      reason, recordPaymentMode: paymentMode === "none" ? undefined : paymentMode,
    });
    if (!r) { toast({ title: "Conversion failed", variant: "destructive" }); return; }
    notifyTiGenerated(r.ti);
    notifyPiConverted(pi, r.ti, amount);
    toast({ title: "PI successfully converted and linked to TI.", description: `${r.ti.invoiceNo} · ${fmtINR(amount)}` });
    close();
  };

  const submitLink = () => {
    if (!pi || !pickedTi) { toast({ title: "Pick a TI to link", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Link reason required", variant: "destructive" }); return; }
    const r = linkExistingTiToPi({
      piId: pi.id, tiId: pickedTi, by: currentUser?.id || "u0", byName: currentUser?.name, reason,
    });
    if (!r) { toast({ title: "Link failed (already linked?)", variant: "destructive" }); return; }
    toast({ title: "Existing TI linked to PI." });
    close();
  };

  if (!pi) return null;

  return (
    <Dialog open={open_} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" /> Convert / Link {pi.invoiceNo}
          </DialogTitle>
          <DialogDescription>
            <span className="text-amber-600 font-medium">{pi.invoiceNo}</span> · {pi.customerName} · Open balance <b>{fmtINR(openBalance)}</b>
            {converted > 0 && <span className="ml-1 text-muted-foreground">(₹{converted.toLocaleString("en-IN")} already converted)</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "convert" | "link")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="convert"><ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert to new TI</TabsTrigger>
            <TabsTrigger value="link"><Link2 className="h-3.5 w-3.5 mr-1" /> Link existing TI</TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount (₹)</Label>
                <Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(+e.target.value)} placeholder={String(openBalance)} />
              </div>
              <div>
                <Label>Record payment?</Label>
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode | "none")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No (TI as Sent)</SelectItem>
                    {["Cash", "Bank", "UPI", "Card", "Cheque", "Online"].map(m =>
                      <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason for conversion <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment received via UPI / Cash counter / etc." />
            </div>

            <Card className="p-3 bg-muted/40 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">PI total</span><span className="tabular-nums">{fmtINR(pi.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Already converted</span><span className="tabular-nums">{fmtINR(converted)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Will be converted now</span><span className="tabular-nums font-semibold">{fmtINR(amount)}</span></div>
              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Remaining PI balance after</span><span className="tabular-nums font-semibold">{fmtINR(Math.max(0, openBalance - amount))}</span></div>
            </Card>

            {wouldOverpost && (
              <Card className="p-3 border-l-4 border-l-destructive bg-destructive/5 text-xs space-y-2">
                <div className="flex items-start gap-2 text-destructive font-medium">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>This action may duplicate revenue. System blocked entry.</span>
                </div>
                {isOwner && (
                  <div>
                    <Label className="text-[11px]">Type <b>CONFIRM</b> to override (Owner only)</Label>
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CONFIRM" />
                  </div>
                )}
              </Card>
            )}

            <Button className="w-full" onClick={submitConvert}>
              <ArrowRight className="h-4 w-4 mr-1" /> Convert & Generate TI
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> TI tracks money received. PI receivable will reduce automatically.
            </p>
          </TabsContent>

          <TabsContent value="link" className="space-y-3 pt-3">
            <Label>Pick existing TI for {pi.customerName}</Label>
            {standaloneTis.length === 0 ? (
              <p className="text-xs text-muted-foreground">No unlinked Tax Invoices found for this recipient.</p>
            ) : (
              <Select value={pickedTi} onValueChange={setPickedTi}>
                <SelectTrigger><SelectValue placeholder="Select TI" /></SelectTrigger>
                <SelectContent>
                  {standaloneTis.map(ti => (
                    <SelectItem key={ti.id} value={ti.id}>
                      {ti.invoiceNo} · {fmtINR(ti.total)} · {ti.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div>
              <Label>Reason</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Walk-in cash receipt earlier raised standalone." />
            </div>
            <Button className="w-full" disabled={!pickedTi} onClick={submitLink}>
              <Link2 className="h-4 w-4 mr-1" /> Link to PI
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
