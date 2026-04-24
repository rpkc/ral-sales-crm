/**
 * Collection Control System — three tabs surfaced inside AccountsModule:
 *   • VerificationsTab (Admin/Owner): approve/reject/mismatch on collected entries.
 *   • VerifiedPaymentsTab (Accounts/Owner): generate TI from verified collections; hard block on unverified.
 *   • CollectionReportsTab (Owner/Manager): 7 reports + CSV/Excel + audit log viewer.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShieldCheck, AlertTriangle, FileDown, Receipt, IndianRupee, History,
  CheckCircle2, X, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCollections, subscribeCollections,
  verifyCollection, rejectCollection, markReadyForInvoice, linkTiToCollection,
  getAllAuditEntries, type Collection,
} from "@/lib/collection-store";
import {
  notifyVerified, notifyMismatch, notifyTiGeneratedFromCollection,
  scanStalePendingVerifications,
} from "@/lib/collection-notifications";
import { createInvoice, getFinance } from "@/lib/finance-store";
import { computeBreakup } from "@/lib/gst-calc";
import { FinanceKpi, fmtINR } from "./FinanceKpi";

function useCol() {
  return useSyncExternalStore(subscribeCollections, getCollections, getCollections);
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusToneClass(status: Collection["status"]) {
  switch (status) {
    case "Collected": return "bg-warning/10 text-warning border-warning/30";
    case "Awaiting Verification": return "bg-primary/10 text-primary border-primary/30";
    case "Verified":
    case "Ready For Invoice":
    case "Invoice Generated": return "bg-success/10 text-success border-success/30";
    case "Mismatch":
    case "Rejected": return "bg-destructive/10 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

/* ═══════════════ Verifications (Admin) ═══════════════ */

export function VerificationsTab({ canVerify }: { canVerify: boolean }) {
  const items = useCol();
  const { currentUser } = useAuth();
  const [verifyTarget, setVerifyTarget] = useState<Collection | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Collection | null>(null);

  // Surface stale 24h alerts once on mount
  useMemo(() => scanStalePendingVerifications(items), [items.length]);

  const awaiting = items.filter(c => c.status === "Awaiting Verification");
  const mismatch = items.filter(c => c.status === "Mismatch");
  const todayKey = new Date().toDateString();
  const cashToday = items
    .filter(c => c.mode === "cash" && c.verifiedAt && new Date(c.verifiedAt).toDateString() === todayKey)
    .reduce((s, c) => s + (c.verifiedAmount ?? c.amount), 0);
  const bankToday = items
    .filter(c => (c.mode === "bank_transfer" || c.mode === "upi") && c.verifiedAt && new Date(c.verifiedAt).toDateString() === todayKey)
    .reduce((s, c) => s + (c.verifiedAmount ?? c.amount), 0);
  const readyForAccounts = items.filter(c => c.status === "Verified" || c.status === "Ready For Invoice").length;

  if (!canVerify) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Only Admin / Owner can verify collections.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <FinanceKpi label="Awaiting Verification" value={awaiting.length} hint={fmtINR(awaiting.reduce((s, c) => s + c.amount, 0))} tone="warning" icon={<ShieldCheck className="h-4 w-4" />} />
        <FinanceKpi label="Cash Verified Today" value={fmtINR(cashToday)} tone="success" icon={<IndianRupee className="h-4 w-4" />} />
        <FinanceKpi label="Bank Verified Today" value={fmtINR(bankToday)} tone="primary" icon={<Receipt className="h-4 w-4" />} />
        <FinanceKpi label="Mismatch Alerts" value={mismatch.length} tone={mismatch.length > 0 ? "destructive" : "default"} icon={<AlertTriangle className="h-4 w-4" />} />
        <FinanceKpi label="Ready for Accounts" value={readyForAccounts} hint="Verified / pending invoice" tone="primary" icon={<FileText className="h-4 w-4" />} />
      </div>

      <Card className="p-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Awaiting Verification ({awaiting.length})</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Verify against bank/cash before approval.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
              <TableHead>Reason</TableHead><TableHead>Mode</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Collected</TableHead><TableHead>Counselor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {awaiting.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-xs">No collections waiting on you.</TableCell></TableRow>
            ) : awaiting.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.courseName}</div></TableCell>
                <TableCell className="text-xs">{c.reason.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs uppercase">{c.mode}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.amount)}</TableCell>
                <TableCell className="text-xs">{fmtDateTime(c.collectedAt)}</TableCell>
                <TableCell className="text-xs">{c.collectedByName}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => setVerifyTarget(c)}>Verify</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRejectTarget(c)}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {mismatch.length > 0 && (
        <Card className="p-0">
          <div className="p-4 border-b border-destructive/30 bg-destructive/5">
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Mismatch Cases ({mismatch.length})
            </h3>
            <p className="text-[11px] text-destructive/80 mt-0.5">Collected amount does not match received funds.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Verified</TableHead>
                <TableHead className="text-right">Diff</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatch.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                  <TableCell className="text-xs">{c.studentName}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.amount)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.verifiedAmount ?? 0)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-destructive">{fmtINR(c.mismatchAmount ?? 0)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.verificationRemarks || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVerifyTarget(c)}>Re-verify</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <VerifyDialog
        target={verifyTarget}
        onClose={() => setVerifyTarget(null)}
        actor={currentUser}
      />
      <RejectDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        actor={currentUser}
      />
    </div>
  );
}

