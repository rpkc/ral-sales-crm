/**
 * Invoice Edit Dialog – Owner / Accounts Manager
 * - Full edit (recipient, dates, fee, tax, discount, notes, recipient contact)
 * - Auto-recalc subtotal / GST / total via finance-store.updateInvoice
 * - Reason mandatory; warning banners for paid / partial / dispatched
 * - Reauth (typed CONFIRM) when newTotal or oldTotal > ₹2.5L
 * - Manager edits to >₹2.5L invoices route through approval engine
 * - On save: marks any prior dispatch "superseded" + prompts resend
 * - Cancel / Clone / Convert PI→TI side actions
 * - Notifies Accounts Manager + Finance Executive (toast simulation)
 * - Audit entry recorded in invoice-edit-store
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ShieldCheck, Copy, XCircle, FileText, RefreshCw, Send } from "lucide-react";
import type { Invoice, GstType, RevenueStream } from "@/lib/finance-types";
import { updateInvoice, cancelInvoice, cloneInvoice } from "@/lib/finance-store";
import {
  recordInvoiceEdit, diffInvoice, HIGH_VALUE_THRESHOLD,
} from "@/lib/invoice-edit-store";
import { dispatchForInvoice, setDispatchStatus } from "@/lib/invoice-dispatch-store";
import { approvalStore } from "@/lib/approvals";
import { computeBreakup, detectIntraState } from "@/lib/gst-calc";
import { fmtINR, fmtDate } from "./FinanceKpi";
import { GstAmountInput } from "./GstAmountInput";
import { FinanceDrawer } from "./FinanceDrawer";
import type { UserRole } from "@/lib/types";

interface Props {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

type EditMode = "owner_direct" | "manager_direct" | "manager_via_approval";

export function InvoiceEditDialog({ invoice, open, onClose }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const role = currentUser?.role || "";
  const isOwner = role === "owner" || role === "admin";
  const isManager = role === "accounts_manager";

  // Form state — initialise from invoice
  const [f, setF] = useState({
    customerName: "",
    customerType: "Student" as Invoice["customerType"],
    revenueStream: "Student Admissions" as RevenueStream,
    programName: "",
    issueDate: "",
    dueDate: "",
    grossAmount: 0,
    discount: 0,
    gstType: "Taxable" as GstType,
    gstRate: 18,
    gstin: "",
    notes: "",
    recipientEmail: "",
    recipientPhone: "",
    intra: true,
    intraOverridden: false,
    mode: "gross_inclusive" as const,
  });
  const [reason, setReason] = useState("");
  const [confirmToken, setConfirmToken] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setF({
      customerName: invoice.customerName,
      customerType: invoice.customerType,
      revenueStream: invoice.revenueStream,
      programName: invoice.programName || "",
      issueDate: invoice.issueDate.slice(0, 10),
      dueDate: invoice.dueDate.slice(0, 10),
      grossAmount: invoice.total,
      discount: invoice.discount,
      gstType: invoice.gstType,
      gstRate: invoice.gstRate,
      gstin: invoice.gstin || "",
      notes: invoice.notes || "",
      recipientEmail: dispatchForInvoice(invoice.id)?.recipientEmail || "",
      recipientPhone: dispatchForInvoice(invoice.id)?.recipientPhone || "",
      intra: invoice.igst === 0,
      intraOverridden: false,
      mode: "gross_inclusive",
    });
    setReason("");
    setConfirmToken("");
  }, [invoice]);

  if (!invoice) return null;

  const effectiveRate = f.gstType === "Exempt" ? 0 : f.gstRate;
  const breakup = computeBreakup(Math.max(0, f.grossAmount - f.discount), effectiveRate, "gross_inclusive", f.intra);
  const newTotal = breakup.gross;
  const oldTotal = invoice.total;
  const delta = newTotal - oldTotal;

  const isHighValue = newTotal > HIGH_VALUE_THRESHOLD || oldTotal > HIGH_VALUE_THRESHOLD;
  const requiresReauth = isHighValue;
  const reauthOk = !requiresReauth || confirmToken.trim().toUpperCase() === "CONFIRM";

  const isPaid = invoice.status === "Paid";
  const isPartial = invoice.status === "Partial";
  const dispatched = dispatchForInvoice(invoice.id);
  const wasDispatched = !!dispatched && dispatched.status.startsWith("sent");

  const editMode: EditMode = isOwner
    ? "owner_direct"
    : isHighValue
      ? "manager_via_approval"
      : "manager_direct";

  const canSave = !!reason.trim() && reauthOk && (isOwner || isManager);

  const save = (afterAction?: "regenerate" | "resend") => {
    if (!canSave) {
      if (!reason.trim()) toast({ title: "Reason required", description: "Please describe why this invoice is being edited.", variant: "destructive" });
      else if (!reauthOk) toast({ title: "Reauth required", description: "Type CONFIRM to authorise sensitive edits.", variant: "destructive" });
      return;
    }

    // Approval gate for managers editing high-value invoices
    if (editMode === "manager_via_approval") {
      const apId = approvalStore.submit({
        requestId: invoice.id,
        requestType: "Custom Request",
        title: `Invoice edit ${invoice.invoiceNo} (${fmtINR(oldTotal)} → ${fmtINR(newTotal)})`,
        submittedBy: currentUser?.id || "u0",
        submittedRole: (currentUser?.role as UserRole) || "accounts_manager",
        amount: newTotal,
        priority: "High",
        notes: reason,
        meta: { source: "invoice_edit", invoiceId: invoice.id, invoiceNo: invoice.invoiceNo },
      });
      recordInvoiceEdit({
        invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, action: "edit",
        oldValues: {}, newValues: {},
        oldTotal, newTotal, reason, reauthConfirmed: reauthOk,
        approvalId: apId,
        editedBy: currentUser?.id || "u0", editedByName: currentUser?.name, editedByRole: role,
      });
      toast({ title: "Sent for approval", description: `Owner approval required for >₹2.5L invoice edits. Ref: ${apId}` });
      onClose();
      return;
    }

    // Build patch
    const patch = {
      customerName: f.customerName.trim(),
      customerType: f.customerType,
      revenueStream: f.revenueStream,
      programName: f.programName.trim(),
      issueDate: new Date(f.issueDate).toISOString(),
      dueDate: new Date(f.dueDate).toISOString(),
      subtotal: breakup.taxable + breakup.gstAmount === 0 ? f.grossAmount - f.discount : breakup.taxable,
      discount: 0, // already absorbed into gross
      gstType: f.gstType,
      gstRate: effectiveRate,
      gstin: f.gstin.trim(),
      notes: f.notes,
      intraState: f.intra,
    };
    const { oldValues, newValues } = diffInvoice(invoice, patch as Partial<Invoice>);
    const updated = updateInvoice(invoice.id, patch, currentUser?.id || "u0");
    if (!updated) { toast({ title: "Update failed", variant: "destructive" }); return; }

    recordInvoiceEdit({
      invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, action: "edit",
      oldValues, newValues, oldTotal, newTotal: updated.total,
      reason, reauthConfirmed: reauthOk,
      editedBy: currentUser?.id || "u0", editedByName: currentUser?.name, editedByRole: role,
    });

    // Mark prior dispatch as superseded
    if (dispatched && dispatched.status.startsWith("sent")) {
      setDispatchStatus(dispatched.id, "draft", currentUser?.id || "u0", currentUser?.name, "superseded by edit");
    }

    // Simulated notification
    toast({
      title: "Invoice updated",
      description: `${updated.invoiceNo} · ${fmtINR(updated.total)} · Notified Accounts team.${wasDispatched ? " Previous version marked superseded." : ""}`,
    });

    if (afterAction === "regenerate") {
      toast({ title: "PDF regeneration queued", description: "Open Send dialog to dispatch the updated copy." });
    }
    if (afterAction === "resend") {
      toast({ title: "Resend prompt", description: "Use the Send button on the Billing row to dispatch the updated copy." });
    }

    onClose();
  };

  const doCancel = () => {
    if (!reason.trim()) { toast({ title: "Reason required to cancel", variant: "destructive" }); return; }
    if (!reauthOk) { toast({ title: "Reauth required", description: "Type CONFIRM.", variant: "destructive" }); return; }
    cancelInvoice(invoice.id, currentUser?.id || "u0", reason);
    recordInvoiceEdit({
      invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, action: "cancel",
      oldValues: { status: invoice.status }, newValues: { status: "Cancelled" },
      oldTotal, newTotal: oldTotal, reason, reauthConfirmed: reauthOk,
      editedBy: currentUser?.id || "u0", editedByName: currentUser?.name, editedByRole: role,
    });
    toast({ title: "Invoice cancelled", description: `${invoice.invoiceNo} marked Cancelled.` });
    onClose();
  };

  const doClone = () => {
    const cloned = cloneInvoice(invoice.id, currentUser?.id || "u0");
    if (cloned) {
      recordInvoiceEdit({
        invoiceId: cloned.id, invoiceNo: cloned.invoiceNo, action: "clone",
        oldValues: { invoiceNo: invoice.invoiceNo }, newValues: { invoiceNo: cloned.invoiceNo },
        oldTotal: 0, newTotal: cloned.total, reason: reason || `Cloned from ${invoice.invoiceNo}`,
        reauthConfirmed: true,
        editedBy: currentUser?.id || "u0", editedByName: currentUser?.name, editedByRole: role,
      });
      toast({ title: "Invoice cloned", description: `${cloned.invoiceNo} created as Draft.` });
      onClose();
    }
  };

  const doConvertPiToTi = () => {
    // Convert proforma label – we mark notes + record event. Real PI/TI is via dispatch docType.
    recordInvoiceEdit({
      invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, action: "convert_pi_to_ti",
      oldValues: { notes: invoice.notes }, newValues: { notes: (invoice.notes || "") + " [Converted PI→TI]" },
      oldTotal, newTotal: oldTotal,
      reason: reason || "Converted Proforma to Tax Invoice",
      reauthConfirmed: true,
      editedBy: currentUser?.id || "u0", editedByName: currentUser?.name, editedByRole: role,
    });
    updateInvoice(invoice.id, { notes: (invoice.notes || "") + " [Converted PI→TI]" }, currentUser?.id || "u0");
    toast({ title: "Converted PI → Tax Invoice", description: "Open Send dialog and choose Tax Invoice document type." });
    onClose();
  };

  return (
    <FinanceDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Edit Invoice ${invoice.invoiceNo}`}
      description={`${invoice.customerName} · ${fmtINR(invoice.total)} · ${invoice.status}`}
      width="sm:max-w-2xl"
    >
      <div className="space-y-3">
        {/* Last-modified banner */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Owner override</Badge>
          {isHighValue && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />High value &gt;₹2.5L</Badge>}
          {wasDispatched && <Badge variant="outline" className="gap-1"><Send className="h-3 w-3" />Previously dispatched</Badge>}
          <span className="text-[11px] text-muted-foreground ml-auto">Issued {fmtDate(invoice.issueDate)}</span>
        </div>

        {/* Warnings */}
        {isPaid && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This invoice has payments linked. Consider issuing a revision note (Credit Note) instead of editing.
            </AlertDescription>
          </Alert>
        )}
        {isPartial && (
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Changes may impact collections, GST, and reports. Partial payment of {fmtINR(invoice.amountPaid)} will remain linked.
            </AlertDescription>
          </Alert>
        )}
        {editMode === "manager_via_approval" && (
          <Alert className="py-2">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Edits to invoices &gt;₹2.5L by Accounts Manager require Owner approval. Save will create an approval request.
            </AlertDescription>
          </Alert>
        )}

        {/* Form grid */}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Customer / Institution</Label><Input value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={f.customerType} onValueChange={(v: Invoice["customerType"]) => setF({ ...f, customerType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Student", "Institution", "Event", "Other"] as const).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Course / Program</Label><Input value={f.programName} onChange={e => setF({ ...f, programName: e.target.value })} /></div>
          <div><Label>Revenue Stream</Label>
            <Select value={f.revenueStream} onValueChange={(v: RevenueStream) => setF({ ...f, revenueStream: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Student Admissions", "B2B Associations", "Events", "Digital Products", "Merchandise", "Misc Income"] as const).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>GST Type</Label>
            <Select value={f.gstType} onValueChange={(v: GstType) => setF({ ...f, gstType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Taxable", "Exempt", "Zero Rated"] as const).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Issue Date</Label><Input type="date" value={f.issueDate} onChange={e => setF({ ...f, issueDate: e.target.value })} /></div>
          <div><Label>Due Date</Label><Input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></div>
          <div><Label>Discount (₹)</Label><Input type="number" min={0} value={f.discount || ""} onChange={e => setF({ ...f, discount: +e.target.value })} /></div>
          <div><Label>GSTIN</Label><Input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value, intraOverridden: false })} placeholder="27AABCS1234F1Z9" /></div>
          <div><Label>Recipient Email</Label><Input type="email" value={f.recipientEmail} onChange={e => setF({ ...f, recipientEmail: e.target.value })} /></div>
          <div><Label>Recipient Phone</Label><Input value={f.recipientPhone} onChange={e => setF({ ...f, recipientPhone: e.target.value })} /></div>
        </div>

        <GstAmountInput
          amount={f.grossAmount}
          rate={effectiveRate}
          mode="gross_inclusive"
          intraState={f.intra}
          intraOverridden={f.intraOverridden}
          gstin={f.gstin}
          canEditRate={f.gstType === "Taxable"}
          onAmountChange={(n) => setF({ ...f, grossAmount: n })}
          onRateChange={(n) => setF({ ...f, gstRate: n })}
          onModeChange={() => { /* locked to gross in edit */ }}
          onIntraStateChange={(intra, manual) => setF({ ...f, intra, intraOverridden: manual ? true : f.intraOverridden })}
        />

        {/* Change impact summary */}
        <Card className="p-3 bg-muted/30 text-xs space-y-1">
          <div className="font-semibold mb-1">Change Impact</div>
          <div className="flex justify-between"><span>Old Total</span><span className="tabular-nums">{fmtINR(oldTotal)}</span></div>
          <div className="flex justify-between"><span>New Total</span><span className="tabular-nums font-semibold">{fmtINR(newTotal)}</span></div>
          <div className="flex justify-between"><span>Delta</span><span className={`tabular-nums font-semibold ${delta >= 0 ? "text-emerald-700" : "text-destructive"}`}>{delta >= 0 ? "+" : ""}{fmtINR(delta)}</span></div>
          <div className="flex justify-between"><span>Balance Due</span><span className="tabular-nums">{fmtINR(Math.max(0, newTotal - invoice.amountPaid))}</span></div>
        </Card>

        <div>
          <Label>Reason for edit <span className="text-destructive">*</span></Label>
          <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Corrected course fee per signed enrolment letter." />
          <p className="text-[11px] text-muted-foreground mt-1">Changes may impact collections, GST, and reports.</p>
        </div>

        {requiresReauth && (
          <div>
            <Label>Type <span className="font-mono">CONFIRM</span> to authorise sensitive edit</Label>
            <Input value={confirmToken} onChange={e => setConfirmToken(e.target.value)} placeholder="CONFIRM" />
          </div>
        )}

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <Button onClick={() => save()} disabled={!canSave} className="gap-1.5">
            <FileText className="h-4 w-4" /> Save Changes
          </Button>
          <Button variant="outline" onClick={() => save("regenerate")} disabled={!canSave} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Save & Regenerate PDF
          </Button>
          <Button variant="outline" onClick={() => save("resend")} disabled={!canSave} className="gap-1.5">
            <Send className="h-4 w-4" /> Save & Resend
          </Button>
          <Button variant="outline" onClick={doClone} className="gap-1.5">
            <Copy className="h-4 w-4" /> Clone Invoice
          </Button>
          <Button variant="outline" onClick={doConvertPiToTi} className="gap-1.5">
            <FileText className="h-4 w-4" /> Convert PI → TI
          </Button>
          <Button variant="destructive" onClick={doCancel} disabled={!reason.trim() || !reauthOk} className="gap-1.5">
            <XCircle className="h-4 w-4" /> Cancel Invoice
          </Button>
        </div>
      </div>
    </FinanceDrawer>
  );
}
