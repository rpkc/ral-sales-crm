/**
 * Admin Billing Tab — Verification Control Center
 *
 * The single, corrected surface for Admin inside /accounts.
 * Replaces the previously duplicated "Billing Chart" + scattered finance tabs.
 *
 * Admin scope (operational verifier only):
 *   • Verify counselor-created collections (Pending Verification)
 *   • Log + self-verify own admin collections (My Collections)
 *   • Track items already forwarded to Accounts (Verified To Accounts)
 *   • Manage held / rejected items (Hold / Rejected)
 *
 * Hard-blocked actions (delegated to Accounts):
 *   create / edit / convert / send invoices · generate PI/TI/Receipts ·
 *   change invoice numbers · delete issued invoices.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Send, AlertTriangle, CheckCircle2, X, Clock,
  Plus, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCollections, subscribeCollections,
  verifyCollection, rejectCollection,
  adminApproveInvoiceRequest, adminRejectInvoiceRequest,
  accountsHoldRequest,
  type Collection,
} from "@/lib/collection-store";
import { LogCollectionDialog } from "@/components/counseling/LogCollectionDialog";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const useCol = () => useSyncExternalStore(subscribeCollections, getCollections, getCollections);

const STATUS_TONE: Record<string, string> = {
  none: "bg-muted text-muted-foreground border-border",
  awaiting_admin_review: "bg-warning/10 text-warning border-warning/30",
  awaiting_accounts: "bg-primary/10 text-primary border-primary/30",
  draft_prepared: "bg-primary/10 text-primary border-primary/30",
  on_hold: "bg-warning/10 text-warning border-warning/30",
  clarification_requested: "bg-warning/10 text-warning border-warning/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  issued: "bg-success/10 text-success border-success/30",
};

const StatusBadge = ({ status }: { status?: string }) => (
  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_TONE[status || "none"]}`}>
    {(status || "none").replace(/_/g, " ")}
  </Badge>
);

function KpiCard({
  label, value, hint, tone = "default", icon,
}: { label: string; value: React.ReactNode; hint?: string; tone?: "primary" | "success" | "warning" | "destructive" | "default"; icon?: React.ReactNode }) {
  const toneClass =
    tone === "primary" ? "text-primary" :
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className={toneClass}>{icon}</span>}
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </Card>
  );
}

/* ═══════════════════ Main component ═══════════════════ */

