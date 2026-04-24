/**
 * Billing Chart — cross-role wired surface.
 *
 * One component, four variants — driven by the viewer's role:
 *   • counselor      → my requests + status tracking (no issuance)
 *   • admin          → verification queue (verify legitimacy only)
 *   • accounts       → verified queue + invoice issuance (manager/owner) or draft (executive)
 *   • owner          → command view: pipeline KPIs, SLA breaches, revenue control
 *
 * Permission matrix lives in BILLING_PERMISSIONS below — one source of truth.
 * Backed by the existing collection-store + invoice-request workflow so we
 * don't duplicate state.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShieldCheck, FileText, Receipt, IndianRupee, AlertTriangle, Clock, CheckCircle2,
  X, Send, Crown, Eye, Download, TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCollections, subscribeCollections,
  adminApproveInvoiceRequest, adminRejectInvoiceRequest,
  accountsPrepareDraft, accountsIssueInvoice,
  type Collection,
} from "@/lib/collection-store";
import { createInvoice } from "@/lib/finance-store";
import { computeBreakup } from "@/lib/gst-calc";
import { notifyInvoiceIssued, notifyRequestRejected, scanStaleInvoiceRequests } from "@/lib/collection-notifications";
import type { UserRole } from "@/lib/types";

/* ───────── Role permission matrix ───────── */

export const BILLING_PERMISSIONS = {
  counselor: {
    canRequest: true, canVerify: false, canIssue: false, canConvert: false,
    label: "Counselor",
    hint: "Create requests and track status. Invoices are issued by Accounts.",
  },
  admin: {
    canRequest: true, canVerify: true, canIssue: false, canConvert: false,
    label: "Admin",
    hint: "Verify legitimacy only. Financial edits are restricted.",
  },
  accounts_executive: {
    canRequest: false, canVerify: false, canIssue: false, canConvert: false,
    canPrepareDraft: true,
    label: "Accounts Executive",
    hint: "Prepare draft invoices. Manager / Owner will issue.",
  },
  accounts_manager: {
    canRequest: false, canVerify: false, canIssue: true, canConvert: true,
    label: "Accounts Manager",
    hint: "Issue invoices only after verified queue review.",
  },
  owner: {
    canRequest: false, canVerify: true, canIssue: true, canConvert: true, canOverride: true,
    label: "Owner",
    hint: "Monitor flow, delays and revenue control.",
  },
} as const;

type Variant = "counselor" | "admin" | "accounts" | "owner";

function variantFor(role: UserRole | undefined): Variant {
  if (role === "counselor") return "counselor";
  if (role === "admin") return "admin";
  if (role === "owner") return "owner";
  if (role === "accounts_manager" || role === "accounts_executive") return "accounts";
  return "counselor";
}

/* ───────── Helpers ───────── */

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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

const KpiCard = ({
  label, value, hint, tone = "default", icon,
}: { label: string; value: React.ReactNode; hint?: string; tone?: "primary" | "success" | "warning" | "destructive" | "default"; icon?: React.ReactNode }) => {
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
};

/* ═══════════════ Public component ═══════════════ */

export function BillingChart() {
  const { currentUser } = useAuth();
  const v = variantFor(currentUser?.role);

  if (v === "counselor") return <CounselorBilling />;
  if (v === "admin") return <AdminBilling />;
  if (v === "owner") return <OwnerBilling />;
  return <AccountsBilling />;
}

/* ═══════════════ Counselor variant ═══════════════ */

