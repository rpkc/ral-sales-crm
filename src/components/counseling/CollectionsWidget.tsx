/**
 * Counselor Collections widget — top-row card for /counseling.
 * Surfaces today's collections + queue of items needing submission to admin,
 * EMI students with overdue late fees, and verified-collections count.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IndianRupee, Send, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCollections, subscribeCollections, submitToAdmin, computeEmiLateFee,
  getCollectionsByCounselor, type Collection,
} from "@/lib/collection-store";
import { getFinance, subscribeFinance } from "@/lib/finance-store";
import { LogCollectionDialog } from "./LogCollectionDialog";

interface Props {
  counselorId: string;
  studentNames: string[];
  /** Map of student name -> { id, course } for the dialog dropdown */
  students: { id: string; name: string; course: string }[];
}

function useCol() {
  return useSyncExternalStore(subscribeCollections, getCollections, getCollections);
}
function useFin() {
  return useSyncExternalStore(subscribeFinance, getFinance, getFinance);
}

export function CollectionsWidget({ counselorId, students }: Props) {
  useCol();
  const fin = useFin();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const myCollections = useMemo(() => getCollectionsByCounselor(counselorId), [counselorId, getCollections().length]);
  const todayKey = new Date().toDateString();

  const todayCollected = myCollections
    .filter(c => new Date(c.collectedAt).toDateString() === todayKey)
    .reduce((s, c) => s + c.amount, 0);

  const pendingSubmission = myCollections.filter(c => c.status === "Collected");
  const awaitingVerification = myCollections.filter(c => c.status === "Awaiting Verification");
  const verified = myCollections.filter(c => c.status === "Verified" || c.status === "Ready For Invoice" || c.status === "Invoice Generated");

  // EMI students with late fees (mock: relate by customerName match)
  const studentNameSet = new Set(students.map(s => s.name.trim().toLowerCase()));
  const overdueEmis = useMemo(() => {
    const now = Date.now();
    return fin.emiSchedules
      .filter(e => e.status !== "Paid" && new Date(e.dueDate).getTime() < now && studentNameSet.has(e.customerName.trim().toLowerCase()))
      .map(e => ({ emi: e, lateFee: computeEmiLateFee(e.dueDate).fee, days: computeEmiLateFee(e.dueDate).daysOverdue }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fin.emiSchedules, students.length]);

  const lateFeeCollectible = overdueEmis.reduce((s, x) => s + x.lateFee, 0);

  const submitAll = () => {
    pendingSubmission.forEach(c => submitToAdmin(c.id, {
      id: currentUser?.id || "u0", name: currentUser?.name || "Counselor", role: currentUser?.role || "counselor",
    }));
    toast.success(`${pendingSubmission.length} collection${pendingSubmission.length === 1 ? "" : "s"} submitted to admin`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left rounded-xl bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover cursor-pointer border-l-4 border-l-success"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-3.5 w-3.5 text-success" />
              <p className="text-xs font-medium text-muted-foreground">My Collections</p>
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Today</Badge>
            </div>
            <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">
              ₹{todayCollected.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pendingSubmission.length > 0
                ? <span className="text-warning">{pendingSubmission.length} pending submission · </span>
                : null}
              {awaitingVerification.length > 0
                ? <span>{awaitingVerification.length} awaiting verify · </span>
                : null}
              {verified.length > 0 ? <span className="text-success">{verified.length} verified</span> : <span>tap to log</span>}
            </p>
            {lateFeeCollectible > 0 && (
              <p className="text-[11px] text-warning mt-0.5">
                ₹{lateFeeCollectible.toLocaleString("en-IN")} late-fee collectible
              </p>
            )}
          </div>
          {pendingSubmission.length > 0 && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-success" /> My Collections
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { setOpen(false); setLogOpen(true); }} className="flex-1">
              <Plus className="h-3.5 w-3.5 mr-1" /> Log Collection
            </Button>
            {pendingSubmission.length > 0 && (
              <Button size="sm" variant="outline" onClick={submitAll}>
                <Send className="h-3.5 w-3.5 mr-1" /> Submit {pendingSubmission.length}
              </Button>
            )}
          </div>

          <Tabs defaultValue="pending" className="mt-3">
            <TabsList className="grid grid-cols-4 h-8">
              <TabsTrigger value="pending" className="text-xs">Pending ({pendingSubmission.length})</TabsTrigger>
              <TabsTrigger value="awaiting" className="text-xs">Awaiting ({awaitingVerification.length})</TabsTrigger>
              <TabsTrigger value="verified" className="text-xs">Verified ({verified.length})</TabsTrigger>
              <TabsTrigger value="emi" className="text-xs">EMI ({overdueEmis.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-2 space-y-2">
              {pendingSubmission.length === 0
                ? <EmptyState message="Nothing waiting on you." />
                : pendingSubmission.map(c => <CollectionRow key={c.id} c={c} />)}
            </TabsContent>
            <TabsContent value="awaiting" className="mt-2 space-y-2">
              {awaitingVerification.length === 0
                ? <EmptyState message="No items pending admin verification." />
                : awaitingVerification.map(c => <CollectionRow key={c.id} c={c} />)}
            </TabsContent>
            <TabsContent value="verified" className="mt-2 space-y-2">
              {verified.length === 0
                ? <EmptyState message="No verified collections yet." />
                : verified.map(c => <CollectionRow key={c.id} c={c} />)}
            </TabsContent>
            <TabsContent value="emi" className="mt-2 space-y-2">
              {overdueEmis.length === 0
                ? <EmptyState message="No overdue EMIs for your students." />
                : overdueEmis.map(({ emi, lateFee, days }) => (
                    <div key={emi.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{emi.customerName}</p>
                          <p className="text-xs text-muted-foreground">EMI #{emi.installmentNo} · ₹{emi.amount.toLocaleString("en-IN")}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                          +₹{lateFee.toLocaleString("en-IN")} ({days}d)
                        </Badge>
                      </div>
                    </div>
                  ))}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <LogCollectionDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        students={students}
      />
    </>
  );
}

function CollectionRow({ c }: { c: Collection }) {
  const { currentUser } = useAuth();
  const submit = () => {
    submitToAdmin(c.id, {
      id: currentUser?.id || "u0", name: currentUser?.name || "Counselor", role: currentUser?.role || "counselor",
    });
    toast.success(`${c.receiptRef} submitted to admin`);
  };
  const tone =
    c.status === "Collected" ? "bg-warning/10 text-warning border-warning/30" :
    c.status === "Awaiting Verification" ? "bg-primary/10 text-primary border-primary/30" :
    c.status === "Verified" || c.status === "Ready For Invoice" ? "bg-success/10 text-success border-success/30" :
    c.status === "Invoice Generated" ? "bg-success/10 text-success border-success/30" :
    c.status === "Mismatch" ? "bg-destructive/10 text-destructive border-destructive/30" :
    "bg-muted text-muted-foreground border-border";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-card-foreground truncate">{c.studentName}</p>
            <Badge variant="outline" className={`text-[10px] ${tone}`}>{c.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {c.receiptRef} · {c.reason.replace(/_/g, " ")} · {c.mode.toUpperCase()}
          </p>
          <p className="text-xs text-card-foreground mt-1 tabular-nums">
            ₹{c.amount.toLocaleString("en-IN")}
            {c.lateFeeAmount ? <span className="text-warning"> (incl. ₹{c.lateFeeAmount} late fee)</span> : null}
          </p>
        </div>
        {c.status === "Collected" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={submit}>
            <Send className="h-3 w-3 mr-1" /> Submit
          </Button>
        )}
        {c.status === "Verified" || c.status === "Ready For Invoice" ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-1" /> : null}
        {c.status === "Awaiting Verification" ? <Clock className="h-4 w-4 text-primary shrink-0 mt-1" /> : null}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground text-center py-6">{message}</p>;
}
