/**
 * Dual Collection + Invoice Request tabs — surfaced inside AccountsModule.
 *
 *  • CollectionsLogTab — Admin (or Owner) can record a direct collection here.
 *    Counselor & Admin entries roll up by branch / role into a single ledger.
 *
 *  • InvoiceRequestsTab — Accounts queue. Routes:
 *      - Awaiting Admin (read-only visibility)
 *      - Awaiting Accounts (Executive prepares draft, Manager/Owner issues)
 *      - On Hold / Clarification
 *      - Rejected
 *
 *  Issuance is hard-blocked unless: (a) the collector is Admin (direct flow), or
 *  (b) Admin has approved the counselor's request. Owner can override.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, IndianRupee, ShieldCheck, Receipt, AlertTriangle, FileText,
  CheckCircle2, MessageSquare, X, PauseCircle, Send, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCollections, subscribeCollections,
  adminApproveInvoiceRequest, adminRejectInvoiceRequest,
  accountsPrepareDraft, accountsIssueInvoice, accountsHoldRequest,
  accountsRequestClarification, accountsRejectRequest,
  type Collection,
} from "@/lib/collection-store";
import {
  notifyInvoiceIssued, notifyRequestRejected, scanStaleInvoiceRequests,
} from "@/lib/collection-notifications";
import { createInvoice } from "@/lib/finance-store";
import { computeBreakup } from "@/lib/gst-calc";
import { LogCollectionDialog } from "@/components/counseling/LogCollectionDialog";
import { FinanceKpi, fmtINR } from "./FinanceKpi";

function useCol() {
  return useSyncExternalStore(subscribeCollections, getCollections, getCollections);
}
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const requestBadge = (status?: string) => {
  switch (status) {
    case "awaiting_admin_review": return "bg-warning/10 text-warning border-warning/30";
    case "awaiting_accounts": return "bg-primary/10 text-primary border-primary/30";
    case "draft_prepared": return "bg-primary/10 text-primary border-primary/30";
    case "on_hold": return "bg-warning/10 text-warning border-warning/30";
    case "clarification_requested": return "bg-warning/10 text-warning border-warning/30";
    case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
    case "issued": return "bg-success/10 text-success border-success/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

/* ═══════════════ Admin direct collection ledger ═══════════════ */

