/**
 * Universal Approval Center — used by all roles.
 * - Executive: "My Requests" tracker
 * - Manager: Team queue (executive submissions) + My Submissions to admin
 * - Admin/Owner: Global Approval Center with override + bulk actions
 *
 * Reuses the universal action drawer for Approve/Reject/Hold/Override.
 */
import { useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, PauseCircle, ShieldAlert, Clock, Sparkles, Receipt,
  CheckSquare, Square, Download, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  approvalStore, approvalsForActor, pendingForRole, avgApprovalHours, hoursSince, canOverride,
  type ApprovalRequest, type ApprovalStatus, type ApprovalAction, type ApprovalRequestType,
} from "@/lib/approvals";
import { allianceStore, downloadCSV } from "@/lib/alliance-data";
import { toast } from "sonner";
import { confetti } from "./AllianceShell";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  Pending: "bg-info/10 text-info",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Hold: "bg-warning/10 text-warning",
  Overridden: "bg-accent text-accent-foreground",
  Resubmitted: "bg-info/10 text-info",
};

function StatusChip({ value }: { value: ApprovalStatus }) {
  return (
    <span
      key={value}
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap animate-in fade-in zoom-in-95 duration-300",
        STATUS_STYLES[value]
      )}
    >
      {value}
    </span>
  );
}

const REQUEST_TYPES: ApprovalRequestType[] = ["Expense Bill", "Task Completion", "Task Extension", "Travel Reimbursement", "Visit Claim", "Custom Request", "Proposal Approval"];

