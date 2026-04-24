/**
 * PI/TI Reports Engine
 * 7 reports + CSV / Excel export. Pure derivation from finance-store + pi-ti-store.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileDown, FileText, AlertTriangle, Receipt, ArrowRight, BadgePercent, Layers, Calendar } from "lucide-react";
import { getFinance, subscribeFinance, piOpenBalance, piConvertedAmount } from "@/lib/finance-store";
import { getPiTiMappings, subscribePiTi } from "@/lib/pi-ti-store";
import { fmtINR } from "./FinanceKpi";
import type { Invoice } from "@/lib/finance-types";

function useFin() {
  return useSyncExternalStore(subscribeFinance, getFinance, getFinance);
}
function useMappings() {
  return useSyncExternalStore(subscribePiTi, getPiTiMappings, getPiTiMappings);
}

type ReportKey =
  | "open_pi" | "overdue_pi" | "ti_register" | "conversion"
  | "gst_ti" | "ar_aging" | "daily_collection";

interface ReportDef {
  key: ReportKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const REPORTS: ReportDef[] = [
  { key: "open_pi", label: "Open PI", icon: <FileText className="h-3.5 w-3.5" />, description: "All outstanding Proforma Invoices with open balance." },
  { key: "overdue_pi", label: "Overdue PI", icon: <AlertTriangle className="h-3.5 w-3.5" />, description: "PI past due date, bucketed by aging." },
  { key: "ti_register", label: "TI Sales Register", icon: <Receipt className="h-3.5 w-3.5" />, description: "Tax Invoices issued — sales register for filing." },
  { key: "conversion", label: "PI → TI Conversion", icon: <ArrowRight className="h-3.5 w-3.5" />, description: "Mapping log: which PI converted into which TI, by whom." },
  { key: "gst_ti", label: "GST from TI", icon: <BadgePercent className="h-3.5 w-3.5" />, description: "GST liability summary — TI only (PI excluded)." },
  { key: "ar_aging", label: "AR Aging", icon: <Layers className="h-3.5 w-3.5" />, description: "Receivables aging — PI buckets 0-30/31-60/61-90/90+." },
  { key: "daily_collection", label: "Daily Collection", icon: <Calendar className="h-3.5 w-3.5" />, description: "Today's TI receipts." },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[\",\n]/.test(s) ? `"${s.replace(/\"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadExcel(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export function ReportsTab() {
  const fin = useFin();
  const mappings = useMappings();
  const { toast } = useToast();
  const [active, setActive] = useState<ReportKey>("open_pi");

  const piList = useMemo(() => fin.invoices.filter(i => i.invoiceType === "PI" && i.status !== "Cancelled"), [fin.invoices]);
  const tiList = useMemo(() => fin.invoices.filter(i => i.invoiceType === "TI" && i.status !== "Cancelled"), [fin.invoices]);

  const data = useMemo(() => {
    const now = Date.now();
    switch (active) {
      case "open_pi": {
        const rows = piList.filter(p => piOpenBalance(p.id) > 0).map(p => ({
          "PI #": p.invoiceNo, Recipient: p.customerName, Type: p.customerType,
          Stream: p.revenueStream, Issued: fmtDate(p.issueDate), Due: fmtDate(p.dueDate),
          Total: p.total, Converted: piConvertedAmount(p.id), Open: piOpenBalance(p.id), Status: p.status,
        }));
        return { rows, headers: Object.keys(rows[0] || { "PI #": "", Recipient: "", Type: "", Stream: "", Issued: "", Due: "", Total: 0, Converted: 0, Open: 0, Status: "" }) };
      }
      case "overdue_pi": {
        const rows = piList.filter(p => piOpenBalance(p.id) > 0 && new Date(p.dueDate).getTime() < now).map(p => {
          const days = Math.floor((now - new Date(p.dueDate).getTime()) / 86400000);
          return {
            "PI #": p.invoiceNo, Recipient: p.customerName, Stream: p.revenueStream,
            Due: fmtDate(p.dueDate), "Days Overdue": days, Open: piOpenBalance(p.id),
            Bucket: days < 30 ? "0-30" : days < 60 ? "31-60" : days < 90 ? "61-90" : "90+",
          };
        });
        return { rows, headers: Object.keys(rows[0] || { "PI #": "", Recipient: "", Stream: "", Due: "", "Days Overdue": 0, Open: 0, Bucket: "" }) };
      }
      case "ti_register": {
        const rows = tiList.map(t => ({
          "TI #": t.invoiceNo, "Linked PI": t.linkedPiId ? (fin.invoices.find(i => i.id === t.linkedPiId)?.invoiceNo ?? "—") : "—",
          Recipient: t.customerName, GSTIN: t.gstin || "", Issued: fmtDate(t.issueDate),
          Taxable: t.subtotal - t.discount, CGST: t.cgst, SGST: t.sgst, IGST: t.igst, Total: t.total,
          Paid: t.amountPaid, Status: t.status,
        }));
        return { rows, headers: Object.keys(rows[0] || { "TI #": "", "Linked PI": "", Recipient: "", GSTIN: "", Issued: "", Taxable: 0, CGST: 0, SGST: 0, IGST: 0, Total: 0, Paid: 0, Status: "" }) };
      }
      case "conversion": {
        const rows = mappings.map(m => ({
          "PI #": m.piNo, "TI #": m.tiNo, Student: m.studentName,
          "Linked Amount": m.linkedAmount, Mode: m.mode,
          "Converted On": fmtDate(m.conversionDate), "By": m.convertedByName || m.convertedBy,
          Reason: m.reason || "",
        }));
        return { rows, headers: Object.keys(rows[0] || { "PI #": "", "TI #": "", Student: "", "Linked Amount": 0, Mode: "", "Converted On": "", By: "", Reason: "" }) };
      }
      case "gst_ti": {
        const by = new Map<string, { month: string; gstin: string; taxable: number; cgst: number; sgst: number; igst: number; count: number }>();
        tiList.forEach(t => {
          const month = t.issueDate.slice(0, 7);
          const key = `${month}|${t.gstin || "—"}`;
          const cur = by.get(key) || { month, gstin: t.gstin || "—", taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
          cur.taxable += t.subtotal - t.discount;
          cur.cgst += t.cgst; cur.sgst += t.sgst; cur.igst += t.igst;
          cur.count += 1;
          by.set(key, cur);
        });
        const rows = Array.from(by.values()).map(r => ({
          Month: r.month, GSTIN: r.gstin, Invoices: r.count,
          Taxable: r.taxable, CGST: r.cgst, SGST: r.sgst, IGST: r.igst,
          "Total GST": r.cgst + r.sgst + r.igst,
        }));
        return { rows, headers: Object.keys(rows[0] || { Month: "", GSTIN: "", Invoices: 0, Taxable: 0, CGST: 0, SGST: 0, IGST: 0, "Total GST": 0 }) };
      }
      case "ar_aging": {
        const buckets: Record<string, { count: number; amount: number; rows: Invoice[] }> = {
          "0-30": { count: 0, amount: 0, rows: [] },
          "31-60": { count: 0, amount: 0, rows: [] },
          "61-90": { count: 0, amount: 0, rows: [] },
          "90+":   { count: 0, amount: 0, rows: [] },
        };
        piList.forEach(p => {
          const open = piOpenBalance(p.id);
          if (open <= 0) return;
          const days = Math.floor((now - new Date(p.dueDate).getTime()) / 86400000);
          const k = days < 30 ? "0-30" : days < 60 ? "31-60" : days < 90 ? "61-90" : "90+";
          buckets[k].count += 1; buckets[k].amount += open; buckets[k].rows.push(p);
        });
        const rows = Object.entries(buckets).map(([Bucket, v]) => ({
          Bucket, "PI Count": v.count, "Open Amount": v.amount,
        }));
        return { rows, headers: ["Bucket", "PI Count", "Open Amount"] };
      }
      case "daily_collection": {
        const todayKey = new Date().toDateString();
        const tiIds = new Set(tiList.map(t => t.id));
        const rows = fin.payments
          .filter(p => new Date(p.paidOn).toDateString() === todayKey && (!p.invoiceId || tiIds.has(p.invoiceId)))
          .map(p => ({
            "Receipt #": p.receiptNo, "TI #": p.invoiceId ? (fin.invoices.find(i => i.id === p.invoiceId)?.invoiceNo ?? "—") : "—",
            Customer: p.customerName, Mode: p.mode, Amount: p.amount,
            Reference: p.reference || "", "Paid On": fmtDate(p.paidOn),
          }));
        return { rows, headers: Object.keys(rows[0] || { "Receipt #": "", "TI #": "", Customer: "", Mode: "", Amount: 0, Reference: "", "Paid On": "" }) };
      }
    }
  }, [active, piList, tiList, mappings, fin]);

  const def = REPORTS.find(r => r.key === active)!;
  const total = data.rows.length;
  const totalAmount = data.rows.reduce((s, r) => {
    const candidates = ["Open", "Open Amount", "Total", "Total GST", "Linked Amount", "Amount"];
    for (const k of candidates) {
      const v = (r as Record<string, unknown>)[k];
      if (typeof v === "number") return s + v;
    }
    return s;
  }, 0);

  const onCsv = () => {
    if (!total) { toast({ title: "No rows to export." }); return; }
    const headers = data.headers;
    downloadCsv(`${def.key}-${new Date().toISOString().slice(0, 10)}.csv`,
      [headers, ...data.rows.map(r => headers.map(h => (r as Record<string, unknown>)[h] as string | number))]);
    toast({ title: `${def.label} CSV exported`, description: `${total} rows` });
  };

  const onExcel = async () => {
    if (!total) { toast({ title: "No rows to export." }); return; }
    try {
      await downloadExcel(`${def.key}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        [{ name: def.label, rows: data.rows as Record<string, unknown>[] }]);
      toast({ title: `${def.label} Excel exported`, description: `${total} rows` });
    } catch {
      toast({ title: "Excel export failed", variant: "destructive" });
    }
  };

  const onExcelAll = async () => {
    try {
      const allRows: { name: string; rows: Record<string, unknown>[] }[] = [];
      for (const r of REPORTS) {
        const tmp = computeReport(r.key, fin, mappings, piList, tiList);
        allRows.push({ name: r.label, rows: tmp });
      }
      await downloadExcel(`pi-ti-reports-bundle-${new Date().toISOString().slice(0, 10)}.xlsx`, allRows);
      toast({ title: "All reports exported", description: `${REPORTS.length} sheets` });
    } catch {
      toast({ title: "Bundle export failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">{def.icon} {def.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {total} rows {totalAmount > 0 ? `· ${fmtINR(totalAmount)}` : ""}
            </Badge>
            <Button size="sm" variant="outline" onClick={onCsv} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={onExcel} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" onClick={onExcelAll} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Export All
            </Button>
          </div>
        </div>
      </Card>

      <Tabs value={active} onValueChange={(v) => setActive(v as ReportKey)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {REPORTS.map(r => (
            <TabsTrigger key={r.key} value={r.key} className="text-xs gap-1">
              {r.icon} {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORTS.map(r => (
          <TabsContent key={r.key} value={r.key} className="mt-3">
            <Card className="p-0 overflow-hidden">
              {data.rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No data for this report.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {data.headers.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.slice(0, 100).map((row, i) => (
                        <TableRow key={i}>
                          {data.headers.map(h => {
                            const v = (row as Record<string, unknown>)[h];
                            const isNum = typeof v === "number";
                            const looksLikeMoney = isNum && /Amount|Total|Open|Taxable|CGST|SGST|IGST|GST|Linked|Paid/i.test(h);
                            return (
                              <TableCell key={h} className={`text-xs whitespace-nowrap ${isNum ? "text-right tabular-nums" : ""}`}>
                                {looksLikeMoney ? fmtINR(v as number) : String(v ?? "—")}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data.rows.length > 100 && (
                    <div className="px-4 py-2 text-[11px] text-muted-foreground border-t bg-muted/30">
                      Showing first 100 rows. Export to see all {data.rows.length}.
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Re-usable computation for the bundle export. */
function computeReport(
  key: ReportKey,
  fin: ReturnType<typeof getFinance>,
  mappings: ReturnType<typeof getPiTiMappings>,
  piList: Invoice[],
  tiList: Invoice[],
): Record<string, unknown>[] {
  const now = Date.now();
  switch (key) {
    case "open_pi":
      return piList.filter(p => piOpenBalance(p.id) > 0).map(p => ({
        "PI #": p.invoiceNo, Recipient: p.customerName, Stream: p.revenueStream,
        Issued: fmtDate(p.issueDate), Due: fmtDate(p.dueDate),
        Total: p.total, Converted: piConvertedAmount(p.id), Open: piOpenBalance(p.id),
      }));
    case "overdue_pi":
      return piList.filter(p => piOpenBalance(p.id) > 0 && new Date(p.dueDate).getTime() < now).map(p => {
        const days = Math.floor((now - new Date(p.dueDate).getTime()) / 86400000);
        return {
          "PI #": p.invoiceNo, Recipient: p.customerName, Due: fmtDate(p.dueDate),
          "Days Overdue": days, Open: piOpenBalance(p.id),
          Bucket: days < 30 ? "0-30" : days < 60 ? "31-60" : days < 90 ? "61-90" : "90+",
        };
      });
    case "ti_register":
      return tiList.map(t => ({
        "TI #": t.invoiceNo, Recipient: t.customerName, Issued: fmtDate(t.issueDate),
        Taxable: t.subtotal - t.discount, CGST: t.cgst, SGST: t.sgst, IGST: t.igst,
        Total: t.total, Paid: t.amountPaid, Status: t.status,
      }));
    case "conversion":
      return mappings.map(m => ({
        "PI #": m.piNo, "TI #": m.tiNo, Student: m.studentName,
        "Linked Amount": m.linkedAmount, Mode: m.mode,
        "Converted On": fmtDate(m.conversionDate), By: m.convertedByName || m.convertedBy,
      }));
    case "gst_ti": {
      const by = new Map<string, { month: string; gstin: string; taxable: number; cgst: number; sgst: number; igst: number; count: number }>();
      tiList.forEach(t => {
        const month = t.issueDate.slice(0, 7);
        const key = `${month}|${t.gstin || "—"}`;
        const cur = by.get(key) || { month, gstin: t.gstin || "—", taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
        cur.taxable += t.subtotal - t.discount;
        cur.cgst += t.cgst; cur.sgst += t.sgst; cur.igst += t.igst;
        cur.count += 1;
        by.set(key, cur);
      });
      return Array.from(by.values()).map(r => ({
        Month: r.month, GSTIN: r.gstin, Invoices: r.count,
        Taxable: r.taxable, CGST: r.cgst, SGST: r.sgst, IGST: r.igst,
        "Total GST": r.cgst + r.sgst + r.igst,
      }));
    }
    case "ar_aging": {
      const buckets: Record<string, { count: number; amount: number }> = {
        "0-30": { count: 0, amount: 0 }, "31-60": { count: 0, amount: 0 },
        "61-90": { count: 0, amount: 0 }, "90+": { count: 0, amount: 0 },
      };
      piList.forEach(p => {
        const open = piOpenBalance(p.id);
        if (open <= 0) return;
        const days = Math.floor((now - new Date(p.dueDate).getTime()) / 86400000);
        const k = days < 30 ? "0-30" : days < 60 ? "31-60" : days < 90 ? "61-90" : "90+";
        buckets[k].count += 1; buckets[k].amount += open;
      });
      return Object.entries(buckets).map(([Bucket, v]) => ({ Bucket, "PI Count": v.count, "Open Amount": v.amount }));
    }
    case "daily_collection": {
      const todayKey = new Date().toDateString();
      const tiIds = new Set(tiList.map(t => t.id));
      return fin.payments
        .filter(p => new Date(p.paidOn).toDateString() === todayKey && (!p.invoiceId || tiIds.has(p.invoiceId)))
        .map(p => ({
          "Receipt #": p.receiptNo, Customer: p.customerName, Mode: p.mode,
          Amount: p.amount, Reference: p.reference || "", "Paid On": fmtDate(p.paidOn),
        }));
    }
  }
}
