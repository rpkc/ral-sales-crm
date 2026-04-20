/**
 * Global Approval Center page — for admin/owner override authority.
 * Reuses the universal ApprovalCenter component.
 */
import { ApprovalCenter } from "@/components/alliance/ApprovalCenter";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Approval Center</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Global authority over all alliance approvals — override, bulk-act, audit.</p>
      </div>
      <ApprovalCenter />
    </div>
  );
}