function CounselorBilling() {
  const items = useCol();
  const { currentUser } = useAuth();
  const my = items.filter(c => c.collectedById === currentUser?.id || c.invoiceRequest?.requestedById === currentUser?.id);

  const pending = my.filter(c => c.invoiceRequest && ["awaiting_admin_review", "awaiting_accounts", "draft_prepared", "on_hold", "clarification_requested"].includes(c.invoiceRequest.status));
  const verified = my.filter(c => c.status === "Verified" || c.status === "Ready For Invoice");
  const issued = my.filter(c => c.invoiceRequest?.status === "issued");
  const dues = my.reduce((s, c) => s + (c.amount - (c.verifiedAmount || 0)), 0);

  return (
    <div className="space-y-4">
      <Header
        title="Billing Chart"
        subtitle={BILLING_PERMISSIONS.counselor.hint}
        roleBadge="Counselor · request only"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="My Pending Requests" value={pending.length} tone="warning" icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiCard label="Verified" value={verified.length} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiCard label="Issued From My Requests" value={issued.length} tone="primary" icon={<Receipt className="h-3.5 w-3.5" />} />
        <KpiCard label="Students With Dues" value={fmt(Math.max(0, dues))} tone="default" icon={<IndianRupee className="h-3.5 w-3.5" />} />
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Due Amount</TableHead>
              <TableHead className="text-right">My Claim</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Request Status</TableHead>
              <TableHead>Verified by Admin</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {my.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">No collections or requests yet. Use the “My Collections” widget above to log one.</TableCell></TableRow>
            ) : my.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.receiptRef}</div></TableCell>
                <TableCell className="text-xs">{c.courseName}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmt(c.verifiedAmount ?? c.amount)}</TableCell>
                <TableCell className="text-xs">{c.invoiceRequest?.type && c.invoiceRequest.type !== "none" ? c.invoiceRequest.type : "—"}</TableCell>
                <TableCell><StatusBadge status={c.invoiceRequest?.status} /></TableCell>
                <TableCell className="text-xs">
                  {c.verifiedByName
                    ? <span className="text-success">{c.verifiedByName}</span>
                    : <span className="text-muted-foreground">Pending</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {c.invoiceRequest?.invoiceNo
                    ? <span className="font-mono text-success">{c.invoiceRequest.invoiceNo}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(c.audit[0]?.at || c.collectedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[10px] text-muted-foreground italic">
        You can request PI/TI but not issue invoices. Admin verifies, Accounts issues.
      </p>
    </div>
  );
}

/* ═══════════════ Admin variant ═══════════════ */

function AdminBilling() {
  const items = useCol();
  const { currentUser } = useAuth();
  const [reject, setReject] = useState<{ target: Collection | null; text: string }>({ target: null, text: "" });

  const queue = items.filter(c => c.invoiceRequest?.status === "awaiting_admin_review");
  const todayKey = new Date().toDateString();
  const verifiedToday = items.filter(c => c.invoiceRequest?.adminReviewedAt && new Date(c.invoiceRequest.adminReviewedAt).toDateString() === todayKey);
  const held = items.filter(c => c.invoiceRequest?.status === "on_hold" || c.invoiceRequest?.status === "clarification_requested");
  const sentToAccountsToday = items.filter(c => c.invoiceRequest?.status && c.invoiceRequest.adminReviewedAt && new Date(c.invoiceRequest.adminReviewedAt).toDateString() === todayKey && ["awaiting_accounts", "draft_prepared", "issued"].includes(c.invoiceRequest.status));

  const actor = { id: currentUser?.id || "u0", name: currentUser?.name || "Admin", role: currentUser?.role || "admin" };

  const approve = (c: Collection) => {
    adminApproveInvoiceRequest(c.id, actor);
    toast.success(`Forwarded ${c.receiptRef} to Accounts`);
  };
  const submitReject = () => {
    if (!reject.target || !reject.text.trim()) { toast.error("Reason required."); return; }
    adminRejectInvoiceRequest(reject.target.id, reject.text, actor);
    const updated = getCollections().find(x => x.id === reject.target!.id);
    if (updated) notifyRequestRejected(updated, reject.text);
    setReject({ target: null, text: "" });
  };

  return (
    <div className="space-y-4">
      <Header
        title="Billing Verification Queue"
        subtitle={BILLING_PERMISSIONS.admin.hint}
        roleBadge="Admin · verify only"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pending Verification" value={queue.length} tone="warning" icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiCard label="Verified Today" value={verifiedToday.length} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiCard label="Held / Clarify" value={held.length} tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <KpiCard label="Sent To Accounts Today" value={sentToAccountsToday.length} tone="primary" icon={<Send className="h-3.5 w-3.5" />} />
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30">
          Verify legitimacy only — proof matches, student exists, no duplicates. You cannot change amount or invoice number.
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">Queue empty. All caught up.</TableCell></TableRow>
            ) : queue.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{c.receiptRef}<div className="text-[10px] text-muted-foreground capitalize">{c.collectorRole}</div></TableCell>
                <TableCell className="text-xs">{c.collectedByName}</TableCell>
                <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.courseName}</div></TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                <TableCell className="text-xs uppercase">{c.mode}</TableCell>
                <TableCell className="text-xs">
                  {c.attachments && c.attachments.length > 0
                    ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">{c.attachments.length} file</Badge>
                    : <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">No proof</Badge>}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{c.invoiceRequest?.type}</Badge></TableCell>
                <TableCell><StatusBadge status={c.invoiceRequest?.status} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => approve(c)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setReject({ target: c, text: "" })}>
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!reject.target} onOpenChange={(o) => !o && setReject({ target: null, text: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>{reject.target?.receiptRef} · {reject.target?.studentName}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reject.text}
            placeholder="Why is this request being rejected?"
            onChange={(e) => setReject(s => ({ ...s, text: e.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject({ target: null, text: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════ Accounts variant ═══════════════ */

function AccountsBilling() {
  const items = useCol();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isManager = role === "accounts_manager" || role === "owner";

  // Surface SLA breach toasts on mount
  useMemo(() => scanStaleInvoiceRequests(items), [items.length]);

  const queue = items.filter(c => c.invoiceRequest?.status === "awaiting_accounts" || c.invoiceRequest?.status === "draft_prepared");
  const todayKey = new Date().toDateString();
  const issued = items.filter(c => c.invoiceRequest?.status === "issued");
  const issuedToday = issued.filter(c => c.invoiceRequest?.issuedAt && new Date(c.invoiceRequest.issuedAt).toDateString() === todayKey);
  const piPending = queue.filter(c => c.invoiceRequest?.type === "PI").length;
  const tiPending = queue.filter(c => c.invoiceRequest?.type === "TI").length;
  const bankMismatch = items.filter(c => c.status === "Mismatch").length;

  const actor = { id: currentUser?.id || "u0", name: currentUser?.name || "Accounts", role: role || "accounts_manager" };

  const issue = (c: Collection) => {
    const r = c.invoiceRequest;
    if (!r) return;
    if (r.type === "TI" && c.status !== "Verified" && c.status !== "Ready For Invoice" && c.collectorRole !== "admin") {
      toast.error("TI blocked — collection not yet verified by Admin.");
      return;
    }
    const amount = c.verifiedAmount ?? c.amount;
    const breakup = computeBreakup(amount, 18, "gross_inclusive", true);
    const inv = createInvoice({
      invoiceType: r.type === "TI" ? "TI" : "PI",
      customerId: c.studentId,
      customerName: c.studentName,
      customerType: "Student",
      revenueStream: "Student Admissions",
      programName: c.courseName,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      subtotal: breakup.taxable,
      discount: 0,
      gstType: "Taxable",
      gstRate: 18,
      notes: `Issued from ${c.receiptRef} via Billing Chart`,
    } as Parameters<typeof createInvoice>[0], actor.id);
    inv.cgst = breakup.cgst; inv.sgst = breakup.sgst; inv.igst = breakup.igst;

    const updated = accountsIssueInvoice(c.id, inv.id, inv.invoiceNo, actor);
    if (updated) notifyInvoiceIssued(updated);
    toast.success(`${r.type} ${inv.invoiceNo} issued`);
  };

  return (
    <div className="space-y-4">
      <Header
        title="Verified Queue → Issuance"
        subtitle={BILLING_PERMISSIONS.accounts_manager.hint}
        roleBadge={isManager ? "Accounts · can issue" : "Accounts Executive · drafts only"}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Verified Queue" value={queue.length} tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
        <KpiCard label="PI To Issue" value={piPending} tone="warning" icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiCard label="TI To Issue" value={tiPending} tone="warning" icon={<Receipt className="h-3.5 w-3.5" />} />
        <KpiCard label="Bank Mismatch" value={bankMismatch} tone={bankMismatch > 0 ? "destructive" : "default"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <KpiCard label="Issued Today" value={issuedToday.length} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="p-3 border-b text-[11px] text-muted-foreground bg-muted/30">
          Cross-check bank/cash before issuing. Only Accounts Manager / Owner can issue. Executives prepare drafts.
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank Match</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No items in the verified queue.</TableCell></TableRow>
            ) : queue.map(c => {
              const r = c.invoiceRequest!;
              const blockedTi = r.type === "TI" && c.status !== "Verified" && c.status !== "Ready For Invoice" && c.collectorRole !== "admin";
              const matched = c.status !== "Mismatch";
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                  <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.courseName}</div></TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${matched ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                      {matched ? "Match" : "Mismatch"}
                    </Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs font-mono">{r.invoiceNo || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {!isManager && r.status !== "draft_prepared" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { accountsPrepareDraft(c.id, actor); toast.success("Draft prepared"); }}>
                        Prepare Draft
                      </Button>
                    )}
                    {isManager && !blockedTi && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => issue(c)}>
                        <Receipt className="h-3 w-3 mr-1" /> Issue {r.type}
                      </Button>
                    )}
                    {isManager && blockedTi && (
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">TI blocked</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ═══════════════ Owner variant ═══════════════ */

function OwnerBilling() {
  const items = useCol();
  const SLA_HOURS = 4;

  const todayKey = new Date().toDateString();
  const totalPending = items.filter(c => c.invoiceRequest && !["none", "issued", "rejected"].includes(c.invoiceRequest.status)).length;
  const adminBacklog = items.filter(c => c.invoiceRequest?.status === "awaiting_admin_review").length;
  const accountsBacklog = items.filter(c => c.invoiceRequest?.status === "awaiting_accounts" || c.invoiceRequest?.status === "draft_prepared").length;
  const collectionsToday = items.filter(c => new Date(c.collectedAt).toDateString() === todayKey).reduce((s, c) => s + c.amount, 0);
  const piIssuedToday = items.filter(c => c.invoiceRequest?.type === "PI" && c.invoiceRequest?.status === "issued" && c.invoiceRequest?.issuedAt && new Date(c.invoiceRequest.issuedAt).toDateString() === todayKey).length;
  const tiIssuedToday = items.filter(c => c.invoiceRequest?.type === "TI" && c.invoiceRequest?.status === "issued" && c.invoiceRequest?.issuedAt && new Date(c.invoiceRequest.issuedAt).toDateString() === todayKey).length;

  // SLA breaches: requests open longer than SLA_HOURS at admin or accounts step
  const cutoff = Date.now() - SLA_HOURS * 3600 * 1000;
  const breaches = items.filter(c => {
    const r = c.invoiceRequest;
    if (!r || !["awaiting_admin_review", "awaiting_accounts"].includes(r.status)) return false;
    return r.requestedAt ? new Date(r.requestedAt).getTime() < cutoff : false;
  });

  // Average turnaround = avg(issuedAt - requestedAt) for issued items in hours
  const issuedItems = items.filter(c => c.invoiceRequest?.status === "issued" && c.invoiceRequest?.issuedAt && c.invoiceRequest?.requestedAt);
  const avgTurnaround = issuedItems.length === 0
    ? 0
    : issuedItems.reduce((s, c) => s + (new Date(c.invoiceRequest!.issuedAt!).getTime() - new Date(c.invoiceRequest!.requestedAt!).getTime()), 0) / issuedItems.length / 3600000;

  const riskCases = items.filter(c => c.status === "Mismatch" || c.invoiceRequest?.status === "rejected").length;

  const exportCsv = () => {
    const rows = [
      ["receipt", "student", "amount", "collector", "request_type", "status", "verified_by", "issued_by", "invoice_no", "requested_at", "issued_at"],
      ...items.map(c => [
        c.receiptRef, c.studentName, c.amount, c.collectedByName,
        c.invoiceRequest?.type || "", c.invoiceRequest?.status || "",
        c.verifiedByName || "", c.invoiceRequest?.issuedByName || "",
        c.invoiceRequest?.invoiceNo || "",
        c.invoiceRequest?.requestedAt || "", c.invoiceRequest?.issuedAt || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `billing_chart_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Billing chart exported.");
  };

  return (
    <div className="space-y-4">
      <Header
        title="Owner Billing Command"
        subtitle={BILLING_PERMISSIONS.owner.hint}
        roleBadge="Owner · full visibility"
        right={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Pending Requests" value={totalPending} tone="warning" icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiCard label="Admin Backlog" value={adminBacklog} tone="warning" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
        <KpiCard label="Accounts Backlog" value={accountsBacklog} tone="primary" icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiCard label="Collections Today" value={fmt(collectionsToday)} tone="success" icon={<IndianRupee className="h-3.5 w-3.5" />} />
        <KpiCard label="PI Issued Today" value={piIssuedToday} tone="primary" icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiCard label="TI Issued Today" value={tiIssuedToday} tone="success" icon={<Receipt className="h-3.5 w-3.5" />} />
        <KpiCard label="Risk Cases" value={riskCases} tone={riskCases > 0 ? "destructive" : "success"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <KpiCard label="Avg Turnaround" value={`${avgTurnaround.toFixed(1)}h`} tone="default" icon={<TimerReset className="h-3.5 w-3.5" />} />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs">SLA Breaches ({breaches.length})</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
                  <TableHead>Collector</TableHead><TableHead>Verifier</TableHead>
                  <TableHead>Issuer</TableHead><TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0
                  ? <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No data.</TableCell></TableRow>
                  : items.slice(0, 50).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                      <TableCell className="text-xs">{c.studentName}</TableCell>
                      <TableCell className="text-xs">{c.collectedByName}<div className="text-[10px] text-muted-foreground capitalize">{c.collectorRole}</div></TableCell>
                      <TableCell className="text-xs">{c.verifiedByName || "—"}</TableCell>
                      <TableCell className="text-xs">{c.invoiceRequest?.issuedByName || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.invoiceRequest?.type || "—"}</Badge></TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                      <TableCell><StatusBadge status={c.invoiceRequest?.status} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <div className="p-3 border-b text-[11px] text-muted-foreground bg-warning/5">
              Requests pending more than {SLA_HOURS}h at Admin or Accounts.
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
                  <TableHead>Stuck At</TableHead><TableHead>Age</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaches.length === 0
                  ? <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No SLA breaches. Pipeline healthy.</TableCell></TableRow>
                  : breaches.map(c => {
                    const ageHrs = c.invoiceRequest?.requestedAt
                      ? Math.floor((Date.now() - new Date(c.invoiceRequest.requestedAt).getTime()) / 3600000)
                      : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                        <TableCell className="text-xs">{c.studentName}</TableCell>
                        <TableCell><StatusBadge status={c.invoiceRequest?.status} /></TableCell>
                        <TableCell className="text-xs text-warning">{ageHrs}h</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt(c.amount)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-3">
          <BillingReports items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════ Reports sub-section ═══════════════ */

function BillingReports({ items }: { items: Collection[] }) {
  const byRole = items.reduce<Record<string, number>>((a, c) => {
    const k = c.collectorRole; a[k] = (a[k] || 0) + 1; return a;
  }, {});
  const verifiedCount = items.filter(c => c.invoiceRequest?.adminReviewedAt).length;
  const requestedCount = items.filter(c => c.invoiceRequest && c.invoiceRequest.type !== "none").length;
  const issuedCount = items.filter(c => c.invoiceRequest?.status === "issued").length;
  const verificationConv = requestedCount === 0 ? 0 : Math.round((verifiedCount / requestedCount) * 100);
  const issueConv = requestedCount === 0 ? 0 : Math.round((issuedCount / requestedCount) * 100);
  const collectionsTotal = items.reduce((s, c) => s + c.amount, 0);
  const invoiceMatchAmount = items.filter(c => c.invoiceRequest?.status === "issued").reduce((s, c) => s + c.amount, 0);
  const matchPct = collectionsTotal === 0 ? 0 : Math.round((invoiceMatchAmount / collectionsTotal) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Requests by Role</h4>
        <ul className="text-xs space-y-1">
          {Object.entries(byRole).map(([k, v]) => (
            <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span className="font-mono">{v}</span></li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Verification Conversion</h4>
        <p className="text-3xl font-bold text-primary">{verificationConv}%</p>
        <p className="text-[11px] text-muted-foreground">{verifiedCount} verified / {requestedCount} requested</p>
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Invoice Turnaround</h4>
        <p className="text-3xl font-bold text-success">{issueConv}%</p>
        <p className="text-[11px] text-muted-foreground">{issuedCount} issued / {requestedCount} requested</p>
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Collections → Invoice Match</h4>
        <p className="text-3xl font-bold">{matchPct}%</p>
        <p className="text-[11px] text-muted-foreground">{fmt(invoiceMatchAmount)} invoiced of {fmt(collectionsTotal)} collected</p>
      </Card>
    </div>
  );
}

/* ═══════════════ Shared header ═══════════════ */

function Header({ title, subtitle, roleBadge, right }: { title: string; subtitle: string; roleBadge: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> {title}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">{roleBadge}</Badge>
        {right}
      </div>
    </div>
  );
}