export function ApprovalCenter() {
  const { currentUser, allUsers } = useAuth();
  const [version, setVersion] = useState(0);
  const [actionTarget, setActionTarget] = useState<{ req: ApprovalRequest; action: Exclude<ApprovalAction, "Submit"> } | null>(null);
  const [comment, setComment] = useState("");
  const [holdDate, setHoldDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const role = currentUser?.role ?? "alliance_executive";
  const userId = currentUser?.id ?? "";
  const isExec = role === "alliance_executive";
  const isMgr = role === "alliance_manager";
  const isAdmin = role === "admin" || role === "owner";

  const userLabel = (id?: string) => allUsers.find((u) => u.id === id)?.name ?? id ?? "—";

  const all = useMemo(() => { void version; return userId ? approvalsForActor(userId, role) : []; }, [userId, role, version]);
  const pending = useMemo(() => { void version; return userId ? pendingForRole(userId, role) : []; }, [userId, role, version]);
  const logs = useMemo(() => { void version; return approvalStore.logs(); }, [version]);
  const filtered = useMemo(() => {
    return all.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterType !== "all" && a.requestType !== filterType) return false;
      if (search) {
        const sender = allUsers.find((u) => u.id === a.submittedBy)?.name ?? "";
        if (!a.title.toLowerCase().includes(search.toLowerCase()) && !sender.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [all, filterStatus, filterType, search, allUsers]);

  if (!currentUser) return null;

  // KPIs
  const approvedThisWeek = all.filter((a) => a.status === "Approved" && hoursSince(a.updatedAt) <= 168).length;
  const heldCount = all.filter((a) => a.status === "Hold").length;
  const rejectedCount = all.filter((a) => a.status === "Rejected").length;
  const avgHrs = avgApprovalHours(all);
  const overridesCount = all.filter((a) => a.status === "Overridden").length;
  const totalApprovedAmount = all.filter((a) => a.status === "Approved").reduce((s, a) => s + (a.amount ?? 0), 0);

  // Behavioral nudges
  const urgent = pending.filter((p) => hoursSince(p.createdAt) >= 24).length;

  function syncBack(req: ApprovalRequest, status: ApprovalStatus) {
    // Mirror Approved/Rejected back to expense source records
    if (req.requestType === "Expense Bill" || req.requestType === "Travel Reimbursement" || req.requestType === "Visit Claim") {
      const exps = allianceStore.getExpenses();
      const target = exps.find((e) => e.id === req.requestId);
      if (target) {
        const next = status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : target.status;
        allianceStore.saveExpenses(exps.map((e) => e.id === req.requestId ? { ...e, status: next as typeof e.status } : e));
      }
    }
  }

  const performAction = (req: ApprovalRequest, action: Exclude<ApprovalAction, "Submit">, opts?: { silent?: boolean }) => {
    if (action === "Reject" && !comment.trim() && !opts?.silent) { toast.error("A reason is required to reject."); return false; }
    if (action === "Hold" && !comment.trim() && !opts?.silent) { toast.error("A reason is required to hold."); return false; }
    if (action === "Override" && !comment.trim() && !opts?.silent) { toast.error("Override requires a justification."); return false; }
    const result = approvalStore.act(req.id, {
      action, actorId: userId, actorRole: role, comment: comment || undefined,
      nextReviewDate: action === "Hold" ? holdDate || undefined : undefined,
    });
    if (!result) { if (!opts?.silent) toast.error("You cannot act on this request."); return false; }
    syncBack(result, result.status);
    if (action === "Approve" && (result.amount ?? 0) >= 5000) confetti();
    if (!opts?.silent) toast.success(`${action}d successfully.`);
    return true;
  };

  const closeDrawer = () => { setActionTarget(null); setComment(""); setHoldDate(""); };
  const submitDrawer = () => {
    if (!actionTarget) return;
    if (performAction(actionTarget.req, actionTarget.action)) {
      closeDrawer();
      setVersion((v) => v + 1);
    }
  };

  const bulkAct = (action: "Approve" | "Hold") => {
    if (!selected.size) { toast.error("Select at least one request."); return; }
    let ok = 0;
    selected.forEach((id) => {
      const req = all.find((a) => a.id === id);
      if (!req) return;
      const r = approvalStore.act(id, { action, actorId: userId, actorRole: role, comment: action === "Hold" ? "Bulk hold by admin" : undefined });
      if (r) { syncBack(r, r.status); ok += 1; }
    });
    toast.success(`${action}d ${ok} of ${selected.size} requests.`);
    setSelected(new Set());
    setVersion((v) => v + 1);
  };

  const exportCsv = () => {
    downloadCSV("approvals.csv", filtered.map((a) => ({
      Title: a.title, Type: a.requestType, SubmittedBy: userLabel(a.submittedBy), Role: a.submittedRole,
      Amount: a.amount ?? "", Status: a.status, Priority: a.priority,
      Approver: a.currentApproverRole, Created: a.createdAt, Updated: a.updatedAt, Notes: a.notes ?? "",
    })));
  };

  const toggleSelect = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // ── KPI cards ──
  const kpiCards = [
    isExec
      ? [
          { label: "My Pending", value: pending.length, icon: <Clock className="h-4 w-4" />, accent: "info" as const },
          { label: "Approved", value: all.filter((a) => a.status === "Approved").length, icon: <CheckCircle2 className="h-4 w-4" />, accent: "success" as const },
          { label: "Held", value: heldCount, icon: <PauseCircle className="h-4 w-4" />, accent: "warning" as const },
          { label: "Rejected", value: rejectedCount, icon: <XCircle className="h-4 w-4" />, accent: "danger" as const },
        ]
      : isMgr
      ? [
          { label: "Pending Exec Approvals", value: pending.length, icon: <Clock className="h-4 w-4" />, accent: "info" as const },
          { label: "Approved (week)", value: approvedThisWeek, icon: <CheckCircle2 className="h-4 w-4" />, accent: "success" as const },
          { label: "Held", value: heldCount, icon: <PauseCircle className="h-4 w-4" />, accent: "warning" as const },
          { label: "Rejected", value: rejectedCount, icon: <XCircle className="h-4 w-4" />, accent: "danger" as const },
          { label: "Avg Approval (hrs)", value: avgHrs, icon: <Sparkles className="h-4 w-4" />, accent: "default" as const },
        ]
      : [
          { label: "Pending Manager Reqs", value: all.filter((a) => a.submittedRole !== "alliance_executive" && (a.status === "Pending" || a.status === "Resubmitted")).length, icon: <Clock className="h-4 w-4" />, accent: "info" as const },
          { label: "Pending Exec Reqs", value: all.filter((a) => a.submittedRole === "alliance_executive" && (a.status === "Pending" || a.status === "Resubmitted")).length, icon: <Clock className="h-4 w-4" />, accent: "info" as const },
          { label: "Held Cases", value: heldCount, icon: <PauseCircle className="h-4 w-4" />, accent: "warning" as const },
          { label: "Total Approved ₹", value: `₹${(totalApprovedAmount/1000).toFixed(0)}k`, icon: <CheckCircle2 className="h-4 w-4" />, accent: "success" as const },
          { label: "Overrides", value: overridesCount, icon: <ShieldAlert className="h-4 w-4" />, accent: "danger" as const },
        ],
  ][0];

  const accentRing = (a: string) =>
    a === "danger" ? "border-l-destructive" :
    a === "warning" ? "border-l-warning" :
    a === "success" ? "border-l-success" :
    a === "info" ? "border-l-info" : "border-l-primary";

  // ── Action menu per row ──
  const rowActions = (req: ApprovalRequest) => {
    const canAct = (isMgr && req.currentApproverRole === "alliance_manager" && (req.status === "Pending" || req.status === "Resubmitted" || req.status === "Hold"))
      || (isAdmin && (req.status === "Pending" || req.status === "Resubmitted" || req.status === "Hold"));
    const showOverride = isAdmin && (req.status === "Approved" || req.status === "Rejected" || req.status === "Hold");
    const canResubmit = isExec && req.submittedBy === userId && req.status === "Rejected";
    return (
      <div className="flex items-center gap-1 flex-wrap justify-end">
        {canAct && (
          <>
            <Button size="sm" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setActionTarget({ req, action: "Approve" }); }}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setActionTarget({ req, action: "Hold" }); }}>
              <PauseCircle className="h-3 w-3 mr-1" /> Hold
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/40 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setActionTarget({ req, action: "Reject" }); }}>
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </>
        )}
        {showOverride && (
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setActionTarget({ req, action: "Override" }); }}>
            <ShieldAlert className="h-3 w-3 mr-1" /> Override
          </Button>
        )}
        {canResubmit && (
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setActionTarget({ req, action: "Resubmit" }); }}>
            Resubmit
          </Button>
        )}
      </div>
    );
  };

  const headerTitle = isExec ? "My Requests Tracker" : isMgr ? "Team Approval Queue" : "Global Approval Center";
  const headerSub = isExec
    ? "Track every request you've submitted."
    : isMgr
    ? "Approve, hold or reject your executives' submissions."
    : "Override decisions, approve manager submissions, run bulk actions.";

  // ── Override log (admin only) ──
  const overrideLog = logs.filter((l) => l.action === "Override").slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{headerTitle}</h2>
          <p className="text-xs text-muted-foreground">{headerSub}</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      {/* KPI strip */}
      <div className={cn("grid gap-3 grid-cols-2", isExec ? "lg:grid-cols-4" : "lg:grid-cols-5")}>
        {kpiCards.map((k) => (
          <div key={k.label} className={cn("rounded-xl bg-card p-3 shadow-card border-l-4", accentRing(k.accent))}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <span className="text-muted-foreground">{k.icon}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-card-foreground tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Smart nudge */}
      {urgent > 0 && (isMgr || isAdmin) && (
        <div className="rounded-xl bg-card p-3 shadow-card border-l-4 border-l-destructive flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium">{urgent} urgent approval{urgent === 1 ? "" : "s"} pending since yesterday. Fast approvals improve field productivity.</p>
        </div>
      )}
      {isExec && pending.length === 0 && all.length === 0 && (
        <div className="rounded-xl bg-card p-6 shadow-card text-center text-sm text-muted-foreground italic">
          No requests yet. Submit an expense, task or claim to start.
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl bg-card p-3 shadow-card flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Input className="h-8 text-xs w-44" placeholder="Search title or person…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(["Pending", "Approved", "Rejected", "Hold", "Overridden", "Resubmitted"] as ApprovalStatus[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{selected.size} selected</Badge>
            <Button size="sm" className="h-7 text-[10px]" onClick={() => bulkAct("Approve")}>Bulk Approve</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => bulkAct("Hold")}>Bulk Hold</Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
      </div>

      {/* Queue table */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground sticky top-0">
              <tr>
                {isAdmin && <th className="w-8 p-2"></th>}
                <th className="text-left p-2 font-medium">Request</th>
                <th className="text-left p-2 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left p-2 font-medium">By</th>
                <th className="text-right p-2 font-medium hidden sm:table-cell">Amount</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium hidden md:table-cell">Approver</th>
                <th className="text-left p-2 font-medium hidden lg:table-cell">Aged</th>
                <th className="text-right p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground italic p-6">No pending approvals. Great control.</td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                  {isAdmin && (
                    <td className="p-2">
                      <button onClick={() => toggleSelect(req.id)} aria-label="Select">
                        {selected.has(req.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </td>
                  )}
                  <td className="p-2">
                    <p className="font-medium text-card-foreground">{req.title}</p>
                    {req.notes && <p className="text-[10px] text-muted-foreground line-clamp-1">{req.notes}</p>}
                  </td>
                  <td className="p-2 hidden sm:table-cell"><Badge variant="outline" className="text-[10px]">{req.requestType}</Badge></td>
                  <td className="p-2">
                    <p className="text-xs">{userLabel(req.submittedBy)}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{req.submittedRole.replace("_", " ")}</p>
                  </td>
                  <td className="p-2 hidden sm:table-cell text-right tabular-nums">{req.amount ? `₹${req.amount.toLocaleString()}` : "—"}</td>
                  <td className="p-2"><StatusChip value={req.status} /></td>
                  <td className="p-2 hidden md:table-cell"><span className="text-[10px] capitalize text-muted-foreground">{req.currentApproverRole.replace("_", " ")}</span></td>
                  <td className="p-2 hidden lg:table-cell"><span className="text-[10px] text-muted-foreground">{hoursSince(req.createdAt)}h</span></td>
                  <td className="p-2 text-right">{rowActions(req)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override log (admin/owner) */}
      {isAdmin && overrideLog.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-2 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-foreground" /> Override Log</h4>
          <div className="space-y-1.5">
            {overrideLog.map((l) => {
              const req = all.find((a) => a.id === l.approvalId);
              return (
                <div key={l.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{req?.title ?? l.approvalId}</p>
                    <p className="text-[10px] text-muted-foreground">{l.fromStatus} → {l.toStatus} · {l.comment ?? "no comment"}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">{userLabel(l.actedBy)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Universal action drawer */}
      <Sheet open={!!actionTarget} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {actionTarget?.action === "Approve" && <CheckCircle2 className="h-5 w-5 text-success" />}
              {actionTarget?.action === "Reject" && <XCircle className="h-5 w-5 text-destructive" />}
              {actionTarget?.action === "Hold" && <PauseCircle className="h-5 w-5 text-warning" />}
              {actionTarget?.action === "Override" && <ShieldAlert className="h-5 w-5 text-foreground" />}
              {actionTarget?.action === "Resubmit" && <Sparkles className="h-5 w-5 text-primary" />}
              {actionTarget?.action} Request
            </SheetTitle>
          </SheetHeader>
          {actionTarget && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="font-medium text-sm">{actionTarget.req.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{actionTarget.req.requestType} · {userLabel(actionTarget.req.submittedBy)}</p>
                {actionTarget.req.amount != null && <p className="text-sm font-semibold text-primary mt-1">₹{actionTarget.req.amount.toLocaleString()}</p>}
                {actionTarget.req.notes && <p className="text-xs text-muted-foreground mt-2">{actionTarget.req.notes}</p>}
              </div>

              <div>
                <Label className="text-xs">
                  Comment {(actionTarget.action === "Reject" || actionTarget.action === "Hold" || actionTarget.action === "Override") && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionTarget.action === "Reject" ? "Why is this rejected?" :
                    actionTarget.action === "Hold" ? "What is pending? When to revisit?" :
                    actionTarget.action === "Override" ? "Justification for overriding the decision" :
                    "Optional comment"
                  }
                  className="mt-1 text-sm"
                  rows={3}
                />
              </div>

              {actionTarget.action === "Hold" && (
                <div>
                  <Label className="text-xs">Next review date</Label>
                  <Input type="date" value={holdDate} onChange={(e) => setHoldDate(e.target.value)} className="mt-1" />
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={closeDrawer}>Cancel</Button>
                <Button onClick={submitDrawer}>
                  {actionTarget.action === "Approve" ? "Approve Now" :
                   actionTarget.action === "Reject" ? "Reject with Reason" :
                   actionTarget.action === "Hold" ? "Put on Hold" :
                   actionTarget.action === "Override" ? "Override Decision" :
                   "Resubmit"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Compact dashboard widget — used by manager/exec/admin home pages */
export function PendingApprovalsWidget({ onOpen }: { onOpen?: () => void }) {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const pending = pendingForRole(currentUser.id, currentUser.role);
  const urgent = pending.filter((p) => hoursSince(p.createdAt) >= 24).length;
  const isExec = currentUser.role === "alliance_executive";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left rounded-xl bg-card p-4 shadow-card border-l-4 transition hover:-translate-y-0.5 hover:shadow-md",
        urgent > 0 ? "border-l-destructive" : pending.length > 0 ? "border-l-warning" : "border-l-success"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{isExec ? "My Pending Requests" : "Pending Approvals"}</p>
          <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">{pending.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {pending.length === 0 ? "Great control." : urgent > 0 ? `${urgent} aged 24h+` : "Up to date"}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Receipt className="h-5 w-5" /></div>
      </div>
    </button>
  );
}
