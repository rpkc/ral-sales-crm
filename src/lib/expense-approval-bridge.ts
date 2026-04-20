/**
 * Expense → Universal Approval Engine bridge.
 * - Routes new expenses through tiered approvers based on amount.
 * - Syncs approval action back to the expense status.
 */
import { approvalStore, type ApprovalRequest } from "./approvals";
import { getFinance, setExpenseStatus } from "./finance-store";
import type { Expense } from "./finance-types";
import type { UserRole } from "./types";

export type ApproverTier = "admin_level_1" | "finance_manager" | "owner_final";

export interface ApprovalTierRule {
  min: number;
  max: number | null;
  tier: ApproverTier;
  approverRole: UserRole;
}

export const EXPENSE_APPROVAL_RULES: ApprovalTierRule[] = [
  { min: 0,     max: 5000,    tier: "admin_level_1",   approverRole: "accounts_executive" },
  { min: 5001,  max: 25000,   tier: "finance_manager", approverRole: "accounts_manager" },
  { min: 25001, max: null,    tier: "owner_final",     approverRole: "owner" },
];

export function tierForAmount(amount: number): ApprovalTierRule {
  const rule = EXPENSE_APPROVAL_RULES.find(r =>
    amount >= r.min && (r.max == null || amount <= r.max)
  );
  if (!rule) throw new Error("Approval level not configured.");
  return rule;
}

/** Submit an expense into the approval engine. Returns approvalId. */
export function submitExpenseForApproval(exp: Expense, submittedBy: string, submittedRole: UserRole): string {
  const rule = tierForAmount(exp.total);
  return approvalStore.submit({
    requestId: exp.id,
    requestType: "Expense Bill",
    title: `${exp.category} ₹${exp.total.toLocaleString("en-IN")} — ${exp.vendorName || exp.description.slice(0, 30)}`,
    submittedBy,
    submittedRole,
    amount: exp.total,
    priority: exp.total > 25000 ? "High" : exp.total > 5000 ? "Medium" : "Low",
    notes: exp.description,
    meta: { tier: rule.tier, approverRole: rule.approverRole, expenseNo: exp.expenseNo },
  });
}

/** Approval-engine action callback: mirror result onto the expense record. */
export function syncApprovalToExpense(req: ApprovalRequest, actorId: string) {
  if (req.requestType !== "Expense Bill") return;
  const exp = getFinance().expenses.find(e => e.id === req.requestId);
  if (!exp) return;
  if (req.status === "Approved") setExpenseStatus(exp.id, "Approved", actorId);
  else if (req.status === "Rejected") setExpenseStatus(exp.id, "Rejected", actorId);
  else if (req.status === "Hold") setExpenseStatus(exp.id, "Hold", actorId);
}

/** Look up the active approval (if any) for a given expense id. */
export function approvalForExpense(expenseId: string): ApprovalRequest | undefined {
  return approvalStore
    .list()
    .find(a => a.requestType === "Expense Bill" && a.requestId === expenseId);
}
