import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, Mail, MessageCircle, FileImage, FileText, ShieldCheck, AlertTriangle, Loader2, Send, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import type { Invoice } from "@/lib/finance-types";
import {
  DOC_TYPE_LABELS, registerDispatch, recordSend, attachApproval, dispatchForInvoice,
  type InvoiceDocType, type DispatchFormat, type InvoiceDispatch,
} from "@/lib/invoice-dispatch-store";
import { renderInvoiceFile, downloadBlob } from "@/lib/invoice-generator";
import { InvoiceDocument } from "./InvoiceDocument";
import { approvalStore } from "@/lib/approvals";
import type { UserRole } from "@/lib/types";
import { fmtINR } from "./FinanceKpi";

const APPROVAL_THRESHOLD = 100000; // ₹1 L

interface Props {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

const DOC_TYPES: InvoiceDocType[] = [
  "proforma_invoice", "tax_invoice", "receipt_voucher",
  "fee_demand_note", "quotation", "credit_note", "debit_note",
];

function defaultDocType(inv: Invoice): InvoiceDocType {
  if (inv.amountPaid >= inv.total && inv.total > 0) return "receipt_voucher";
  if (inv.status === "Draft") return "proforma_invoice";
  return "tax_invoice";
}

function emailSubject(t: InvoiceDocType, no: string) {
  const map: Partial<Record<InvoiceDocType, string>> = {
    proforma_invoice: `Proforma Invoice ${no} from Red Apple Learning`,
    tax_invoice: `Tax Invoice ${no} from Red Apple Learning`,
    receipt_voucher: `Payment Receipt ${no}`,
    fee_demand_note: `Fee Demand Note ${no}`,
    quotation: `Quotation ${no} from Red Apple Learning`,
  };
  return map[t] ?? `${DOC_TYPE_LABELS[t]} ${no} from Red Apple Learning`;
}

function whatsappBody(t: InvoiceDocType, no: string, name: string, total: number, due?: string) {
  if (t === "fee_demand_note") return `Reminder: Invoice ${no} due on ${due ?? "the due date"}. Kindly pay to avoid delay.`;
  if (t === "receipt_voucher") return `Dear ${name}, payment receipt ${no} (${fmtINR(total)}) is attached. Thank you!`;
  return `Dear ${name}, your ${DOC_TYPE_LABELS[t]} ${no} is attached. Amount: ${fmtINR(total)}.`;
}

function actorRoleHas(role: string, perms: UserRole[]): boolean {
  return perms.includes(role as UserRole);
}

const CAN_GENERATE: UserRole[] = ["owner", "admin", "accounts_manager", "accounts_executive"];
const CAN_APPROVE_DISPATCH: UserRole[] = ["owner", "accounts_manager", "admin"];

export function InvoiceDispatchDialog({ invoice, open, onClose }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const [docType, setDocType] = useState<InvoiceDocType>("tax_invoice");
  const [format, setFormat] = useState<DispatchFormat>("pdf");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "download" | "email" | "whatsapp" | "approve">(null);
  const [tab, setTab] = useState("preview");

  const role = (currentUser?.role || "accounts_executive") as UserRole;
  const canGenerate = actorRoleHas(role, CAN_GENERATE);
  const requiresApproval = (invoice?.total ?? 0) > APPROVAL_THRESHOLD;
  const existing: InvoiceDispatch | undefined = invoice ? dispatchForInvoice(invoice.id) : undefined;
  const isApproved = !requiresApproval || (existing?.approvalId && approvalStore.list().find(a => a.id === existing.approvalId)?.status === "Approved");

  useEffect(() => {
    if (!invoice) return;
    setDocType(defaultDocType(invoice));
    setFormat("pdf");
    setRecipientEmail(`${invoice.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`);
    setRecipientPhone("+91 98xxxxxx00");
    setTab("preview");
  }, [invoice?.id]);

  useEffect(() => {
    if (!invoice) return;
    const docNo = invoice.invoiceNo;
    setSubject(emailSubject(docType, docNo));
    setBody(`Dear ${invoice.customerName},\n\nPlease find attached your ${DOC_TYPE_LABELS[docType]} ${docNo} for ${fmtINR(invoice.total)}.\nFor any clarification reply to this email.\n\nWarm regards,\nRed Apple Learning Accounts`);
    setWaMessage(whatsappBody(docType, docNo, invoice.customerName, invoice.total, new Date(invoice.dueDate).toLocaleDateString("en-IN")));
  }, [docType, invoice?.id]);

  if (!invoice) return null;

  const generate = async (): Promise<InvoiceDispatch | null> => {
    if (!previewRef.current) return null;
    setBusy("generate");
    try {
      await renderInvoiceFile(previewRef.current, invoice.invoiceNo, format);
      const dsp = registerDispatch({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        docType,
        recipientName: invoice.customerName,
        recipientEmail,
        recipientPhone,
        amount: invoice.total,
        format,
        by: currentUser?.id || "u0",
        byName: currentUser?.name,
      });
      toast({ title: `${DOC_TYPE_LABELS[docType]} generated`, description: `Stored at ${dsp.vaultPath}` });
      return dsp;
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Could not render the document.", variant: "destructive" });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const ensureDispatch = async (): Promise<InvoiceDispatch | null> => {
    return existing ?? (await generate());
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setBusy("download");
    try {
      const { blob } = await renderInvoiceFile(previewRef.current, invoice.invoiceNo, format);
      downloadBlob(blob, `${invoice.invoiceNo}.${format === "pdf" ? "pdf" : "jpg"}`);
      const dsp = await ensureDispatch();
      if (dsp) {
        recordSend({ id: dsp.id, channel: "download", by: currentUser?.id || "u0", byName: currentUser?.name, success: true });
      }
      toast({ title: "Downloaded", description: `${invoice.invoiceNo}.${format}` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleRequestApproval = () => {
    setBusy("approve");
    try {
      const dsp = existing ?? registerDispatch({
        invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, docType,
        recipientName: invoice.customerName, recipientEmail, recipientPhone,
        amount: invoice.total, format,
        by: currentUser?.id || "u0", byName: currentUser?.name,
        initialStatus: "draft",
      });
      const approvalId = approvalStore.submit({
        requestId: dsp.id,
        requestType: "Invoice Dispatch",
        title: `${DOC_TYPE_LABELS[docType]} ${invoice.invoiceNo} — ${invoice.customerName} (${fmtINR(invoice.total)})`,
        submittedBy: currentUser?.id || "u0",
        submittedRole: role,
        amount: invoice.total,
        priority: invoice.total > 500000 ? "Urgent" : "High",
        notes: `Dispatch via ${tab === "email" ? "Email" : tab === "whatsapp" ? "WhatsApp" : "Email/WhatsApp"} to ${recipientEmail || recipientPhone}.`,
        meta: { invoiceId: invoice.id, dispatchId: dsp.id, docType },
      });
      attachApproval(dsp.id, approvalId);
      toast({ title: "Approval requested", description: `Routed for approval (>₹1L). Manager / owner can act in /approvals.` });
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async (channel: "email" | "whatsapp") => {
    if (requiresApproval && !isApproved) {
      toast({
        title: "Approval required",
        description: `Invoices above ₹1L need manager approval before dispatch.`,
        variant: "destructive",
      });
      return;
    }
    if (channel === "email" && !recipientEmail.trim()) {
      toast({ title: "Recipient email required", variant: "destructive" });
      return;
    }
    if (channel === "whatsapp" && !recipientPhone.trim()) {
      toast({ title: "Recipient phone required", variant: "destructive" });
      return;
    }
    setBusy(channel);
    try {
      const dsp = await ensureDispatch();
      if (!dsp) return;
      await new Promise(r => setTimeout(r, 600));
      recordSend({
        id: dsp.id, channel,
        recipientEmail: channel === "email" ? recipientEmail : undefined,
        recipientPhone: channel === "whatsapp" ? recipientPhone : undefined,
        by: currentUser?.id || "u0", byName: currentUser?.name,
        success: true,
      });
      toast({
        title: channel === "email" ? "Email sent" : "WhatsApp sent",
        description: `${DOC_TYPE_LABELS[docType]} delivered to ${channel === "email" ? recipientEmail : recipientPhone}.`,
      });
    } catch (e: any) {
      toast({ title: "Dispatch failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleMarkSent = async () => {
    const dsp = await ensureDispatch();
    if (!dsp) return;
    recordSend({ id: dsp.id, channel: "manual", by: currentUser?.id || "u0", byName: currentUser?.name, success: true });
    toast({ title: "Marked as sent" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate &amp; Dispatch — {invoice.invoiceNo}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>{invoice.customerName} · {fmtINR(invoice.total)}</span>
            {requiresApproval && (
              <Badge variant={isApproved ? "default" : "outline"} className={isApproved ? "bg-emerald-600" : "border-amber-400 text-amber-700"}>
                {isApproved ? <><ShieldCheck className="h-3 w-3 mr-1" /> Approved</> : <><AlertTriangle className="h-3 w-3 mr-1" /> Approval required (&gt;₹1L)</>}
              </Badge>
            )}
            {existing && <Badge variant="outline" className="text-[10px]">Last status: {existing.status}</Badge>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-3">
            <Card className="p-3 space-y-3">
              <div>
                <Label className="text-xs">Invoice Type</Label>
                <Select value={docType} onValueChange={(v: any) => setDocType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{DOC_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF (recommended)</SelectItem>
                    <SelectItem value="jpeg">JPEG (image)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={generate} disabled={!canGenerate || !!busy} className="gap-1.5">
                  {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : format === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                  Generate
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload} disabled={!canGenerate || !!busy} className="gap-1.5">
                  {busy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download
                </Button>
              </div>
              {requiresApproval && !isApproved && (
                <Button size="sm" variant="default" onClick={handleRequestApproval} disabled={!!busy} className="w-full gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Request Approval
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleMarkSent} disabled={!!busy} className="w-full gap-1.5">
                <Send className="h-3.5 w-3.5" /> Mark as Sent
              </Button>
            </Card>

            <Card className="p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1 text-foreground font-semibold">
                <Eye className="h-3 w-3" /> Vault path
              </div>
              <code className="block break-all">{existing?.vaultPath || "(generates on first action)"}</code>
              <div className="pt-1 border-t mt-1">Generated by: <b>{currentUser?.name}</b></div>
              {existing && <div>Sent {existing.sendCount}× · last {existing.lastSentAt ? new Date(existing.lastSentAt).toLocaleString() : "—"}</div>}
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3">
              <Card className="p-3 bg-muted/30 overflow-auto" style={{ maxHeight: "60vh" }}>
                <div style={{ transform: "scale(0.7)", transformOrigin: "top left", width: 794 * 0.7 + "px" }}>
                  <InvoiceDocument
                    ref={previewRef}
                    invoice={invoice}
                    docType={docType}
                    recipientEmail={recipientEmail}
                    recipientPhone={recipientPhone}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="mt-3 space-y-3">
              <div>
                <Label>To</Label>
                <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="recipient@example.com" />
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={6} value={body} onChange={e => setBody(e.target.value)} />
              </div>
              <Button onClick={() => handleSend("email")} disabled={!!busy} className="w-full gap-1.5">
                {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Email with {format.toUpperCase()} attached
              </Button>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-3 space-y-3">
              <div>
                <Label>To (phone)</Label>
                <Input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="+91 9xxxxxxxxx" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={6} value={waMessage} onChange={e => setWaMessage(e.target.value)} />
              </div>
              <Button onClick={() => handleSend("whatsapp")} disabled={!!busy} className="w-full gap-1.5">
                {busy === "whatsapp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Send WhatsApp with {format.toUpperCase()}
              </Button>
            </TabsContent>

            <TabsContent value="audit" className="mt-3">
              <Card className="p-3 max-h-[60vh] overflow-y-auto">
                {!existing || existing.audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No dispatch activity yet.</p>
                ) : (
                  <ol className="space-y-2">
                    {existing.audit.map(a => (
                      <li key={a.id} className="text-xs border-l-2 border-primary/40 pl-2">
                        <div className="font-medium">{a.action}{a.channel ? ` · ${a.channel}` : ""}</div>
                        <div className="text-muted-foreground">
                          {new Date(a.at).toLocaleString()} · by {a.byName || a.by}
                          {a.recipientEmail ? ` · ${a.recipientEmail}` : ""}
                          {a.recipientPhone ? ` · ${a.recipientPhone}` : ""}
                          {a.detail ? ` · ${a.detail}` : ""}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