function VerifyDialog({ target, onClose, actor }: { target: Collection | null; onClose: () => void; actor: ReturnType<typeof useAuth>["currentUser"] }) {
  const [verifiedAmount, setVerifiedAmount] = useState("");
  const [mode, setMode] = useState<NonNullable<Collection["verificationMode"]>>("cash_in_hand");
  const [remarks, setRemarks] = useState("");

  useMemo(() => {
    if (target) {
      setVerifiedAmount(String(target.amount));
      setMode(target.mode === "cash" ? "cash_in_hand" : target.mode === "upi" ? "upi_confirmation" : target.mode === "cheque" ? "cheque_status" : "bank_statement");
      setRemarks("");
    }
  }, [target]);

  if (!target) return null;

  const submit = () => {
    const amt = parseFloat(verifiedAmount);
    if (!amt || amt < 0) { toast.error("Enter a valid verified amount."); return; }
    const updated = verifyCollection(target.id, {
      verifiedAmount: amt, verificationMode: mode, remarks,
    }, { id: actor?.id || "u0", name: actor?.name || "Admin", role: actor?.role || "admin" });
    if (updated) {
      if (updated.status === "Mismatch") notifyMismatch(updated);
      else notifyVerified(updated);
    }
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verify Collection
          </DialogTitle>
          <DialogDescription>
            {target.receiptRef} · {target.studentName} · Counselor said {fmtINR(target.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Verified Amount (₹)</Label>
            <Input type="number" value={verifiedAmount} onChange={(e) => setVerifiedAmount(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">If this differs from the collected amount, the entry is flagged as a mismatch.</p>
          </div>
          <div>
            <Label className="text-xs">Verification Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_in_hand">Cash in hand</SelectItem>
                <SelectItem value="bank_statement">Bank statement</SelectItem>
                <SelectItem value="upi_confirmation">UPI confirmation</SelectItem>
                <SelectItem value="cheque_status">Cheque status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Verification notes (required for mismatch)" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save Verification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ target, onClose, actor }: { target: Collection | null; onClose: () => void; actor: ReturnType<typeof useAuth>["currentUser"] }) {
  const [remarks, setRemarks] = useState("");
  useMemo(() => { if (target) setRemarks(""); }, [target]);
  if (!target) return null;
  const submit = () => {
    if (!remarks.trim()) { toast.error("Reason required to reject."); return; }
    rejectCollection(target.id, remarks, { id: actor?.id || "u0", name: actor?.name || "Admin", role: actor?.role || "admin" });
    toast.success(`${target.receiptRef} rejected`);
    onClose();
  };
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Collection — {target.receiptRef}</DialogTitle>
          <DialogDescription>Provide a reason for the counselor.</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason (required)" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={submit}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════ Verified Payments → Generate TI (Accounts) ═══════════════ */

export function VerifiedPaymentsTab({ role }: { role: "owner" | "manager" | "executive" }) {
  const items = useCol();
  const { currentUser } = useAuth();
  const [overrideTarget, setOverrideTarget] = useState<Collection | null>(null);
  const [overrideText, setOverrideText] = useState("");

  const verified = items.filter(c => c.status === "Verified" || c.status === "Ready For Invoice");
  const generated = items.filter(c => c.status === "Invoice Generated");
  const blocked = items.filter(c => c.status === "Awaiting Verification" || c.status === "Mismatch");

  const generate = (c: Collection) => {
    if (c.status !== "Verified" && c.status !== "Ready For Invoice") {
      toast.error("Tax Invoice can only be created after admin verification.");
      return;
    }
    const amount = c.verifiedAmount ?? c.amount;
    const breakup = computeBreakup(amount, 18, "gross_inclusive", true);
    const inv = createInvoice({
      invoiceType: "TI",
      customerId: c.studentId,
      customerName: c.studentName,
      customerType: "Student",
      revenueStream: "Student Admissions",
      programName: c.courseName,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      subtotal: breakup.taxable,
      discount: 0,
      gstType: "Taxable",
      gstRate: 18,
      notes: `From verified collection ${c.receiptRef}`,
    } as Parameters<typeof createInvoice>[0], currentUser?.id || "u0");
    inv.cgst = breakup.cgst; inv.sgst = breakup.sgst; inv.igst = breakup.igst;

    const updated = linkTiToCollection(c.id, inv.id, inv.invoiceNo, {
      id: currentUser?.id || "u0", name: currentUser?.name || "Accounts", role: currentUser?.role || "accounts_manager",
    });
    if (updated) notifyTiGeneratedFromCollection(updated);
  };

  const handleOverride = () => {
    if (overrideText.trim().toUpperCase() !== "CONFIRM") {
      toast.error("Type CONFIRM to override the verification gate.");
      return;
    }
    if (overrideTarget) generate(overrideTarget);
    setOverrideTarget(null);
    setOverrideText("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FinanceKpi label="Verified · Pending TI" value={verified.length} hint={fmtINR(verified.reduce((s, c) => s + (c.verifiedAmount ?? c.amount), 0))} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <FinanceKpi label="TI Generated Today" value={generated.filter(c => c.invoicedAt && new Date(c.invoicedAt).toDateString() === new Date().toDateString()).length} tone="primary" icon={<Receipt className="h-4 w-4" />} />
        <FinanceKpi label="Blocked (Unverified)" value={blocked.length} hint={fmtINR(blocked.reduce((s, c) => s + c.amount, 0))} tone={blocked.length > 0 ? "warning" : "default"} icon={<AlertTriangle className="h-4 w-4" />} />
        <FinanceKpi label="Total Generated" value={generated.length} tone="success" icon={<FileText className="h-4 w-4" />} />
      </div>

      <Card className="p-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Verified Payments — Ready for TI ({verified.length})</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">One click generates a Tax Invoice and links it to the collection record.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Verified Amount</TableHead>
              <TableHead>Verified By</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verified.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-xs">No verified payments waiting for TI.</TableCell></TableRow>
            ) : verified.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.courseName}</div></TableCell>
                <TableCell className="text-xs">{c.reason.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.verifiedAmount ?? c.amount)}</TableCell>
                <TableCell className="text-xs">{c.verifiedByName || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" className="h-7 text-xs" onClick={() => generate(c)}>
                    <Receipt className="h-3 w-3 mr-1" /> Generate TI
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {blocked.length > 0 && (
        <Card className="p-0 border-warning/30">
          <div className="p-4 border-b bg-warning/5">
            <h3 className="text-sm font-semibold text-warning flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Blocked — Awaiting Verification ({blocked.length})
            </h3>
            <p className="text-[11px] text-warning/80 mt-0.5">
              Tax Invoice can only be created after admin verification.
              {role === "owner" ? " As Owner, you may override per case." : ""}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocked.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                  <TableCell className="text-xs">{c.studentName}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${statusToneClass(c.status)}`}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.amount)}</TableCell>
                  <TableCell className="text-right">
                    {role === "owner" ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-warning/40 text-warning" onClick={() => setOverrideTarget(c)}>
                        Owner override
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">Blocked</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!overrideTarget} onOpenChange={(o) => { if (!o) { setOverrideTarget(null); setOverrideText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-warning">Override Verification Gate</DialogTitle>
            <DialogDescription>
              You are bypassing admin verification for {overrideTarget?.receiptRef}. This action is logged.
              Type <strong>CONFIRM</strong> to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input value={overrideText} onChange={(e) => setOverrideText(e.target.value)} placeholder="CONFIRM" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOverrideTarget(null); setOverrideText(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleOverride}>Generate TI anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════ Reports + Audit Log ═══════════════ */

const REPORT_KEYS = [
  "daily_register",
  "by_counselor",
  "verification_pending",
  "mismatch",
  "fine_collection",
  "pi_vs_ti",
  "cash_to_bank",
  "audit",
] as const;
type CollectionReportKey = typeof REPORT_KEYS[number];

const REPORT_LABELS: Record<CollectionReportKey, string> = {
  daily_register: "Daily Collection Register",
  by_counselor: "Counselor Collection Report",
  verification_pending: "Verification Pending Report",
  mismatch: "Mismatch Report",
  fine_collection: "Fine Collection Report",
  pi_vs_ti: "PI vs TI Report",
  cash_to_bank: "Cash-to-Bank Reconciliation",
  audit: "Audit Log",
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadExcel(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export function CollectionReportsTab() {
  const items = useCol();
  const fin = getFinance();
  const [active, setActive] = useState<CollectionReportKey>("daily_register");

  const todayKey = new Date().toDateString();
  const dailyItems = items.filter(c => new Date(c.collectedAt).toDateString() === todayKey);

  const byCounselor = useMemo(() => {
    const m = new Map<string, { name: string; count: number; collected: number; verified: number; mismatch: number }>();
    items.forEach(c => {
      const k = c.collectedById;
      const prev = m.get(k) || { name: c.collectedByName, count: 0, collected: 0, verified: 0, mismatch: 0 };
      prev.count += 1;
      prev.collected += c.amount;
      if (c.status === "Verified" || c.status === "Ready For Invoice" || c.status === "Invoice Generated") prev.verified += c.verifiedAmount ?? c.amount;
      if (c.status === "Mismatch") prev.mismatch += 1;
      m.set(k, prev);
    });
    return Array.from(m.values());
  }, [items]);

  const fineItems = items.filter(c => c.reason === "emi_late_fine" || (c.lateFeeAmount && c.lateFeeAmount > 0));
  const piTotal = fin.invoices.filter(i => i.invoiceType === "PI").reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const tiTotal = fin.invoices.filter(i => i.invoiceType === "TI").reduce((s, i) => s + i.amountPaid, 0);

  const cashToBank = useMemo(() => {
    const cash = items.filter(c => c.mode === "cash" && c.status !== "Rejected").reduce((s, c) => s + (c.verifiedAmount ?? c.amount), 0);
    const bank = items.filter(c => (c.mode === "bank_transfer" || c.mode === "upi" || c.mode === "card") && c.status !== "Rejected").reduce((s, c) => s + (c.verifiedAmount ?? c.amount), 0);
    return { cash, bank, ratio: bank > 0 ? cash / bank : 0 };
  }, [items]);

  const audit = useMemo(() => getAllAuditEntries(), [items]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [];
    if (active === "daily_register") {
      rows.push(["Receipt", "Student", "Course", "Amount", "Mode", "Reason", "Status", "Counselor", "Time"]);
      dailyItems.forEach(c => rows.push([c.receiptRef, c.studentName, c.courseName, c.amount, c.mode, c.reason, c.status, c.collectedByName, fmtDateTime(c.collectedAt)]));
    } else if (active === "by_counselor") {
      rows.push(["Counselor", "Collections", "Total Collected", "Verified Amount", "Mismatch Count"]);
      byCounselor.forEach(r => rows.push([r.name, r.count, r.collected, r.verified, r.mismatch]));
    } else if (active === "verification_pending") {
      rows.push(["Receipt", "Student", "Amount", "Mode", "Collected At", "Counselor", "Status"]);
      items.filter(c => c.status === "Awaiting Verification" || c.status === "Mismatch").forEach(c => rows.push([c.receiptRef, c.studentName, c.amount, c.mode, fmtDateTime(c.collectedAt), c.collectedByName, c.status]));
    } else if (active === "mismatch") {
      rows.push(["Receipt", "Student", "Collected", "Verified", "Diff", "Verified By", "Remarks"]);
      items.filter(c => c.status === "Mismatch").forEach(c => rows.push([c.receiptRef, c.studentName, c.amount, c.verifiedAmount ?? 0, c.mismatchAmount ?? 0, c.verifiedByName || "", c.verificationRemarks || ""]));
    } else if (active === "fine_collection") {
      rows.push(["Receipt", "Student", "Late Fee Component", "Total Amount", "Status"]);
      fineItems.forEach(c => rows.push([c.receiptRef, c.studentName, c.lateFeeAmount ?? c.amount, c.amount, c.status]));
    } else if (active === "pi_vs_ti") {
      rows.push(["Metric", "Value"]);
      rows.push(["Open PI Receivables", piTotal]);
      rows.push(["Realized TI Revenue", tiTotal]);
    } else if (active === "cash_to_bank") {
      rows.push(["Channel", "Amount"]);
      rows.push(["Cash", cashToBank.cash]);
      rows.push(["Bank/UPI/Card", cashToBank.bank]);
    } else if (active === "audit") {
      rows.push(["When", "Actor", "Role", "Action", "Receipt", "Student", "From", "To", "Remarks"]);
      audit.forEach(a => rows.push([fmtDateTime(a.at), a.byName, a.byRole, a.action, a.receiptRef, a.studentName, a.fromStatus || "", a.toStatus || "", a.remarks || ""]));
    }
    downloadCsv(`${active}.csv`, rows);
    toast.success("CSV downloaded");
  };

  const exportExcel = async () => {
    const sheets: { name: string; rows: Record<string, unknown>[] }[] = [
      { name: "Daily Register", rows: dailyItems.map(c => ({ Receipt: c.receiptRef, Student: c.studentName, Course: c.courseName, Amount: c.amount, Mode: c.mode, Reason: c.reason, Status: c.status, Counselor: c.collectedByName, Time: fmtDateTime(c.collectedAt) })) },
      { name: "By Counselor", rows: byCounselor.map(r => ({ Counselor: r.name, Collections: r.count, Collected: r.collected, Verified: r.verified, Mismatch: r.mismatch })) },
      { name: "Verification Pending", rows: items.filter(c => c.status === "Awaiting Verification").map(c => ({ Receipt: c.receiptRef, Student: c.studentName, Amount: c.amount, Mode: c.mode, Counselor: c.collectedByName })) },
      { name: "Mismatch", rows: items.filter(c => c.status === "Mismatch").map(c => ({ Receipt: c.receiptRef, Student: c.studentName, Collected: c.amount, Verified: c.verifiedAmount ?? 0, Diff: c.mismatchAmount ?? 0, Remarks: c.verificationRemarks || "" })) },
      { name: "Fine Collection", rows: fineItems.map(c => ({ Receipt: c.receiptRef, Student: c.studentName, LateFee: c.lateFeeAmount ?? c.amount, Total: c.amount, Status: c.status })) },
      { name: "PI vs TI", rows: [{ Metric: "Open PI Receivables", Value: piTotal }, { Metric: "Realized TI Revenue", Value: tiTotal }] },
      { name: "Cash to Bank", rows: [{ Channel: "Cash", Amount: cashToBank.cash }, { Channel: "Bank/UPI/Card", Amount: cashToBank.bank }] },
      { name: "Audit", rows: audit.map(a => ({ When: fmtDateTime(a.at), Actor: a.byName, Role: a.byRole, Action: a.action, Receipt: a.receiptRef, Student: a.studentName, From: a.fromStatus || "", To: a.toStatus || "", Remarks: a.remarks || "" })) },
    ];
    await downloadExcel(`collection-control-reports.xlsx`, sheets);
    toast.success("Excel downloaded");
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Collection Control Reports</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}><FileDown className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          <Button size="sm" onClick={exportExcel}><FileDown className="h-3.5 w-3.5 mr-1" /> Excel (all sheets)</Button>
        </div>
      </Card>

      <Tabs value={active} onValueChange={(v) => setActive(v as CollectionReportKey)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {REPORT_KEYS.map(k => (
            <TabsTrigger key={k} value={k} className="text-xs">{REPORT_LABELS[k]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="daily_register" className="mt-3">
          <SimpleTable
            cols={["Receipt", "Student", "Reason", "Amount", "Mode", "Status", "Counselor", "Time"]}
            rows={dailyItems.map(c => [c.receiptRef, c.studentName, c.reason.replace(/_/g, " "), fmtINR(c.amount), c.mode.toUpperCase(), c.status, c.collectedByName, fmtDateTime(c.collectedAt)])}
            empty="No collections today."
          />
        </TabsContent>
        <TabsContent value="by_counselor" className="mt-3">
          <SimpleTable
            cols={["Counselor", "Collections", "Total Collected", "Verified", "Mismatch"]}
            rows={byCounselor.map(r => [r.name, r.count, fmtINR(r.collected), fmtINR(r.verified), r.mismatch])}
            empty="No counselor activity."
          />
        </TabsContent>
        <TabsContent value="verification_pending" className="mt-3">
          <SimpleTable
            cols={["Receipt", "Student", "Amount", "Mode", "Collected At", "Counselor", "Status"]}
            rows={items.filter(c => c.status === "Awaiting Verification" || c.status === "Mismatch").map(c => [c.receiptRef, c.studentName, fmtINR(c.amount), c.mode.toUpperCase(), fmtDateTime(c.collectedAt), c.collectedByName, c.status])}
            empty="Nothing pending."
          />
        </TabsContent>
        <TabsContent value="mismatch" className="mt-3">
          <SimpleTable
            cols={["Receipt", "Student", "Collected", "Verified", "Diff", "Verified By", "Remarks"]}
            rows={items.filter(c => c.status === "Mismatch").map(c => [c.receiptRef, c.studentName, fmtINR(c.amount), fmtINR(c.verifiedAmount ?? 0), fmtINR(c.mismatchAmount ?? 0), c.verifiedByName || "—", c.verificationRemarks || "—"])}
            empty="No mismatches."
          />
        </TabsContent>
        <TabsContent value="fine_collection" className="mt-3">
          <SimpleTable
            cols={["Receipt", "Student", "Late Fee", "Total", "Status"]}
            rows={fineItems.map(c => [c.receiptRef, c.studentName, fmtINR(c.lateFeeAmount ?? c.amount), fmtINR(c.amount), c.status])}
            empty="No late-fee collections recorded."
          />
        </TabsContent>
        <TabsContent value="pi_vs_ti" className="mt-3">
          <div className="grid grid-cols-2 gap-3">
            <FinanceKpi label="Open PI Receivables" value={fmtINR(piTotal)} tone="warning" />
            <FinanceKpi label="Realized TI Revenue" value={fmtINR(tiTotal)} tone="success" />
          </div>
        </TabsContent>
        <TabsContent value="cash_to_bank" className="mt-3">
          <div className="grid grid-cols-3 gap-3">
            <FinanceKpi label="Cash" value={fmtINR(cashToBank.cash)} tone="warning" />
            <FinanceKpi label="Bank / UPI / Card" value={fmtINR(cashToBank.bank)} tone="primary" />
            <FinanceKpi label="Cash : Bank" value={cashToBank.bank > 0 ? `${cashToBank.ratio.toFixed(2)} : 1` : "—"} tone="default" />
          </div>
        </TabsContent>
        <TabsContent value="audit" className="mt-3">
          <SimpleTable
            cols={["When", "Actor", "Role", "Action", "Receipt", "Student", "From → To", "Remarks"]}
            rows={audit.map(a => [fmtDateTime(a.at), a.byName, a.byRole, a.action, a.receiptRef, a.studentName, [a.fromStatus, a.toStatus].filter(Boolean).join(" → ") || "—", a.remarks || "—"])}
            empty="No audit entries yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SimpleTable({ cols, rows, empty }: { cols: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <Card className="p-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{cols.map(c => <TableHead key={c} className="text-xs">{c}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={cols.length} className="text-center text-muted-foreground py-6 text-xs">{empty}</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => <TableCell key={j} className="text-xs">{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
