/**
 * Universal Approval Engine — Industry Alliances
 * Hierarchical workflow: Executive → Manager → Admin/Owner.
 * Reusable across expenses, tasks, reimbursements, and any future request type.
 *
 * Storage: localStorage (mock store, consistent with rest of Alliance module).
 */
import type { UserRole } from "./types";

export type ApprovalRequestType =
  | "Expense Bill"
  | "Task Completion"
  | "Task Extension"
  | "Travel Reimbursement"
  | "Visit Claim"
  | "Custom Request"
  | "Proposal Approval";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Hold" | "Overridden" | "Resubmitted";
export type ApprovalAction = "Approve" | "Reject" | "Hold" | "Override" | "Submit" | "Resubmit";
export type ApprovalPriority = "Low" | "Medium" | "High" | "Urgent";

export interface ApprovalRequest {
  id: string;
  requestId: string;        // referenced source record id (e.g. expense id)
  requestType: ApprovalRequestType;
  title: string;            // short label, e.g. "Travel ₹1,500 — Sneha"
  submittedBy: string;      // user id
  submittedRole: UserRole;
  currentApproverId?: string;
  currentApproverRole: UserRole; // who can act now
  status: ApprovalStatus;
  priority: ApprovalPriority;
  amount?: number;
  notes?: string;
  meta?: Record<string, unknown>;
  nextReviewDate?: string;  // for "Hold"
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalLog {
  id: string;
  approvalId: string;
  action: ApprovalAction;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  actedBy: string;
  actedRole: UserRole;
  comment?: string;
  timestamp: string;
}

const KEYS = {
  approvals: "alliance_approvals",
  logs: "alliance_approval_logs",
} as const;

function load<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* noop */ }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }
const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().split("T")[0];

// ── Hierarchy resolution (Executive → Manager → Admin/Owner) ──
export function resolveNextApproverRole(submittedRole: UserRole): UserRole {
  if (submittedRole === "alliance_executive") return "alliance_manager";
  // Managers (any flavour) escalate up to admin/owner tier
  if (submittedRole === "alliance_manager" || submittedRole === "marketing_manager" || submittedRole === "telecalling_manager") return "admin";
  return "admin";
}

export function canApprove(actorRole: UserRole, request: ApprovalRequest): boolean {
  if (request.status !== "Pending" && request.status !== "Resubmitted" && request.status !== "Hold") return false;
  if (actorRole === "admin" || actorRole === "owner") return true; // can act on anything
  return actorRole === request.currentApproverRole;
}

export function canOverride(actorRole: UserRole): boolean {
  return actorRole === "admin" || actorRole === "owner";
}

// ── Demo seed ──
function seedApprovals(): ApprovalRequest[] {
  const t = todayIso();
  return [
    { id: "ap1", requestId: "ex3", requestType: "Expense Bill", title: "Print Material ₹1,200 — Karan", submittedBy: "ae2", submittedRole: "alliance_executive", currentApproverRole: "alliance_manager", currentApproverId: "am1", status: "Pending", priority: "Medium", amount: 1200, createdAt: t, updatedAt: t, notes: "Brochures for Heritage IT visit." },
    { id: "ap2", requestId: "ex4", requestType: "Travel Reimbursement", title: "Travel ₹1,500 — Pooja", submittedBy: "ae3", submittedRole: "alliance_executive", currentApproverRole: "alliance_manager", currentApproverId: "am1", status: "Pending", priority: "High", amount: 1500, createdAt: t, updatedAt: t, notes: "Long-distance fuel." },
    { id: "ap3", requestId: "tk2", requestType: "Task Extension", title: "Extend follow-up — Sneha", submittedBy: "ae1", submittedRole: "alliance_executive", currentApproverRole: "alliance_manager", currentApproverId: "am1", status: "Hold", priority: "Low", createdAt: t, updatedAt: t, notes: "Awaiting client response.", nextReviewDate: t },
    { id: "ap4", requestId: "mgr-budget-1", requestType: "Custom Request", title: "Q2 marketing budget uplift", submittedBy: "am1", submittedRole: "alliance_manager", currentApproverRole: "admin", status: "Pending", priority: "High", amount: 75000, createdAt: t, updatedAt: t, notes: "Additional ₹75k for North Bengal sweep." },
  ];
}

function seedLogs(): ApprovalLog[] {
  const t = nowIso();
  return [
    { id: "lg1", approvalId: "ap1", action: "Submit", fromStatus: "Pending", toStatus: "Pending", actedBy: "ae2", actedRole: "alliance_executive", timestamp: t },
    { id: "lg2", approvalId: "ap2", action: "Submit", fromStatus: "Pending", toStatus: "Pending", actedBy: "ae3", actedRole: "alliance_executive", timestamp: t },
    { id: "lg3", approvalId: "ap3", action: "Submit", fromStatus: "Pending", toStatus: "Pending", actedBy: "ae1", actedRole: "alliance_executive", timestamp: t },
    { id: "lg4", approvalId: "ap3", action: "Hold", fromStatus: "Pending", toStatus: "Hold", actedBy: "am1", actedRole: "alliance_manager", comment: "Awaiting client response", timestamp: t },
    { id: "lg5", approvalId: "ap4", action: "Submit", fromStatus: "Pending", toStatus: "Pending", actedBy: "am1", actedRole: "alliance_manager", timestamp: t },
  ];
}