export function CollectionsLogTab({ role }: { role: "owner" | "manager" | "executive" }) {
  const items = useCol();
  const { currentUser } = useAuth();
  const [logOpen, setLogOpen] = useState(false);

  const isAdminOrOwner = currentUser?.role === "admin" || currentUser?.role === "owner";

  // Build a student list from existing collections so admin can re-collect
  // for a known student. New student names can be added by Counselors first.
  const students = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; course: string; mobile?: string }>();
    items.forEach(c => {
      if (!seen.has(c.studentId)) {
        seen.set(c.studentId, { id: c.studentId, name: c.studentName, course: c.courseName, mobile: c.studentMobile });
      }
    });
    return Array.from(seen.values());
  }, [items]);

  const todayKey = new Date().toDateString();
  const adminToday = items.filter(c => c.collectorRole === "admin" && new Date(c.collectedAt).toDateString() === todayKey);
  const counselorToday = items.filter(c => c.collectorRole === "counselor" && new Date(c.collectedAt).toDateString() === todayKey);
  const adminTotal = adminToday.reduce((s, c) => s + c.amount, 0);
  const counselorTotal = counselorToday.reduce((s, c) => s + c.amount, 0);
  const splitText = adminTotal + counselorTotal > 0
    ? `Admin ${Math.round(adminTotal / (adminTotal + counselorTotal) * 100)}% · Counselor ${Math.round(counselorTotal / (adminTotal + counselorTotal) * 100)}%`
    : "—";

  const recent = useMemo(
    () => [...items].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()).slice(0, 30),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" /> Collections Ledger
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            All money received — by Counselors and Admin. Trusted source for verification & invoicing.
          </p>
        </div>
        {isAdminOrOwner && (
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Log Direct Collection
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FinanceKpi label="Admin Today" value={fmtINR(adminTotal)} hint={`${adminToday.length} entries`} tone="primary" icon={<ShieldCheck className="h-4 w-4" />} />
        <FinanceKpi label="Counselor Today" value={fmtINR(counselorTotal)} hint={`${counselorToday.length} entries`} tone="success" icon={<IndianRupee className="h-4 w-4" />} />
        <FinanceKpi label="Total Today" value={fmtINR(adminTotal + counselorTotal)} hint={splitText} tone="success" icon={<Receipt className="h-4 w-4" />} />
        <FinanceKpi label="Lifetime Entries" value={items.length} tone="default" icon={<FileText className="h-4 w-4" />} />
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Reason</TableHead><TableHead>Mode</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Request</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-xs">No collections yet.</TableCell></TableRow>
            ) : recent.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.studentMobile || "—"}</div></TableCell>
                <TableCell className="text-xs">{c.branch || "—"}</TableCell>
                <TableCell className="text-xs">{c.reason.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs uppercase">{c.mode}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.amount)}</TableCell>
                <TableCell className="text-xs">
                  {c.collectedByName}
                  <div className="text-[10px] text-muted-foreground capitalize">{c.collectorRole}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                <TableCell>
                  {c.invoiceRequest && c.invoiceRequest.type !== "none" ? (
                    <Badge variant="outline" className={`text-[10px] ${requestBadge(c.invoiceRequest.status)}`}>
                      {c.invoiceRequest.type} · {c.invoiceRequest.status.replace(/_/g, " ")}
                    </Badge>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <LogCollectionDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        students={students}
        asAdmin
      />
    </div>
  );
}

/* ═══════════════ Invoice Requests queue ═══════════════ */

interface ActionDialogState {
  type: "hold" | "clarify" | "reject" | null;
  target: Collection | null;
  text: string;
}

export function InvoiceRequestsTab({ role }: { role: "owner" | "manager" | "executive" }) {
  const items = useCol();
  const { currentUser } = useAuth();
  const [active, setActive] = useState("awaiting_accounts");
  const [action, setAction] = useState<ActionDialogState>({ type: null, target: null, text: "" });
  const [overrideTarget, setOverrideTarget] = useState<Collection | null>(null);
  const [overrideText, setOverrideText] = useState("");

  // Surface stale > 6h alerts on first render of this tab.
  useMemo(() => scanStaleInvoiceRequests(items), [items.length]);

  const awaitingAdmin = items.filter(c => c.invoiceRequest?.status === "awaiting_admin_review");
  const awaitingAccounts = items.filter(c => c.invoiceRequest?.status === "awaiting_accounts" || c.invoiceRequest?.status === "draft_prepared");
  const onHold = items.filter(c => c.invoiceRequest?.status === "on_hold" || c.invoiceRequest?.status === "clarification_requested");
  const rejected = items.filter(c => c.invoiceRequest?.status === "rejected");
  const issuedToday = items.filter(c => c.invoiceRequest?.status === "issued"
    && c.invoiceRequest.issuedAt
    && new Date(c.invoiceRequest.issuedAt).toDateString() === new Date().toDateString());

  const piPending = awaitingAccounts.filter(c => c.invoiceRequest?.type === "PI").length;
  const tiPending = awaitingAccounts.filter(c => c.invoiceRequest?.type === "TI").length;
  const piIssuedToday = issuedToday.filter(c => c.invoiceRequest?.type === "PI").length;
  const tiIssuedToday = issuedToday.filter(c => c.invoiceRequest?.type === "TI").length;

  const actor = {
    id: currentUser?.id || "u0",
    name: currentUser?.name || "Accounts",
    role: currentUser?.role || "accounts_manager",
  };

  const issuableByMe = (c: Collection) => {
    if (role === "owner" || role === "manager") return true;
    return false; // executives prepare drafts only
  };

  const issue = (c: Collection) => {
    const r = c.invoiceRequest;
    if (!r) return;
    // Crosscheck guard: TI must come from verified collection unless owner override.
    if (r.type === "TI" && c.status !== "Verified" && c.status !== "Ready For Invoice" && c.status !== "Invoice Generated" && c.collectorRole !== "admin") {
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
      notes: `Issued from ${c.receiptRef} (${c.collectorRole === "admin" ? "Admin direct" : "Counselor request"})`,
    } as Parameters<typeof createInvoice>[0], actor.id);
    inv.cgst = breakup.cgst; inv.sgst = breakup.sgst; inv.igst = breakup.igst;

    const updated = accountsIssueInvoice(c.id, inv.id, inv.invoiceNo, actor);
    if (updated) notifyInvoiceIssued(updated);
    toast.success(`${r.type} ${inv.invoiceNo} issued`);
  };

  const submitAction = () => {
    const { type, target, text } = action;
    if (!type || !target) return;
    if (!text.trim() && type !== "hold") {
      toast.error("Reason / question required."); return;
    }
    if (type === "hold") {
      accountsHoldRequest(target.id, text || "Hold for crosscheck", actor);
      toast.success(`${target.receiptRef} placed on hold`);
    } else if (type === "clarify") {
      accountsRequestClarification(target.id, text, actor);
      toast.success(`Clarification requested on ${target.receiptRef}`);
    } else if (type === "reject") {
      accountsRejectRequest(target.id, text, actor);
      const updated = getCollections().find(c => c.id === target.id);
      if (updated) notifyRequestRejected(updated, text);
    }
    setAction({ type: null, target: null, text: "" });
  };

  const handleOverride = () => {
    if (overrideText.trim().toUpperCase() !== "CONFIRM") {
      toast.error("Type CONFIRM to override the gate.");
      return;
    }
    if (overrideTarget) issue(overrideTarget);
    setOverrideTarget(null); setOverrideText("");
  };

  const renderRow = (c: Collection, showApprove = false, allowIssue = false) => {
    const r = c.invoiceRequest!;
    const blockedTi = r.type === "TI" && c.status !== "Verified" && c.status !== "Ready For Invoice" && c.collectorRole !== "admin";
    return (
      <TableRow key={c.id}>
        <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
        <TableCell className="text-xs">{c.studentName}<div className="text-[10px] text-muted-foreground">{c.courseName}</div></TableCell>
        <TableCell className="text-xs">
          <Badge variant="outline" className="text-[10px] capitalize">{c.collectorRole}</Badge>
          <div className="text-[10px] text-muted-foreground mt-0.5">{c.collectedByName}</div>
        </TableCell>
        <TableCell><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
        <TableCell className="text-right text-xs tabular-nums">{fmtINR(c.amount)}</TableCell>
        <TableCell className="text-xs">{r.requestedAt ? fmtDateTime(r.requestedAt) : "—"}</TableCell>
        <TableCell><Badge variant="outline" className={`text-[10px] ${requestBadge(r.status)}`}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
        <TableCell className="text-right space-x-1">
          {showApprove && (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                adminApproveInvoiceRequest(c.id, actor);
                toast.success("Forwarded to Accounts");
              }}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Forward
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => setAction({ type: "reject", target: c, text: "" })}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
          {allowIssue && (
            <>
              {role === "executive" && r.status !== "draft_prepared" && (
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { accountsPrepareDraft(c.id, actor); toast.success("Draft prepared"); }}>
                  <Pencil className="h-3 w-3 mr-1" /> Prepare Draft
                </Button>
              )}
              {issuableByMe(c) && !blockedTi && (
                <Button size="sm" className="h-7 text-xs" onClick={() => issue(c)}>
                  <Receipt className="h-3 w-3 mr-1" /> Issue {r.type}
                </Button>
              )}
              {issuableByMe(c) && blockedTi && role === "owner" && (
                <Button size="sm" variant="outline" className="h-7 text-xs border-warning/40 text-warning"
                  onClick={() => setOverrideTarget(c)}>
                  Owner override
                </Button>
              )}
              {issuableByMe(c) && blockedTi && role !== "owner" && (
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">TI blocked</Badge>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => setAction({ type: "hold", target: c, text: "" })}>
                <PauseCircle className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => setAction({ type: "clarify", target: c, text: "" })}>
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                onClick={() => setAction({ type: "reject", target: c, text: "" })}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const tableHeader = (
    <TableHeader>
      <TableRow>
        <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
        <TableHead>From</TableHead><TableHead>Type</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead>Requested</TableHead><TableHead>Status</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  const empty = (cols: number, msg: string) => (
    <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-6 text-xs">{msg}</TableCell></TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpi label="PI Pending" value={piPending} tone="warning" icon={<FileText className="h-4 w-4" />} />
        <FinanceKpi label="TI Pending" value={tiPending} tone="primary" icon={<Receipt className="h-4 w-4" />} />
        <FinanceKpi label="Awaiting Admin" value={awaitingAdmin.length} tone="warning" icon={<ShieldCheck className="h-4 w-4" />} />
        <FinanceKpi label="On Hold / Clarify" value={onHold.length} tone={onHold.length > 0 ? "warning" : "default"} icon={<PauseCircle className="h-4 w-4" />} />
        <FinanceKpi label="PI Issued Today" value={piIssuedToday} tone="success" />
        <FinanceKpi label="TI Issued Today" value={tiIssuedToday} tone="success" />
      </div>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="awaiting_admin" className="text-xs">Awaiting Admin ({awaitingAdmin.length})</TabsTrigger>
          <TabsTrigger value="awaiting_accounts" className="text-xs">Awaiting Accounts ({awaitingAccounts.length})</TabsTrigger>
          <TabsTrigger value="hold" className="text-xs">Hold / Clarify ({onHold.length})</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting_admin" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <div className="p-3 border-b text-[11px] text-muted-foreground">
              Counselor invoice requests awaiting Admin review.
              {currentUser?.role === "admin" || currentUser?.role === "owner" ? " You can forward or reject." : " Read-only for Accounts."}
            </div>
            <Table>
              {tableHeader}
              <TableBody>
                {awaitingAdmin.length === 0
                  ? empty(8, "No counselor requests waiting on admin.")
                  : awaitingAdmin.map(c => renderRow(c, currentUser?.role === "admin" || currentUser?.role === "owner", false))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="awaiting_accounts" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <div className="p-3 border-b text-[11px] text-muted-foreground">
              Submit verified details for PI/TI issuance.{" "}
              {role === "executive" ? "As Executive you can prepare drafts; Manager / Owner will issue." : "Crosscheck against bank/cash before issuing."}
            </div>
            <Table>
              {tableHeader}
              <TableBody>
                {awaitingAccounts.length === 0
                  ? empty(8, "No requests awaiting accounts action.")
                  : awaitingAccounts.map(c => renderRow(c, false, true))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="hold" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <Table>
              {tableHeader}
              <TableBody>
                {onHold.length === 0
                  ? empty(8, "Nothing on hold.")
                  : onHold.map(c => renderRow(c, false, true))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-3">
          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead><TableHead>Student</TableHead>
                  <TableHead>Type</TableHead><TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejected.length === 0
                  ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">No rejected requests.</TableCell></TableRow>
                  : rejected.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.receiptRef}</TableCell>
                      <TableCell className="text-xs">{c.studentName}</TableCell>
                      <TableCell className="text-xs">{c.invoiceRequest?.type}</TableCell>
                      <TableCell className="text-xs text-destructive">{c.invoiceRequest?.rejectionReason || "—"}</TableCell>
                      <TableCell className="text-xs">{c.invoiceRequest?.adminReviewedByName || c.invoiceRequest?.requestedByName}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hold / Clarify / Reject dialog */}
      <Dialog open={!!action.type} onOpenChange={(o) => !o && setAction({ type: null, target: null, text: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action.type === "hold" ? "Hold for crosscheck" : action.type === "clarify" ? "Request clarification" : "Reject request"}
            </DialogTitle>
            <DialogDescription>
              {action.target?.receiptRef} · {action.target?.studentName}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={action.text} onChange={(e) => setAction(s => ({ ...s, text: e.target.value }))}
            placeholder={action.type === "clarify" ? "What do you need from the collector?" : "Reason"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction({ type: null, target: null, text: "" })}>Cancel</Button>
            <Button variant={action.type === "reject" ? "destructive" : "default"} onClick={submitAction}>
              <Send className="h-3.5 w-3.5 mr-1" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner override dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={(o) => { if (!o) { setOverrideTarget(null); setOverrideText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-warning flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Owner Override
            </DialogTitle>
            <DialogDescription>
              You are bypassing the verification gate for {overrideTarget?.receiptRef}. Type <strong>CONFIRM</strong> to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input value={overrideText} onChange={(e) => setOverrideText(e.target.value)} placeholder="CONFIRM" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOverrideTarget(null); setOverrideText(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleOverride}>Issue anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