export function AdminBillingTab() {
  const items = useCol();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("pending");
  const [logOpen, setLogOpen] = useState(false);

  const actor = {
    id: currentUser?.id || "u_admin",
    name: currentUser?.name || "Admin",
    role: currentUser?.role || "admin",
  };

  // ── Buckets ──
  const pendingVerification = items.filter(c =>
    c.collectorRole === "counselor" && (
      c.status === "Awaiting Verification" ||
      c.status === "Mismatch" ||
      c.invoiceRequest?.status === "awaiting_admin_review"
    ),
  );
  const myCollections = items.filter(c =>
    c.collectorRole === "admin" && c.collectedById === actor.id,
  );
  const verifiedToAccounts = items.filter(c =>
    c.invoiceRequest && [
      "awaiting_accounts", "draft_prepared", "issued",
    ].includes(c.invoiceRequest.status),
  );
  const holdRejected = items.filter(c =>
    c.status === "Rejected" ||
    (c.invoiceRequest && ["on_hold", "clarification_requested", "rejected"].includes(c.invoiceRequest.status)),
  );

  // ── KPI counts ──
  const todayKey = new Date().toDateString();
  const verifiedToday = items.filter(c =>
    c.invoiceRequest?.adminReviewedAt &&
    new Date(c.invoiceRequest.adminReviewedAt).toDateString() === todayKey,
  ).length;
  const sentToAccountsToday = items.filter(c =>
    c.invoiceRequest?.status &&
    ["awaiting_accounts", "draft_prepared", "issued"].includes(c.invoiceRequest.status) &&
    c.invoiceRequest.adminReviewedAt &&
    new Date(c.invoiceRequest.adminReviewedAt).toDateString() === todayKey,
  ).length;

  const studentsForLog = useMemo(
    () => items.map(c => ({
      id: c.studentId, name: c.studentName, course: c.courseName, mobile: c.studentMobile,
    })),
    [items],
  );

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Verification Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review counselor-submitted collections before Accounts processing. Invoice issuance is restricted to Accounts.
          </p>
        </div>
        <Button onClick={() => setLogOpen(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Log Admin Collection
        </Button>
      </header>

      {/* ── Restriction notice ── */}
      <Card className="p-3 border-l-4 border-l-warning bg-warning/5 flex items-start gap-2">
        <Lock className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div className="text-xs text-foreground">
          <span className="font-medium">Admin scope — verification only.</span>{" "}
          Invoice creation, editing, conversion (PI→TI), receipt generation and sending are handled by Accounts after bank reconciliation.
        </div>
      </Card>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Pending Verification" value={pendingVerification.length}
          hint="From counselors" tone="warning" icon={<Clock className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Verified Today" value={verifiedToday}
          tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Sent to Accounts Today" value={sentToAccountsToday}
          tone="primary" icon={<Send className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Held / Rejected" value={holdRejected.length}
          tone={holdRejected.length > 0 ? "destructive" : "default"}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pending" className="text-xs">
            Pending Verification ({pendingVerification.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-xs">
            My Collections ({myCollections.length})
          </TabsTrigger>
          <TabsTrigger value="forwarded" className="text-xs">
            Verified → Accounts ({verifiedToAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="hold" className="text-xs">
            Hold / Rejected ({holdRejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingVerificationTab items={pendingVerification} actor={actor} />
        </TabsContent>
        <TabsContent value="mine" className="mt-4">
          <MyCollectionsTab items={myCollections} actor={actor} onLog={() => setLogOpen(true)} />
        </TabsContent>
        <TabsContent value="forwarded" className="mt-4">
          <ForwardedTab items={verifiedToAccounts} />
        </TabsContent>
        <TabsContent value="hold" className="mt-4">
          <HoldRejectedTab items={holdRejected} />
        </TabsContent>
      </Tabs>

      <LogCollectionDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        students={studentsForLog}
        asAdmin
      />
    </div>
  );
}

/* ═══════════════════ Pending Verification ═══════════════════ */

function PendingVerificationTab({
  items, actor,
}: { items: Collection[]; actor: { id: string; name: string; role: string } }) {
  const [verify, setVerify] = useState<{ target: Collection | null; amount: string; mode: string; remarks: string }>({
    target: null, amount: "", mode: "bank_statement", remarks: "",
  });
  const [hold, setHold] = useState<{ target: Collection | null; reason: string }>({ target: null, reason: "" });
  const [reject, setReject] = useState<{ target: Collection | null; reason: string }>({ target: null, reason: "" });

  const submitVerify = () => {
    if (!verify.target) return;
    const amt = parseFloat(verify.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid verified amount."); return; }
    const c = verify.target;
    // Verify the collection itself first.
    verifyCollection(c.id, {
      verifiedAmount: amt,
      verificationMode: verify.mode as NonNullable<Collection["verificationMode"]>,
      remarks: verify.remarks,
    }, actor);
    // If there's a counselor invoice request awaiting admin, approve & forward it.
    if (c.invoiceRequest?.status === "awaiting_admin_review") {
      adminApproveInvoiceRequest(c.id, actor, verify.remarks);
    }
    toast.success(`${c.receiptRef} verified and forwarded to Accounts.`);
    setVerify({ target: null, amount: "", mode: "bank_statement", remarks: "" });
  };

  const submitHold = () => {
    if (!hold.target || !hold.reason.trim()) { toast.error("State why this is on hold."); return; }
    accountsHoldRequest(hold.target.id, hold.reason, actor);
    toast.message(`${hold.target.receiptRef} placed on hold.`);
    setHold({ target: null, reason: "" });
  };

  const submitReject = () => {
    if (!reject.target || !reject.reason.trim()) { toast.error("State why this is rejected."); return; }
    const c = reject.target;
    if (c.invoiceRequest?.status === "awaiting_admin_review") {
      adminRejectInvoiceRequest(c.id, reject.reason, actor);
    } else {
      rejectCollection(c.id, reject.reason, actor);
    }
    toast.message(`${c.receiptRef} rejected.`);
    setReject({ target: null, reason: "" });
  };

  return (
    <Card className="p-0 overflow-x-auto">
      <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30">
        Verify legitimacy only — student match, amount match, payment mode, proof, no duplicates.
        You cannot change amount or invoice number.
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Txn ID</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Collector</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Proof</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">
                Queue empty. All counselor submissions are processed.
              </TableCell>
            </TableRow>
          ) : items.map(c => {
            const hasProof = c.attachments && c.attachments.length > 0;
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs capitalize">{c.collectorRole}</TableCell>
                <TableCell className="text-xs">{c.collectedByName}</TableCell>
                <TableCell className="text-xs">
                  {c.studentName}
                  <div className="text-[10px] text-muted-foreground">{c.courseName}</div>
                </TableCell>
                <TableCell className="text-xs capitalize">{c.reason.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                <TableCell className="text-xs uppercase">{c.mode}</TableCell>
                <TableCell>
                  {hasProof
                    ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">{c.attachments!.length} file</Badge>
                    : c.mode === "cash"
                      ? <Badge variant="outline" className="text-[10px]">Cash</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">No proof</Badge>}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(c.collectedAt)}</TableCell>
                <TableCell className="text-right space-x-1 whitespace-nowrap">
                  <Button size="sm" className="h-7 text-xs"
                    onClick={() => setVerify({ target: c, amount: String(c.amount), mode: c.mode === "cash" ? "cash_in_hand" : "bank_statement", remarks: "" })}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setHold({ target: c, reason: "" })}>
                    Hold
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setReject({ target: c, reason: "" })}>
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Verify dialog */}
      <Dialog open={!!verify.target} onOpenChange={(o) => !o && setVerify({ target: null, amount: "", mode: "bank_statement", remarks: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify & forward to Accounts</DialogTitle>
            <DialogDescription>
              {verify.target?.receiptRef} · {verify.target?.studentName} · {fmt(verify.target?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Verified amount</Label>
              <Input type="number" value={verify.amount}
                onChange={(e) => setVerify(s => ({ ...s, amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Verification mode</Label>
              <Select value={verify.mode} onValueChange={(v) => setVerify(s => ({ ...s, mode: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_in_hand">Cash in hand</SelectItem>
                  <SelectItem value="bank_statement">Bank statement</SelectItem>
                  <SelectItem value="upi_confirmation">UPI confirmation</SelectItem>
                  <SelectItem value="cheque_status">Cheque status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Remarks (optional)</Label>
              <Textarea rows={2} value={verify.remarks}
                onChange={(e) => setVerify(s => ({ ...s, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerify({ target: null, amount: "", mode: "bank_statement", remarks: "" })}>Cancel</Button>
            <Button onClick={submitVerify}>Verify & forward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold dialog */}
      <Dialog open={!!hold.target} onOpenChange={(o) => !o && setHold({ target: null, reason: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Place on hold</DialogTitle>
            <DialogDescription>State why this item is on hold.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={hold.reason}
            onChange={(e) => setHold(s => ({ ...s, reason: e.target.value }))}
            placeholder="e.g. awaiting bank confirmation; counselor must reupload proof…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHold({ target: null, reason: "" })}>Cancel</Button>
            <Button onClick={submitHold}>Hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!reject.target} onOpenChange={(o) => !o && setReject({ target: null, reason: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject transaction</DialogTitle>
            <DialogDescription>State why this transaction is rejected.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reject.reason}
            onChange={(e) => setReject(s => ({ ...s, reason: e.target.value }))}
            placeholder="e.g. duplicate of RC-2026-0014, amount mismatch with receipt…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject({ target: null, reason: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ═══════════════════ My Collections (Admin direct) ═══════════════════ */

function MyCollectionsTab({
  items, actor, onLog,
}: { items: Collection[]; actor: { id: string; name: string; role: string }; onLog: () => void }) {
  const selfVerify = (c: Collection) => {
    verifyCollection(c.id, {
      verifiedAmount: c.amount, verificationMode: "cash_in_hand",
      remarks: "Self-verified by admin",
    }, actor);
    toast.success(`${c.receiptRef} self-verified.`);
  };

  return (
    <Card className="p-0 overflow-x-auto">
      <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30 flex items-center justify-between gap-2">
        <span>Your direct collections can be self-verified and forwarded to Accounts. They do not require counselor → admin review.</span>
        <Button size="sm" variant="outline" onClick={onLog}><Plus className="h-3.5 w-3.5 mr-1" />Log</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Txn ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Self-verified</TableHead>
            <TableHead>Forwarded</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">
                No direct collections yet. Use “Log Admin Collection” above.
              </TableCell>
            </TableRow>
          ) : items.map(c => {
            const verified = c.status === "Verified" || c.status === "Ready For Invoice" || c.status === "Invoice Generated";
            const forwarded = c.invoiceRequest?.status && ["awaiting_accounts", "draft_prepared", "issued"].includes(c.invoiceRequest.status);
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs">
                  {c.studentName}
                  <div className="text-[10px] text-muted-foreground">{c.courseName}</div>
                </TableCell>
                <TableCell className="text-xs capitalize">{c.reason.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                <TableCell className="text-xs uppercase">{c.mode}</TableCell>
                <TableCell>
                  {verified
                    ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Yes</Badge>
                    : <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                </TableCell>
                <TableCell>
                  {forwarded
                    ? <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">To Accounts</Badge>
                    : <Badge variant="outline" className="text-[10px]">—</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {!verified && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => selfVerify(c)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Self-verify
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ═══════════════════ Verified → Accounts ═══════════════════ */

function ForwardedTab({ items }: { items: Collection[] }) {
  return (
    <Card className="p-0 overflow-x-auto">
      <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30">
        Items already pushed to the Accounts queue. Read-only — Accounts performs bank cross-check and issues PI / TI / Receipts.
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Txn ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Approved By</TableHead>
            <TableHead>Approved At</TableHead>
            <TableHead>Accounts Status</TableHead>
            <TableHead>Invoice #</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                Nothing forwarded yet.
              </TableCell>
            </TableRow>
          ) : items.map(c => (
            <TableRow key={c.id}>
              <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
              <TableCell className="text-xs">{c.studentName}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
              <TableCell className="text-xs">{c.invoiceRequest?.adminReviewedByName || c.collectedByName}</TableCell>
              <TableCell className="text-[10px] text-muted-foreground">
                {fmtDateTime(c.invoiceRequest?.adminReviewedAt || c.invoiceRequest?.requestedAt)}
              </TableCell>
              <TableCell><StatusBadge status={c.invoiceRequest?.status} /></TableCell>
              <TableCell className="text-xs font-mono">
                {c.invoiceRequest?.invoiceNo
                  ? <span className="text-success">{c.invoiceRequest.invoiceNo}</span>
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ═══════════════════ Hold / Rejected ═══════════════════ */

function HoldRejectedTab({ items }: { items: Collection[] }) {
  return (
    <Card className="p-0 overflow-x-auto">
      <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30">
        Flagged or invalid cases. Counselor / collector should respond and resubmit.
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Txn ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                No held or rejected items.
              </TableCell>
            </TableRow>
          ) : items.map(c => {
            const reason =
              c.invoiceRequest?.holdReason ||
              c.invoiceRequest?.rejectionReason ||
              c.invoiceRequest?.clarificationQuestion ||
              c.verificationRemarks ||
              "—";
            const last = c.audit[0]?.at || c.collectedAt;
            const status = c.invoiceRequest?.status || (c.status === "Rejected" ? "rejected" : c.status.toLowerCase());
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs">{c.studentName}</TableCell>
                <TableCell className="text-xs">{reason}</TableCell>
                <TableCell><StatusBadge status={status} /></TableCell>
                <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(last)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