// ── Store ──
export const approvalStore = {
  list: (): ApprovalRequest[] => load(KEYS.approvals, seedApprovals()),
  saveAll: (d: ApprovalRequest[]) => save(KEYS.approvals, d),
  logs: (): ApprovalLog[] => load(KEYS.logs, seedLogs()),
  saveLogs: (d: ApprovalLog[]) => save(KEYS.logs, d),

  /** Create a new approval routed to the right approver. Returns id. */
  submit(input: {
    requestId: string;
    requestType: ApprovalRequestType;
    title: string;
    submittedBy: string;
    submittedRole: UserRole;
    amount?: number;
    priority?: ApprovalPriority;
    notes?: string;
    meta?: Record<string, unknown>;
  }): string {
    const all = approvalStore.list();
    // Prevent duplicate active approval for same source record + type
    const existing = all.find((a) => a.requestId === input.requestId && a.requestType === input.requestType && a.status !== "Approved" && a.status !== "Rejected");
    if (existing) return existing.id;

    const id = `ap${Date.now()}`;
    const approverRole = resolveNextApproverRole(input.submittedRole);
    const req: ApprovalRequest = {
      id,
      requestId: input.requestId,
      requestType: input.requestType,
      title: input.title,
      submittedBy: input.submittedBy,
      submittedRole: input.submittedRole,
      currentApproverRole: approverRole,
      currentApproverId: approverRole === "alliance_manager" ? "am1" : undefined,
      status: "Pending",
      priority: input.priority ?? "Medium",
      amount: input.amount,
      notes: input.notes,
      meta: input.meta,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    approvalStore.saveAll([req, ...all]);
    approvalStore.appendLog({
      approvalId: id, action: "Submit", fromStatus: "Pending", toStatus: "Pending",
      actedBy: input.submittedBy, actedRole: input.submittedRole,
    });
    return id;
  },

  /** Apply an action. Returns updated request or null. */
  act(approvalId: string, params: {
    action: Exclude<ApprovalAction, "Submit">;
    actorId: string;
    actorRole: UserRole;
    comment?: string;
    nextReviewDate?: string;
  }): ApprovalRequest | null {
    const all = approvalStore.list();
    const idx = all.findIndex((a) => a.id === approvalId);
    if (idx === -1) return null;
    const cur = all[idx];
    let next: ApprovalStatus = cur.status;
    let nextApproverRole = cur.currentApproverRole;
    const isOverride = params.action === "Override";

    // Authorisation
    if (isOverride && !canOverride(params.actorRole)) return null;
    if (!isOverride && !canApprove(params.actorRole, cur)) return null;

    if (params.action === "Approve") next = "Approved";
    else if (params.action === "Reject") next = "Rejected";
    else if (params.action === "Hold") next = "Hold";
    else if (params.action === "Override") next = "Overridden";
    else if (params.action === "Resubmit") {
      next = "Resubmitted";
      nextApproverRole = resolveNextApproverRole(cur.submittedRole);
    }

    const updated: ApprovalRequest = {
      ...cur,
      status: next,
      currentApproverRole: nextApproverRole,
      nextReviewDate: params.action === "Hold" ? params.nextReviewDate : undefined,
      updatedAt: nowIso(),
    };
    all[idx] = updated;
    approvalStore.saveAll(all);
    approvalStore.appendLog({
      approvalId, action: params.action, fromStatus: cur.status, toStatus: next,
      actedBy: params.actorId, actedRole: params.actorRole, comment: params.comment,
    });
    return updated;
  },

  appendLog(input: { approvalId: string; action: ApprovalAction; fromStatus: ApprovalStatus; toStatus: ApprovalStatus; actedBy: string; actedRole: UserRole; comment?: string }) {
    const logs = approvalStore.logs();
    const log: ApprovalLog = {
      id: `lg${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      approvalId: input.approvalId,
      action: input.action,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actedBy: input.actedBy,
      actedRole: input.actedRole,
      comment: input.comment,
      timestamp: nowIso(),
    };
    approvalStore.saveLogs([log, ...logs]);
  },

  reset: () => { localStorage.removeItem(KEYS.approvals); localStorage.removeItem(KEYS.logs); },
};

// ── Scoped queries ──
export function approvalsForActor(actorId: string, actorRole: UserRole): ApprovalRequest[] {
  const all = approvalStore.list();
  if (actorRole === "admin" || actorRole === "owner") return all;
  if (actorRole === "alliance_manager") {
    // Manager sees pending items routed to them + their own submissions
    return all.filter((a) => a.currentApproverRole === "alliance_manager" || a.submittedBy === actorId);
  }
  // Executives only see what they submitted
  return all.filter((a) => a.submittedBy === actorId);
}

export function pendingForRole(actorId: string, actorRole: UserRole): ApprovalRequest[] {
  const all = approvalStore.list();
  if (actorRole === "alliance_manager") {
    return all.filter((a) => a.currentApproverRole === "alliance_manager" && (a.status === "Pending" || a.status === "Resubmitted"));
  }
  if (actorRole === "admin" || actorRole === "owner") {
    return all.filter((a) => a.status === "Pending" || a.status === "Resubmitted");
  }
  return all.filter((a) => a.submittedBy === actorId && (a.status === "Pending" || a.status === "Resubmitted" || a.status === "Hold"));
}

export function avgApprovalHours(items: ApprovalRequest[]): number {
  const closed = items.filter((a) => a.status === "Approved" || a.status === "Rejected");
  if (!closed.length) return 0;
  const total = closed.reduce((s, a) => s + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()), 0);
  return Math.round(total / closed.length / 3600000);
}

export function hoursSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}
