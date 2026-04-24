/**
 * Counselor "Students with PI Pending" widget
 * Shows open Proforma Invoices for students assigned to the logged-in counselor.
 * Click → drilldown drawer with quick actions.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Bell, ExternalLink, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getFinance, subscribeFinance } from "@/lib/finance-store";
import { getPiPendingForCounselor, summarizePiPending, type PiPendingRow } from "@/lib/pi-helpers";
import { fmtINR } from "@/components/finance/FinanceKpi";

interface Props {
  counselorId: string;
  studentNames: string[];
}

function useFinanceTick() {
  return useSyncExternalStore(subscribeFinance, getFinance, getFinance);
}

export function PiPendingWidget({ counselorId, studentNames }: Props) {
  useFinanceTick(); // re-render on finance store updates
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const rows = useMemo(
    () => getPiPendingForCounselor(counselorId, studentNames),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counselorId, studentNames.join("|")],
  );
  const summary = useMemo(() => summarizePiPending(rows), [rows]);

  const isEmpty = rows.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => !isEmpty && setOpen(true)}
        className={`text-left rounded-xl bg-card p-4 shadow-card transition-shadow ${
          isEmpty ? "cursor-default" : "hover:shadow-card-hover cursor-pointer"
        } border-l-4 border-l-warning`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-warning" />
              <p className="text-xs font-medium text-muted-foreground">Students with PI Pending</p>
              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">PI</Badge>
            </div>
            {isEmpty ? (
              <>
                <p className="mt-1 text-base font-semibold text-card-foreground">No PI pending</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">All assigned students are clear or no PI issued.</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">{summary.pendingStudents}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {fmtINR(summary.totalOpenBalance)} open ·
                  {summary.dueTodayCount > 0 && <span className="text-warning"> {summary.dueTodayCount} due today ·</span>}
                  {summary.overdueCount > 0 && <span className="text-destructive"> {summary.overdueCount} overdue</span>}
                  {summary.dueTodayCount === 0 && summary.overdueCount === 0 && <span> on track</span>}
                </p>
              </>
            )}
          </div>
          {!isEmpty && summary.overdueCount > 0 && (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          )}
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" />
              Students with PI Pending
              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                {rows.length} {rows.length === 1 ? "PI" : "PIs"}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <PiRow key={row.invoice.id} row={row} onView={() => { navigate("/accounts"); setOpen(false); }} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PiRow({ row, onView }: { row: PiPendingRow; onView: () => void }) {
  const sendReminder = () => {
    toast.success(`Reminder queued for ${row.studentName}`, {
      description: `${row.piNo} · ${fmtINR(row.openBalance)} pending`,
    });
  };

  const callStudent = () => {
    toast.info(`Calling ${row.studentName}…`, { description: "Opening dialer (mock)." });
  };

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-card-foreground truncate">{row.studentName}</p>
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
              {row.piNo}
            </Badge>
            {row.daysOverdue > 0 && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                {row.daysOverdue}d overdue
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.course} · Due {new Date(row.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </p>
          <p className="text-xs text-card-foreground mt-1 tabular-nums">
            <span className="text-muted-foreground">Open balance:</span>{" "}
            <span className="font-semibold">{fmtINR(row.openBalance)}</span>
            <span className="text-muted-foreground"> of {fmtINR(row.amount)}</span>
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={callStudent}>
          <Phone className="h-3 w-3 mr-1" /> Call
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sendReminder}>
          <Bell className="h-3 w-3 mr-1" /> Send reminder
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onView}>
          <ExternalLink className="h-3 w-3 mr-1" /> View PI
        </Button>
      </div>
    </div>
  );
}
