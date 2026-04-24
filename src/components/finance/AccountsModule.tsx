import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getFinance, subscribeFinance, recomputeOverdue,
  createInvoice, recordPayment, createExpense, setExpenseStatus,
  createVendor, createVendorBill, payVendorBill, createBudget, payEmi, autoSeedEmisForPartial,
} from "@/lib/finance-store";
import {
  Invoice, Payment, Expense, Vendor, VendorBill, Budget, EmiSchedule,
  RevenueStream, ExpenseCategory, GstType, PaymentMode, ExpenseStatus,
} from "@/lib/finance-types";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, FileText, IndianRupee, AlertTriangle, TrendingUp, Receipt,
  Building2, Briefcase, Lightbulb, PlusCircle, Layers, FilePieChart,
  Truck, Calendar as CalIcon, BadgePercent, Plus, FileDown,
  Send, Mail, MessageCircle, Download as DownloadIcon, ShieldCheck, Pencil,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { FinanceKpi, fmtINR, fmtDate, StatusPill, statusTone } from "./FinanceKpi";
import { FinanceTable, Column } from "./FinanceTable";
import { FinanceDrawer } from "./FinanceDrawer";
import { buildVouchers, vouchersToCsv, vouchersToJson, downloadFile, type TxnType, type DateRange } from "@/lib/tally-export";
import { submitExpenseForApproval, approvalForExpense, syncApprovalToExpense, tierForAmount } from "@/lib/expense-approval-bridge";
import { approvalStore } from "@/lib/approvals";
import type { UserRole } from "@/lib/types";
import { InvoiceDispatchDialog } from "./InvoiceDispatchDialog";
import {
  getDispatches, subscribeDispatch, dispatchForInvoice, registerDispatch, recordSend,
  type InvoiceDispatch,
} from "@/lib/invoice-dispatch-store";
import { GstAmountInput } from "./GstAmountInput";
import { QuickInvoiceDialog } from "./QuickInvoiceDialog";
import { BulkInvoiceDialog } from "./BulkInvoiceDialog";
import { computeBreakup, detectIntraState, validateGstInput, type GstInputMode } from "@/lib/gst-calc";
import { InvoiceEditDialog } from "./InvoiceEditDialog";
import { getInvoiceEdits, subscribeInvoiceEdits, HIGH_VALUE_THRESHOLD, type InvoiceEditEntry } from "@/lib/invoice-edit-store";
import { ProjectionsTab } from "./ProjectionsTab";
import { ReportsTab } from "./ReportsTab";
import { VerificationsTab, VerifiedPaymentsTab, CollectionReportsTab } from "./CollectionControlTabs";
import { CollectionsLogTab, InvoiceRequestsTab } from "./InvoiceRequestTabs";
import { BillingChart } from "@/components/billing/BillingChart";
import { AdminBillingTab } from "./AdminBillingTab";
import { computeEmiMetrics, computeStudentRisk, computePiTiSplit, computePiTiMonthlyTrend } from "@/lib/revenue-projection";
import { PiToTiConvertDialog } from "./PiToTiConvertDialog";
import { getPiTiMappings, subscribePiTi, type PiTiMapping } from "@/lib/pi-ti-store";
import { piOpenBalance, piConvertedAmount } from "@/lib/finance-store";
import { scanPiDueAlerts } from "@/lib/pi-ti-notifications";
import { ArrowRight } from "lucide-react";

const CHART_COLORS = ["hsl(var(--primary))", "#1A1A1A", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9"];

function useFinance() {
  return useSyncExternalStore(
    (l) => subscribeFinance(l),
    () => getFinance(),
    () => getFinance(),
  );
}

function useDispatchList() {
  return useSyncExternalStore(
    (l) => subscribeDispatch(l),
    () => getDispatches(),
    () => getDispatches(),
  );
}

type RoleScope = "owner" | "manager" | "executive";

function scope(role: string): RoleScope {
  if (role === "owner" || role === "admin") return "owner";
  if (role === "accounts_manager") return "manager";
  return "executive";
}

const ALL_TABS: { id: string; label: string; roles: RoleScope[] }[] = [
  { id: "dashboard", label: "Dashboard", roles: ["owner", "manager", "executive"] },
  { id: "billing_chart", label: "Billing Chart", roles: ["owner", "manager", "executive"] },
  { id: "revenue", label: "Revenue", roles: ["owner"] },
  { id: "projections", label: "Projections", roles: ["owner"] },
  { id: "billing", label: "Billing", roles: ["owner", "manager", "executive"] },
  { id: "collections_log", label: "Collection Ledger", roles: ["owner", "manager", "executive"] },
  { id: "invoice_requests", label: "Invoice Requests", roles: ["owner", "manager", "executive"] },
  { id: "verifications", label: "Verifications", roles: ["owner", "manager"] },
  { id: "verified_payments", label: "Verified → TI", roles: ["owner", "manager", "executive"] },
  { id: "collections", label: "Collections", roles: ["owner", "manager", "executive"] },
  { id: "emi", label: "EMI", roles: ["owner", "manager"] },
  { id: "expenses", label: "Expenses", roles: ["owner", "manager", "executive"] },
  { id: "vendors", label: "Vendors", roles: ["owner", "manager", "executive"] },
  { id: "budgets", label: "Budgets", roles: ["owner", "manager"] },
  { id: "profit", label: "Profitability", roles: ["owner", "manager"] },
  { id: "cashflow", label: "Cash Flow", roles: ["owner"] },
  { id: "gst", label: "GST", roles: ["owner", "manager"] },
  { id: "reports", label: "Reports", roles: ["owner", "manager"] },
  { id: "collection_reports", label: "Collection Reports", roles: ["owner", "manager"] },
  { id: "exports", label: "Exports", roles: ["owner", "manager"] },
];

export function AccountsModule() {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const role = scope(currentUser?.role || "accounts_executive");
  const tabs = ALL_TABS.filter(t => t.roles.includes(role));
  const [tab, setTab] = useState(tabs[0].id);

  useEffect(() => { recomputeOverdue(); autoSeedEmisForPartial(); scanPiDueAlerts(getFinance().invoices); }, []);

  // Admin gets a focused, single-tab Verification Control Center —
  // no duplicate Billing Chart, no invoice issuance surfaces.
  if (isAdmin) return <AdminBillingTab />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Accounts & Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CFO command center · {role === "owner" ? "Full visibility" : role === "manager" ? "Operations & approvals" : "Data entry & verification"}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Logged in as {currentUser?.name} · {currentUser?.role.replace("_", " ")}
        </Badge>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-4"><DashboardTab onJump={setTab} /></TabsContent>
        <TabsContent value="billing_chart" className="mt-4"><BillingChart /></TabsContent>
        <TabsContent value="revenue" className="mt-4"><RevenueTab /></TabsContent>
        <TabsContent value="projections" className="mt-4"><ProjectionsTab /></TabsContent>
        <TabsContent value="billing" className="mt-4"><BillingTab role={role} /></TabsContent>
        <TabsContent value="collections_log" className="mt-4"><CollectionsLogTab role={role} /></TabsContent>
        <TabsContent value="invoice_requests" className="mt-4"><InvoiceRequestsTab role={role} /></TabsContent>
        <TabsContent value="verifications" className="mt-4"><VerificationsTab canVerify={currentUser?.role === "admin" || role === "owner" || role === "manager"} /></TabsContent>
        <TabsContent value="verified_payments" className="mt-4"><VerifiedPaymentsTab role={role} /></TabsContent>
        <TabsContent value="collections" className="mt-4"><CollectionsTab role={role} /></TabsContent>
        <TabsContent value="emi" className="mt-4"><EmiTab /></TabsContent>
        <TabsContent value="expenses" className="mt-4"><ExpensesTab role={role} /></TabsContent>
        <TabsContent value="vendors" className="mt-4"><VendorsTab role={role} /></TabsContent>
        <TabsContent value="budgets" className="mt-4"><BudgetsTab /></TabsContent>
        <TabsContent value="profit" className="mt-4"><ProfitTab /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashflowTab /></TabsContent>
        <TabsContent value="gst" className="mt-4"><GstTab /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="collection_reports" className="mt-4"><CollectionReportsTab /></TabsContent>
        <TabsContent value="exports" className="mt-4"><ExportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────── Dashboard ───────── */
function DashboardTab({ onJump }: { onJump: (id: string) => void }) {
  const fin = useFinance();
  const edits = useSyncExternalStore(subscribeInvoiceEdits, getInvoiceEdits, getInvoiceEdits);
  const todayKey = new Date().toDateString();
  const editsToday = edits.filter(e => new Date(e.at).toDateString() === todayKey).length;
  const highValueChanges = edits.filter(e => e.highValue).length;
  const revisedBilling = edits.reduce((s, e) => s + e.amountDelta, 0);
  const emiMetrics = computeEmiMetrics(fin.emiSchedules);
  const riskRows = computeStudentRisk(fin.invoices, fin.emiSchedules);
  const riskAtStake = riskRows.filter(r => r.riskLevel !== "low").reduce((s, r) => s + r.balanceDue, 0);
  const totalBilled = fin.invoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = fin.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = fin.invoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const totalExpenses = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.total, 0);
  const netProfit = totalCollected - totalExpenses;
  const gstOutput = fin.invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const gstInput = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.gst, 0);
  const gstLiability = Math.max(0, gstOutput - gstInput);

  const vendorPayables = fin.vendorBills.filter(b => b.status !== "Paid").reduce((s, b) => s + (b.total - b.paid), 0);
  const emiOverdue = fin.emiSchedules.filter(e => e.status === "Overdue").length;
  const collectionEff = totalBilled > 0 ? (totalCollected / totalBilled * 100) : 0;
  const dailyBurn = totalExpenses / 30 || 1;
  const runway = Math.round((totalCollected - totalExpenses) / dailyBurn);

  const byStream = fin.invoices.reduce<Record<string, number>>((acc, i) => {
    acc[i.revenueStream] = (acc[i.revenueStream] || 0) + i.amountPaid;
    return acc;
  }, {});
  const topStream = Object.entries(byStream).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const trend = useMemo(() => {
    const months: Record<string, { name: string; revenue: number; expense: number }> = {};
    fin.payments.forEach(p => {
      const d = new Date(p.paidOn);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = months[k] || { name: k, revenue: 0, expense: 0 };
      months[k].revenue += p.amount;
    });
    fin.expenses.filter(e => e.status === "Approved").forEach(e => {
      const d = new Date(e.spendDate);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = months[k] || { name: k, revenue: 0, expense: 0 };
      months[k].expense += e.total;
    });
    return Object.values(months).sort((a, b) => a.name.localeCompare(b.name));
  }, [fin]);

  const aging = useMemo(() => {
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    const now = Date.now();
    fin.invoices.forEach(i => {
      const due = i.total - i.amountPaid;
      if (due <= 0) return;
      const days = Math.floor((now - new Date(i.dueDate).getTime()) / 86400000);
      if (days < 30) buckets["0-30"] += due;
      else if (days < 60) buckets["31-60"] += due;
      else if (days < 90) buckets["61-90"] += due;
      else buckets["90+"] += due;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [fin]);

  const streamPie = Object.entries(byStream).map(([name, value]) => ({ name, value }));

  const nudges: string[] = [];
  if (outstanding > 50000) nudges.push(`${fmtINR(outstanding)} dues outstanding. Push collections this week.`);
  if (emiOverdue > 0) nudges.push(`${emiOverdue} EMI account${emiOverdue > 1 ? "s" : ""} overdue today.`);
  if (vendorPayables > 0) nudges.push(`${fmtINR(vendorPayables)} payable to vendors.`);
  if (totalCollected > totalExpenses * 1.5) nudges.push(`Strong month — collections are 1.5× your spend.`);

  return (
    <div className="space-y-5">
      {nudges.length > 0 && (
        <Card className="p-3 border-l-4 border-l-primary bg-primary/5">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-0.5 text-xs">
              {nudges.map((n, i) => <p key={i} className="text-foreground">{n}</p>)}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpi label="Billing Raised" value={fmtINR(totalBilled)} hint={`${fin.invoices.length} invoices`} tone="primary" icon={<FileText className="h-4 w-4" />} onClick={() => onJump("billing")} />
        <FinanceKpi label="Cash Received" value={fmtINR(totalCollected)} hint={`${fin.payments.length} receipts`} tone="success" icon={<IndianRupee className="h-4 w-4" />} onClick={() => onJump("collections")} />
        <FinanceKpi label="Outstanding Dues" value={fmtINR(outstanding)} hint="All open invoices" tone="warning" icon={<AlertTriangle className="h-4 w-4" />} onClick={() => onJump("collections")} />
        <FinanceKpi label="Total Expenses" value={fmtINR(totalExpenses)} hint="Approved this period" tone="destructive" icon={<Receipt className="h-4 w-4" />} onClick={() => onJump("expenses")} />
        <FinanceKpi label="Net Profit" value={fmtINR(netProfit)} hint={netProfit >= 0 ? "In the green" : "Negative"} tone={netProfit >= 0 ? "success" : "destructive"} icon={<TrendingUp className="h-4 w-4" />} onClick={() => onJump("profit")} />
        <FinanceKpi label="GST Liability" value={fmtINR(gstLiability)} hint={`Output ${fmtINR(gstOutput)}`} tone="primary" icon={<BadgePercent className="h-4 w-4" />} onClick={() => onJump("gst")} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpi label="Gross Billing" value={fmtINR(totalBilled)} hint="GST inclusive" tone="primary" icon={<FileText className="h-4 w-4" />} onClick={() => onJump("billing")} />
        <FinanceKpi label="Net Revenue" value={fmtINR(totalBilled - gstOutput)} hint="Excl. GST" tone="success" icon={<TrendingUp className="h-4 w-4" />} onClick={() => onJump("revenue")} />
        <FinanceKpi label="GST Collected" value={fmtINR(gstOutput)} hint="Output tax" tone="primary" icon={<BadgePercent className="h-4 w-4" />} onClick={() => onJump("gst")} />
        <FinanceKpi label="Vendor Payables" value={fmtINR(vendorPayables)} tone="warning" onClick={() => onJump("vendors")} />
        <FinanceKpi label="EMI Overdues" value={emiOverdue} hint="accounts" tone={emiOverdue > 0 ? "destructive" : "success"} onClick={() => onJump("emi")} />
        <FinanceKpi label="Cash Runway" value={`${runway} days`} tone={runway > 60 ? "success" : runway > 30 ? "warning" : "destructive"} />
        <FinanceKpi label="Top Revenue" value={topStream} hint={fmtINR(byStream[topStream] || 0)} tone="primary" onClick={() => onJump("revenue")} />
        <FinanceKpi label="Collection Eff." value={`${collectionEff.toFixed(1)}%`} tone={collectionEff > 70 ? "success" : "warning"} />
        <FinanceKpi label="Budget Variance" value={<BudgetVariance />} tone="default" onClick={() => onJump("budgets")} />
        <FinanceKpi label="Invoice Edits Today" value={editsToday} hint={`${edits.length} all-time`} tone={editsToday > 0 ? "primary" : "default"} icon={<Pencil className="h-4 w-4" />} onClick={() => onJump("billing")} />
        <FinanceKpi label="High-Value Changes" value={highValueChanges} hint=">₹2.5L" tone={highValueChanges > 0 ? "warning" : "default"} icon={<AlertTriangle className="h-4 w-4" />} />
        <FinanceKpi label="Revised Billing" value={fmtINR(revisedBilling)} hint="Net delta" tone={revisedBilling >= 0 ? "success" : "destructive"} />
        <FinanceKpi label="EMI Today" value={fmtINR(emiMetrics.todayDue)} tone={emiMetrics.todayDue > 0 ? "warning" : "default"} icon={<CalIcon className="h-4 w-4" />} onClick={() => onJump("emi")} />
        <FinanceKpi label="Overdue EMI" value={fmtINR(emiMetrics.overdueTotal)} tone={emiMetrics.overdueTotal > 0 ? "destructive" : "success"} icon={<AlertTriangle className="h-4 w-4" />} onClick={() => onJump("emi")} />
        <FinanceKpi label="Next 30d EMI" value={fmtINR(emiMetrics.next30Expected)} tone="primary" onClick={() => onJump("projections")} />
        <FinanceKpi label="Risk Revenue" value={fmtINR(riskAtStake)} hint={`${riskRows.filter(r => r.riskLevel !== "low").length} students`} tone={riskAtStake > 0 ? "warning" : "success"} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => onJump("projections")} />
      </div>

      <PiTiDashboardSection onJump={onJump} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Revenue vs Expense Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              <Area type="monotone" dataKey="expense" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue by Stream</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={streamPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name.split(" ")[0]}>
                {streamPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtINR(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <h3 className="text-sm font-semibold mb-3">Outstanding Receivables Aging</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aging}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ───────── PI / TI Dashboard split ───────── */
function PiTiDashboardSection({ onJump }: { onJump: (id: string) => void }) {
  const fin = useFinance();
  const split = useMemo(
    () => computePiTiSplit(fin.invoices, fin.payments, piOpenBalance),
    [fin.invoices, fin.payments],
  );
  const trend = useMemo(
    () => computePiTiMonthlyTrend(fin.invoices, fin.payments, 6),
    [fin.invoices, fin.payments],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpi label="Receivables (PI)" value={fmtINR(split.piReceivableOpen)} hint="Open Proforma" tone="warning" icon={<FileText className="h-4 w-4" />} onClick={() => onJump("billing")} />
        <FinanceKpi label="Realized Revenue (TI)" value={fmtINR(split.realizedRevenueBilled)} hint={`Collected ${fmtINR(split.realizedRevenueCollected)}`} tone="success" icon={<Receipt className="h-4 w-4" />} onClick={() => onJump("billing")} />
        <FinanceKpi label="PI→TI Conversion" value={`${split.piToTiConversionPct}%`} hint={`${fmtINR(split.piConverted)} of ${fmtINR(split.piRaised)}`} tone={split.piToTiConversionPct >= 60 ? "success" : "warning"} onClick={() => onJump("reports")} />
        <FinanceKpi label="GST Liability (TI)" value={fmtINR(split.gstFromTi)} hint="From TI only" tone="primary" icon={<BadgePercent className="h-4 w-4" />} onClick={() => onJump("gst")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">PI vs TI Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="piRaised" name="PI Raised" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tiGenerated" name="TI Generated" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="collected" name="TI Collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Receivable Aging (PI only)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={split.piAgingBuckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="amount" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function BudgetVariance() {
  const fin = useFinance();
  const planned = fin.budgets.reduce((s, b) => s + b.plannedAmount, 0);
  const actual = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.total, 0);
  const variance = planned - actual;
  const pct = planned > 0 ? (variance / planned * 100) : 0;
  return <span>{pct >= 0 ? "+" : ""}{pct.toFixed(0)}%</span>;
}

/* ───────── Revenue ───────── */
function RevenueTab() {
  const fin = useFinance();
  const byStream = fin.invoices.reduce<Record<string, { billed: number; collected: number }>>((acc, i) => {
    acc[i.revenueStream] = acc[i.revenueStream] || { billed: 0, collected: 0 };
    acc[i.revenueStream].billed += i.total;
    acc[i.revenueStream].collected += i.amountPaid;
    return acc;
  }, {});
  const data = Object.entries(byStream).map(([name, v]) => ({ name, ...v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.map(d => (
          <FinanceKpi key={d.name} label={d.name} value={fmtINR(d.collected)} hint={`Billed ${fmtINR(d.billed)}`} tone="primary" />
        ))}
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Stream-wise Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={60} />
            <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Legend />
            <Bar dataKey="billed" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ───────── Billing (PI / TI unified) ───────── */
type BillingFilter = "all" | "pi" | "ti" | "open_pi" | "converted_pi" | "today_ti";

function usePiTi() {
  return useSyncExternalStore(subscribePiTi, getPiTiMappings, getPiTiMappings);
}

function BillingTab({ role }: { role: RoleScope }) {
  const fin = useFinance();
  const dispatches = useDispatchList();
  const mappings = usePiTi();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [view, setView] = useState<Invoice | null>(null);
  const [dispatchInv, setDispatchInv] = useState<Invoice | null>(null);
  const [editInv, setEditInv] = useState<Invoice | null>(null);
  const [convertPi, setConvertPi] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<BillingFilter>("all");

  const dispatchByInv = useMemo(() => {
    const m = new Map<string, InvoiceDispatch>();
    dispatches.forEach(d => m.set(d.invoiceId, d));
    return m;
  }, [dispatches]);

  const canGenerate = role === "owner" || role === "manager" || currentUser?.role === "accounts_executive";
  const canBulkSend = role === "owner" || role === "manager";
  const canEdit = role === "owner" || role === "manager";
  const canConvert = role === "owner" || role === "manager";

  const baseVisible = useMemo(() => {
    if (role === "owner" || role === "manager") return fin.invoices;
    const myId = currentUser?.id;
    return fin.invoices.filter(i => i.createdBy === myId || dispatchByInv.get(i.id)?.generatedBy === myId);
  }, [fin.invoices, role, currentUser?.id, dispatchByInv]);

  const todayKey = new Date().toDateString();
  const visibleInvoices = useMemo(() => {
    const t = (i: Invoice) => i.invoiceType ?? "PI";
    switch (filter) {
      case "pi":            return baseVisible.filter(i => t(i) === "PI");
      case "ti":            return baseVisible.filter(i => t(i) === "TI");
      case "open_pi":       return baseVisible.filter(i => t(i) === "PI" && piOpenBalance(i.id) > 0 && i.status !== "Cancelled" && i.status !== "Converted");
      case "converted_pi":  return baseVisible.filter(i => t(i) === "PI" && (i.convertedTiIds?.length ?? 0) > 0);
      case "today_ti":      return baseVisible.filter(i => t(i) === "TI" && new Date(i.issueDate).toDateString() === todayKey);
      default:              return baseVisible;
    }
  }, [baseVisible, filter, todayKey]);

  const piMap = useMemo(() => {
    const m = new Map<string, Invoice>();
    fin.invoices.forEach(i => m.set(i.id, i));
    return m;
  }, [fin.invoices]);

  const bulkSendOverdue = () => {
    const targets = visibleInvoices.filter(i => i.status === "Overdue");
    targets.forEach(i => {
      const dsp = registerDispatch({
        invoiceId: i.id, invoiceNo: i.invoiceNo, docType: "fee_demand_note",
        recipientName: i.customerName, amount: i.total, format: "pdf",
        by: currentUser?.id || "u0", byName: currentUser?.name,
      });
      recordSend({ id: dsp.id, channel: "email", recipientEmail: `${i.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`, by: currentUser?.id || "u0", byName: currentUser?.name, success: true });
    });
    toast({ title: `${targets.length} fee-due reminders queued`, description: "Overdue invoices dispatched via email." });
  };

  const cols: Column<Invoice>[] = [
    {
      key: "type", header: "Type",
      render: r => {
        const t = r.invoiceType ?? "PI";
        return t === "TI"
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">TI</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">PI</span>;
      },
      exportValue: r => r.invoiceType ?? "PI",
    },
    { key: "no", header: "Invoice #", render: r => <span className="font-mono text-xs">{r.invoiceNo}</span>, sortValue: r => r.invoiceNo, exportValue: r => r.invoiceNo },
    {
      key: "ref", header: "Linked",
      render: r => {
        if (r.invoiceType === "TI" && r.linkedPiId) {
          const pi = piMap.get(r.linkedPiId);
          return <span className="text-[11px] text-muted-foreground font-mono">↳ {pi?.invoiceNo ?? "—"}</span>;
        }
        if (r.invoiceType === "PI" && (r.convertedTiIds?.length ?? 0) > 0) {
          return <span className="text-[11px] text-emerald-700">{r.convertedTiIds!.length} TI{r.convertedTiIds!.length > 1 ? "s" : ""}</span>;
        }
        return <span className="text-[11px] text-muted-foreground">—</span>;
      },
      exportValue: r => r.linkedPiId ? piMap.get(r.linkedPiId)?.invoiceNo ?? "" : (r.convertedTiIds?.length ? `${r.convertedTiIds.length} TIs` : ""),
    },
    { key: "cust", header: "Recipient", render: r => <div><div className="font-medium text-sm">{r.customerName}</div><div className="text-[11px] text-muted-foreground">{r.customerType}</div></div>, sortValue: r => r.customerName, exportValue: r => r.customerName },
    { key: "stream", header: "Stream", render: r => <span className="text-xs">{r.revenueStream}</span>, exportValue: r => r.revenueStream },
    { key: "issue", header: "Issued", render: r => fmtDate(r.issueDate), sortValue: r => r.issueDate, exportValue: r => fmtDate(r.issueDate) },
    {
      key: "due", header: "Due",
      render: r => r.invoiceType === "TI"
        ? <span className="text-[11px] text-muted-foreground">—</span>
        : fmtDate(r.dueDate),
      sortValue: r => r.dueDate, exportValue: r => r.invoiceType === "TI" ? "" : fmtDate(r.dueDate),
    },
    { key: "total", header: "Amount", render: r => <span className="font-semibold tabular-nums">{fmtINR(r.total)}</span>, sortValue: r => r.total, exportValue: r => r.total },
    { key: "paid", header: "Paid", render: r => <span className="tabular-nums text-emerald-700">{fmtINR(r.amountPaid)}</span>, sortValue: r => r.amountPaid, exportValue: r => r.amountPaid },
    { key: "status", header: "Status", render: r => <StatusPill status={r.status} tone={statusTone(r.status)} />, exportValue: r => r.status },
    {
      key: "actions", header: "",
      render: r => (
        <div className="flex gap-1 justify-end">
          {canConvert && r.invoiceType === "PI" && r.status !== "Converted" && r.status !== "Cancelled" && piOpenBalance(r.id) > 0 && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setConvertPi(r); }} className="gap-1 h-7 text-[11px]" title="Convert PI to TI">
              <ArrowRight className="h-3 w-3" /> Convert
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditInv(r); }} className="gap-1 h-7 text-[11px]" title="Edit invoice">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={!canGenerate} onClick={(e) => { e.stopPropagation(); setDispatchInv(r); }} className="gap-1 h-7 text-[11px]">
            <Send className="h-3 w-3" /> Send
          </Button>
        </div>
      ),
    },
  ];

  // PI / TI billing KPIs
  const piList = baseVisible.filter(i => (i.invoiceType ?? "PI") === "PI" && i.status !== "Cancelled");
  const tiList = baseVisible.filter(i => i.invoiceType === "TI" && i.status !== "Cancelled");
  const piOutstanding = piList.reduce((s, p) => s + piOpenBalance(p.id), 0);
  const piDueToday = piList.filter(p => piOpenBalance(p.id) > 0 && new Date(p.dueDate).toDateString() === todayKey).length;
  const piOverdue = piList.filter(p => piOpenBalance(p.id) > 0 && new Date(p.dueDate).getTime() < Date.now()).length;
  const tiToday = tiList.filter(t => new Date(t.issueDate).toDateString() === todayKey).length;
  const piTotalRaised = piList.reduce((s, p) => s + p.total, 0);
  const piConverted = piList.reduce((s, p) => s + piConvertedAmount(p.id), 0);
  const conversionPct = piTotalRaised > 0 ? Math.round((piConverted / piTotalRaised) * 100) : 0;
  const failedMappings = mappings.filter(m => m.linkedAmount <= 0).length;
  const monthKey = new Date().toISOString().slice(0, 7);
  const gstFromTi = tiList
    .filter(t => t.issueDate.startsWith(monthKey))
    .reduce((s, t) => s + t.cgst + t.sgst + t.igst, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <FinanceKpi label="PI Outstanding" value={fmtINR(piOutstanding)} hint={`${piList.filter(p => piOpenBalance(p.id) > 0).length} open`} tone="warning" icon={<FileText className="h-4 w-4" />} onClick={() => setFilter("open_pi")} />
        <FinanceKpi label="PI Due Today" value={piDueToday} tone={piDueToday > 0 ? "warning" : "default"} onClick={() => setFilter("open_pi")} />
        <FinanceKpi label="PI Overdue" value={piOverdue} tone={piOverdue > 0 ? "destructive" : "success"} icon={<AlertTriangle className="h-4 w-4" />} onClick={() => setFilter("open_pi")} />
        <FinanceKpi label="TI Today" value={tiToday} tone="success" icon={<Receipt className="h-4 w-4" />} onClick={() => setFilter("today_ti")} />
        <FinanceKpi label="PI→TI Conversion" value={`${conversionPct}%`} tone={conversionPct >= 60 ? "success" : "warning"} onClick={() => setFilter("converted_pi")} />
        <FinanceKpi label="GST from TI (mo)" value={fmtINR(gstFromTi)} hint="This month" tone="primary" icon={<BadgePercent className="h-4 w-4" />} />
        <FinanceKpi label="Mappings" value={mappings.length} hint={failedMappings > 0 ? `${failedMappings} failed` : "all healthy"} tone={failedMappings > 0 ? "destructive" : "default"} icon={<ArrowRight className="h-4 w-4" />} />
        <FinanceKpi label="Total Invoices" value={baseVisible.length} hint={`${piList.length} PI · ${tiList.length} TI`} tone="default" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {([
          ["all", "All"], ["pi", "PI only"], ["ti", "TI only"],
          ["open_pi", "Open PI"], ["converted_pi", "Converted PI"], ["today_ti", "Today's TI"],
        ] as [BillingFilter, string][]).map(([k, label]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            className={`text-[11px] px-2 py-1 rounded border transition ${
              filter === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >{label}</button>
        ))}
      </div>

      <FinanceTable<Invoice>
        rows={visibleInvoices}
        columns={cols}
        searchKeys={["invoiceNo", "customerName", "revenueStream"]}
        onRowClick={(r) => setView(r)}
        exportName="invoices"
        toolbar={
          <div className="flex flex-wrap gap-2">
            {canBulkSend && (
              <Button size="sm" variant="outline" onClick={bulkSendOverdue} className="gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Bulk: PI Reminders
              </Button>
            )}
            {canGenerate && (
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Bulk Generate
              </Button>
            )}
            {canGenerate && (
              <Button size="sm" variant="outline" onClick={() => setQuickOpen(true)} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" title="Use TI only after payment is received">
                <Plus className="h-3.5 w-3.5" /> Create Tax Invoice
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" title="Use PI for dues / receivables before payment">
              <Plus className="h-3.5 w-3.5" /> Create Proforma Invoice
            </Button>
          </div>
        }
      />
      <InvoiceFormDrawer open={open} onClose={() => setOpen(false)} />
      <QuickInvoiceDialog open={quickOpen} onClose={() => setQuickOpen(false)} />
      <BulkInvoiceDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <InvoiceViewDrawer invoice={view} onClose={() => setView(null)} />
      <InvoiceDispatchDialog invoice={dispatchInv} open={!!dispatchInv} onClose={() => setDispatchInv(null)} />
      <InvoiceEditDialog invoice={editInv} open={!!editInv} onClose={() => setEditInv(null)} />
      <PiToTiConvertDialog pi={convertPi} open={!!convertPi} onClose={() => setConvertPi(null)} />
    </div>
  );
}

function InvoiceFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState({
    customerName: "", customerType: "Student" as Invoice["customerType"],
    revenueStream: "Student Admissions" as RevenueStream,
    programName: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    amount: 0, discount: 0, gstType: "Taxable" as GstType, gstRate: 18,
    gstin: "", notes: "",
    mode: "gross_inclusive" as GstInputMode,
    intra: true, intraOverridden: false,
  });

  useEffect(() => {
    if (!f.intraOverridden) {
      const auto = detectIntraState(f.gstin);
      if (auto !== f.intra) setF(s => ({ ...s, intra: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.gstin]);

  const effectiveRate = f.gstType === "Exempt" ? 0 : f.gstRate;
  const breakup = computeBreakup(Math.max(0, f.amount - f.discount), effectiveRate, f.mode, f.intra);

  const submit = () => {
    if (!f.customerName.trim()) { toast({ title: "Recipient name required.", variant: "destructive" }); return; }
    if (!f.dueDate) { toast({ title: "PI due date is required.", variant: "destructive" }); return; }
    const v = validateGstInput(f.amount, effectiveRate);
    if (!v.ok) { toast({ title: v.error || "Invalid amount", variant: "destructive" }); return; }
    const inv = createInvoice({
      invoiceType: "PI",
      customerId: "c_" + Math.random().toString(36).slice(2, 6),
      customerName: f.customerName.trim(), customerType: f.customerType,
      revenueStream: f.revenueStream, programName: f.programName,
      issueDate: new Date(f.issueDate).toISOString(),
      dueDate: new Date(f.dueDate).toISOString(),
      subtotal: breakup.taxable, discount: 0,
      gstType: f.gstType, gstRate: effectiveRate, gstin: f.gstin, notes: f.notes,
    } as any, currentUser?.id || "u0");
    inv.cgst = breakup.cgst; inv.sgst = breakup.sgst; inv.igst = breakup.igst;
    toast({ title: "Proforma Invoice issued", description: `${inv.invoiceNo} · ${fmtINR(inv.total)} — Receivable, no GST liability yet.` });
    onClose();
  };

  return (
    <FinanceDrawer open={open} onOpenChange={(o) => !o && onClose()} title="Create Proforma Invoice (PI)" description="Use PI for dues / receivables before payment. Amount goes to receivables, not collected revenue.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Recipient Name</Label><Input value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={f.customerType} onValueChange={(v: any) => setF({ ...f, customerType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Student", "Institution", "Event", "Other"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Revenue Stream</Label>
            <Select value={f.revenueStream} onValueChange={(v: any) => setF({ ...f, revenueStream: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Student Admissions", "B2B Associations", "Events", "Digital Products", "Merchandise", "Misc Income"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Program / Item</Label><Input value={f.programName} onChange={e => setF({ ...f, programName: e.target.value })} /></div>
          <div><Label>Issue Date</Label><Input type="date" value={f.issueDate} onChange={e => setF({ ...f, issueDate: e.target.value })} /></div>
          <div><Label>Due Date</Label><Input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></div>
          <div><Label>GST Type</Label>
            <Select value={f.gstType} onValueChange={(v: any) => setF({ ...f, gstType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Taxable", "Exempt", "Zero Rated"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Discount (₹)</Label><Input type="number" min={0} value={f.discount || ""} onChange={e => setF({ ...f, discount: +e.target.value })} /></div>
          <div className="col-span-2"><Label>GSTIN (optional)</Label><Input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value })} placeholder="27AABCS1234F1Z9" /></div>
        </div>

        <GstAmountInput
          amount={f.amount}
          rate={effectiveRate}
          mode={f.mode}
          intraState={f.intra}
          intraOverridden={f.intraOverridden}
          gstin={f.gstin}
          canEditRate={f.gstType === "Taxable"}
          onAmountChange={(n) => setF({ ...f, amount: n })}
          onRateChange={(n) => setF({ ...f, gstRate: n })}
          onModeChange={(m) => setF({ ...f, mode: m })}
          onIntraStateChange={(intra, manual) => setF({ ...f, intra, intraOverridden: manual ? true : f.intraOverridden })}
        />

        <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        <p className="text-[11px] text-muted-foreground">Taxable fee and GST are calculated automatically based on the selected mode.</p>
        <Button className="w-full" onClick={submit}>Create Invoice</Button>
      </div>
    </FinanceDrawer>
  );
}

function InvoiceViewDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<PaymentMode>("UPI");

  if (!invoice) return null;
  const due = invoice.total - invoice.amountPaid;

  const collect = () => {
    if (amount <= 0 || amount > due) { toast({ title: `Enter amount up to ${fmtINR(due)}`, variant: "destructive" }); return; }
    recordPayment({
      invoiceId: invoice.id, customerId: invoice.customerId, customerName: invoice.customerName,
      amount, mode, paidOn: new Date().toISOString(), reference: `MANUAL-${Date.now()}`,
      recordedBy: currentUser?.id || "u0",
    } as any, currentUser?.id || "u0");
    toast({ title: "Payment recorded" });
    onClose();
  };

  return (
    <FinanceDrawer open={!!invoice} onOpenChange={(o) => !o && onClose()} title={`Invoice ${invoice.invoiceNo}`} description={invoice.customerName}>
      <div className="space-y-4">
        <Card className="p-3 space-y-2 text-sm">
          <Row k="Status" v={<StatusPill status={invoice.status} tone={statusTone(invoice.status)} />} />
          <Row k="Stream" v={invoice.revenueStream} />
          <Row k="Program" v={invoice.programName || "—"} />
          <Row k="Issued" v={fmtDate(invoice.issueDate)} />
          <Row k="Due" v={fmtDate(invoice.dueDate)} />
          <Row k="Subtotal" v={fmtINR(invoice.subtotal)} />
          <Row k="Discount" v={fmtINR(invoice.discount)} />
          <Row k="CGST + SGST" v={fmtINR(invoice.cgst + invoice.sgst)} />
          <Row k="Total" v={<b>{fmtINR(invoice.total)}</b>} />
          <Row k="Paid" v={fmtINR(invoice.amountPaid)} />
          <Row k="Due" v={<span className="text-destructive font-semibold">{fmtINR(due)}</span>} />
        </Card>
        {due > 0 && (
          <Card className="p-3 space-y-2">
            <p className="text-sm font-semibold">Record Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Amount</Label><Input type="number" value={amount || ""} onChange={e => setAmount(+e.target.value)} /></div>
              <div><Label className="text-xs">Mode</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "Bank", "UPI", "Card", "Cheque", "Online"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={collect}>Record Collection</Button>
          </Card>
        )}
      </div>
    </FinanceDrawer>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}

/* ───────── Collections ───────── */
function CollectionsTab({ role }: { role: RoleScope }) {
  const fin = useFinance();
  const cols: Column<Payment>[] = [
    { key: "rcpt", header: "Receipt #", render: r => <span className="font-mono text-xs">{r.receiptNo}</span>, sortValue: r => r.receiptNo, exportValue: r => r.receiptNo },
    { key: "cust", header: "Customer", render: r => r.customerName, sortValue: r => r.customerName, exportValue: r => r.customerName },
    { key: "amount", header: "Amount", render: r => <span className="font-semibold tabular-nums">{fmtINR(r.amount)}</span>, sortValue: r => r.amount, exportValue: r => r.amount },
    { key: "mode", header: "Mode", render: r => <Badge variant="outline" className="text-[10px]">{r.mode}</Badge>, exportValue: r => r.mode },
    { key: "ref", header: "Reference", render: r => <span className="font-mono text-xs">{r.reference || "—"}</span>, exportValue: r => r.reference || "" },
    { key: "paid", header: "Paid On", render: r => fmtDate(r.paidOn), sortValue: r => r.paidOn, exportValue: r => fmtDate(r.paidOn) },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["Cash", "Bank", "UPI", "Card"] as PaymentMode[]).map(m => {
          const sum = fin.payments.filter(p => p.mode === m).reduce((s, p) => s + p.amount, 0);
          return <FinanceKpi key={m} label={m} value={fmtINR(sum)} hint={`${fin.payments.filter(p => p.mode === m).length} txns`} />;
        })}
      </div>
      <FinanceTable rows={fin.payments} columns={cols} searchKeys={["receiptNo", "customerName", "reference"]} exportName="payments" />
    </div>
  );
}

/* ───────── EMI ───────── */
function EmiTab() {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const cols: Column<EmiSchedule>[] = [
    { key: "cust", header: "Customer", render: r => r.customerName, sortValue: r => r.customerName, exportValue: r => r.customerName },
    { key: "n", header: "EMI #", render: r => `#${r.installmentNo}`, sortValue: r => r.installmentNo, exportValue: r => r.installmentNo },
    { key: "due", header: "Due", render: r => fmtDate(r.dueDate), sortValue: r => r.dueDate, exportValue: r => fmtDate(r.dueDate) },
    { key: "amt", header: "Amount", render: r => <span className="font-semibold tabular-nums">{fmtINR(r.amount)}</span>, sortValue: r => r.amount, exportValue: r => r.amount },
    { key: "status", header: "Status", render: r => <StatusPill status={r.status} tone={statusTone(r.status)} />, exportValue: r => r.status },
    {
      key: "actions", header: "", render: r => r.status === "Paid"
        ? <span className="text-xs text-muted-foreground">Done</span>
        : <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); payEmi(r.id, "UPI", currentUser?.id || "u0"); toast({ title: "EMI marked paid" }); }}>Collect</Button>
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FinanceKpi label="Upcoming" value={fin.emiSchedules.filter(e => e.status === "Upcoming").length} tone="primary" />
        <FinanceKpi label="Due" value={fin.emiSchedules.filter(e => e.status === "Due").length} tone="warning" />
        <FinanceKpi label="Overdue" value={fin.emiSchedules.filter(e => e.status === "Overdue").length} tone="destructive" />
        <FinanceKpi label="Paid" value={fin.emiSchedules.filter(e => e.status === "Paid").length} tone="success" />
      </div>
      <FinanceTable rows={fin.emiSchedules} columns={cols} searchKeys={["customerName"]} exportName="emi-schedule" />
    </div>
  );
}

/* ───────── Expenses ───────── */
function ExpensesTab({ role }: { role: RoleScope }) {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const canApprove = role === "owner" || role === "manager";

  const actOnApproval = (exp: Expense, action: "Approve" | "Reject") => {
    const req = approvalForExpense(exp.id);
    const actorRole: UserRole = (currentUser?.role as UserRole) || "accounts_manager";
    if (req) {
      const updated = approvalStore.act(req.id, {
        action,
        actorId: currentUser?.id || "u0",
        actorRole,
        comment: action === "Reject" ? "Rejected via Expenses tab" : undefined,
      });
      if (!updated) { toast({ title: "Approval level not configured.", variant: "destructive" }); return; }
      syncApprovalToExpense(updated, currentUser?.id || "u0");
    } else {
      // fallback (legacy expenses without an approval record)
      setExpenseStatus(exp.id, action === "Approve" ? "Approved" : "Rejected", currentUser?.id || "u0");
    }
    toast({ title: action === "Approve" ? "Expense approved" : "Expense rejected" });
  };

  const cols: Column<Expense>[] = [
    { key: "no", header: "Expense #", render: r => <span className="font-mono text-xs">{r.expenseNo}</span>, sortValue: r => r.expenseNo, exportValue: r => r.expenseNo },
    { key: "cat", header: "Category", render: r => <Badge variant="outline" className="text-[10px]">{r.category}</Badge>, exportValue: r => r.category },
    { key: "vendor", header: "Vendor", render: r => r.vendorName || "—", exportValue: r => r.vendorName || "" },
    { key: "amt", header: "Amount", render: r => <span className="font-semibold tabular-nums">{fmtINR(r.total)}</span>, sortValue: r => r.total, exportValue: r => r.total },
    { key: "date", header: "Date", render: r => fmtDate(r.spendDate), sortValue: r => r.spendDate, exportValue: r => fmtDate(r.spendDate) },
    { key: "tier", header: "Approver", render: r => {
      try { return <Badge variant="outline" className="text-[10px]">{tierForAmount(r.total).tier.replace(/_/g, " ")}</Badge>; }
      catch { return <span className="text-xs text-muted-foreground">—</span>; }
    }, exportValue: r => { try { return tierForAmount(r.total).tier; } catch { return ""; } } },
    { key: "status", header: "Status", render: r => <StatusPill status={r.status} tone={statusTone(r.status)} />, exportValue: r => r.status },
    {
      key: "actions", header: "", render: r => canApprove && r.status === "Pending"
        ? <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); actOnApproval(r, "Approve"); }}>Approve</Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); actOnApproval(r, "Reject"); }}>Reject</Button>
          </div>
        : null
    },
  ];

  return (
    <div className="space-y-3">
      <FinanceTable
        rows={fin.expenses}
        columns={cols}
        searchKeys={["expenseNo", "vendorName", "category", "description"]}
        exportName="expenses"
        toolbar={<Button size="sm" onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Expense</Button>}
      />
      <ExpenseFormDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ExpenseFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useAuth();
  const fin = useFinance();
  const { toast } = useToast();
  const [f, setF] = useState({
    category: "Marketing" as ExpenseCategory,
    vendorId: "",
    amount: 0, gst: 0,
    spendDate: new Date().toISOString().slice(0, 10),
    description: "",
    paymentMode: "Bank" as PaymentMode,
  });

  const submit = () => {
    if (f.amount <= 0 || !f.description) { toast({ title: "Fill amount + description", variant: "destructive" }); return; }
    const vendor = fin.vendors.find(v => v.id === f.vendorId);
    const exp = createExpense({
      category: f.category,
      vendorId: vendor?.id, vendorName: vendor?.name,
      amount: f.amount, gst: f.gst,
      spendDate: new Date(f.spendDate).toISOString(),
      description: f.description,
      status: "Pending",
      paymentMode: f.paymentMode,
      submittedBy: currentUser?.id || "u0",
    } as any, currentUser?.id || "u0");
    try {
      const role = (currentUser?.role as UserRole) || "accounts_executive";
      const tier = tierForAmount(exp.total);
      submitExpenseForApproval(exp, currentUser?.id || "u0", role);
      toast({ title: "Expense submitted", description: `Routed to ${tier.tier.replace(/_/g, " ")} (${tier.approverRole.replace(/_/g, " ")}).` });
    } catch {
      toast({ title: "Approval level not configured.", variant: "destructive" });
    }
    onClose();
  };

  return (
    <FinanceDrawer open={open} onOpenChange={(o) => !o && onClose()} title="Add Expense">
      <div className="space-y-3">
        <div><Label>Category</Label>
          <Select value={f.category} onValueChange={(v: any) => setF({ ...f, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Marketing", "Salaries", "Travel", "Rent", "Vendor", "Trainer", "Office", "Misc"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Vendor (optional)</Label>
          <Select value={f.vendorId || "_none"} onValueChange={(v) => setF({ ...f, vendorId: v === "_none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {fin.vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Amount (₹)</Label><Input type="number" value={f.amount || ""} onChange={e => setF({ ...f, amount: +e.target.value })} /></div>
          <div><Label>GST (₹)</Label><Input type="number" value={f.gst || ""} onChange={e => setF({ ...f, gst: +e.target.value })} /></div>
        </div>
        <div><Label>Date</Label><Input type="date" value={f.spendDate} onChange={e => setF({ ...f, spendDate: e.target.value })} /></div>
        <div><Label>Payment Mode</Label>
          <Select value={f.paymentMode} onValueChange={(v: any) => setF({ ...f, paymentMode: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Cash", "Bank", "UPI", "Card", "Cheque", "Online"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
        <Card className="p-2 bg-muted/30 text-xs flex justify-between">
          <span>Total</span><b>{fmtINR(f.amount + f.gst)}</b>
        </Card>
        <Button className="w-full" onClick={submit}>Submit Expense</Button>
      </div>
    </FinanceDrawer>
  );
}

/* ───────── Vendors ───────── */
function VendorsTab({ role }: { role: RoleScope }) {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [openV, setOpenV] = useState(false);
  const [openB, setOpenB] = useState(false);
  const [tab, setTab] = useState("vendors");

  const vCols: Column<Vendor>[] = [
    { key: "name", header: "Name", render: r => <div><div className="font-medium text-sm">{r.name}</div><div className="text-[11px] text-muted-foreground">{r.category}</div></div>, sortValue: r => r.name, exportValue: r => r.name },
    { key: "contact", header: "Contact", render: r => r.contactName || "—", exportValue: r => r.contactName || "" },
    { key: "phone", header: "Phone", render: r => r.phone || "—", exportValue: r => r.phone || "" },
    { key: "gstin", header: "GSTIN", render: r => <span className="font-mono text-xs">{r.gstin || "—"}</span>, exportValue: r => r.gstin || "" },
    {
      key: "due", header: "Open Bills", render: r => {
        const open = fin.vendorBills.filter(b => b.vendorId === r.id && b.status !== "Paid");
        const total = open.reduce((s, b) => s + (b.total - b.paid), 0);
        return open.length ? <span className="text-amber-600 font-medium tabular-nums">{open.length} · {fmtINR(total)}</span> : <span className="text-muted-foreground">—</span>;
      }
    },
  ];

  const bCols: Column<VendorBill>[] = [
    { key: "no", header: "Bill #", render: r => <span className="font-mono text-xs">{r.billNo}</span>, sortValue: r => r.billNo, exportValue: r => r.billNo },
    { key: "vendor", header: "Vendor", render: r => r.vendorName, exportValue: r => r.vendorName },
    { key: "date", header: "Bill Date", render: r => fmtDate(r.billDate), sortValue: r => r.billDate, exportValue: r => fmtDate(r.billDate) },
    { key: "due", header: "Due", render: r => fmtDate(r.dueDate), sortValue: r => r.dueDate, exportValue: r => fmtDate(r.dueDate) },
    { key: "total", header: "Total", render: r => <span className="font-semibold tabular-nums">{fmtINR(r.total)}</span>, sortValue: r => r.total, exportValue: r => r.total },
    { key: "paid", header: "Paid", render: r => <span className="tabular-nums">{fmtINR(r.paid)}</span>, sortValue: r => r.paid, exportValue: r => r.paid },
    { key: "status", header: "Status", render: r => <StatusPill status={r.status} tone={statusTone(r.status)} />, exportValue: r => r.status },
    {
      key: "actions", header: "", render: r => r.status !== "Paid" && (role === "owner" || role === "manager")
        ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); payVendorBill(r.id, r.total - r.paid, currentUser?.id || "u0"); toast({ title: "Payment released" }); }}>Pay</Button>
        : null
    },
  ];

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vendors">Vendor Master</TabsTrigger>
          <TabsTrigger value="bills">Bills Payable</TabsTrigger>
        </TabsList>
        <TabsContent value="vendors" className="mt-3">
          <FinanceTable
            rows={fin.vendors} columns={vCols} searchKeys={["name", "category", "contactName", "gstin"]}
            exportName="vendors"
            toolbar={<Button size="sm" onClick={() => setOpenV(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Vendor</Button>}
          />
        </TabsContent>
        <TabsContent value="bills" className="mt-3">
          <FinanceTable
            rows={fin.vendorBills} columns={bCols} searchKeys={["billNo", "vendorName"]}
            exportName="vendor-bills"
            toolbar={<Button size="sm" onClick={() => setOpenB(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Bill</Button>}
          />
        </TabsContent>
      </Tabs>
      <VendorFormDrawer open={openV} onClose={() => setOpenV(false)} />
      <VendorBillFormDrawer open={openB} onClose={() => setOpenB(false)} />
    </div>
  );
}

function VendorFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState({ name: "", category: "", gstin: "", contactName: "", phone: "", email: "", address: "", openingBalance: 0 });
  return (
    <FinanceDrawer open={open} onOpenChange={(o) => !o && onClose()} title="Add Vendor">
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Category</Label><Input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="Marketing / IT / Trainer / Rent" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Contact</Label><Input value={f.contactName} onChange={e => setF({ ...f, contactName: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div><Label>GSTIN</Label><Input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <Button className="w-full" onClick={() => {
          if (!f.name) { toast({ title: "Name required", variant: "destructive" }); return; }
          createVendor(f as any, currentUser?.id || "u0");
          toast({ title: "Vendor added" }); onClose();
        }}>Save Vendor</Button>
      </div>
    </FinanceDrawer>
  );
}

function VendorBillFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState({ vendorId: "", billNo: "", billDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), amount: 0, gst: 0, notes: "" });
  return (
    <FinanceDrawer open={open} onOpenChange={(o) => !o && onClose()} title="Add Vendor Bill">
      <div className="space-y-3">
        <div><Label>Vendor</Label>
          <Select value={f.vendorId} onValueChange={(v) => setF({ ...f, vendorId: v })}>
            <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              {fin.vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Bill #</Label><Input value={f.billNo} onChange={e => setF({ ...f, billNo: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Bill Date</Label><Input type="date" value={f.billDate} onChange={e => setF({ ...f, billDate: e.target.value })} /></div>
          <div><Label>Due Date</Label><Input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" value={f.amount || ""} onChange={e => setF({ ...f, amount: +e.target.value })} /></div>
          <div><Label>GST</Label><Input type="number" value={f.gst || ""} onChange={e => setF({ ...f, gst: +e.target.value })} /></div>
        </div>
        <Button className="w-full" onClick={() => {
          const vendor = fin.vendors.find(v => v.id === f.vendorId);
          if (!vendor || !f.billNo || f.amount <= 0) { toast({ title: "Vendor + bill # + amount required", variant: "destructive" }); return; }
          createVendorBill({
            billNo: f.billNo, vendorId: vendor.id, vendorName: vendor.name,
            billDate: new Date(f.billDate).toISOString(), dueDate: new Date(f.dueDate).toISOString(),
            amount: f.amount, gst: f.gst, notes: f.notes,
          } as any, currentUser?.id || "u0");
          toast({ title: "Bill added" }); onClose();
        }}>Save Bill</Button>
      </div>
    </FinanceDrawer>
  );
}

/* ───────── Budgets ───────── */
function BudgetsTab() {
  const fin = useFinance();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const data = fin.budgets.map(b => {
    const actual = fin.expenses.filter(e => e.category === b.category && e.status === "Approved" && e.spendDate.startsWith(b.month)).reduce((s, e) => s + e.total, 0);
    const variance = b.plannedAmount - actual;
    return { ...b, actual, variance, variancePct: b.plannedAmount ? (variance / b.plannedAmount * 100) : 0 };
  });

  const cols: Column<typeof data[number]>[] = [
    { key: "dept", header: "Department", render: r => r.department, exportValue: r => r.department },
    { key: "cat", header: "Category", render: r => r.category, exportValue: r => r.category },
    { key: "month", header: "Month", render: r => r.month, exportValue: r => r.month },
    { key: "planned", header: "Planned", render: r => fmtINR(r.plannedAmount), sortValue: r => r.plannedAmount, exportValue: r => r.plannedAmount },
    { key: "actual", header: "Actual", render: r => fmtINR(r.actual), sortValue: r => r.actual, exportValue: r => r.actual },
    {
      key: "var", header: "Variance", render: r => (
        <span className={r.variance >= 0 ? "text-emerald-700 font-medium" : "text-destructive font-medium"}>
          {fmtINR(r.variance)} ({r.variancePct.toFixed(0)}%)
        </span>
      ),
      sortValue: r => r.variance,
      exportValue: r => r.variance,
    },
  ];

  return (
    <div className="space-y-3">
      <FinanceTable
        rows={data} columns={cols} searchKeys={["department", "category"]} exportName="budgets"
        toolbar={<Button size="sm" onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Budget</Button>}
      />
      <FinanceDrawer open={open} onOpenChange={setOpen} title="Add Budget">
        <BudgetForm onDone={() => setOpen(false)} />
      </FinanceDrawer>
    </div>
  );
}

function BudgetForm({ onDone }: { onDone: () => void }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [f, setF] = useState({
    department: "", category: "Marketing" as ExpenseCategory,
    month: new Date().toISOString().slice(0, 7),
    plannedAmount: 0, notes: "",
  });
  return (
    <div className="space-y-3">
      <div><Label>Department</Label><Input value={f.department} onChange={e => setF({ ...f, department: e.target.value })} /></div>
      <div><Label>Category</Label>
        <Select value={f.category} onValueChange={(v: any) => setF({ ...f, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Marketing", "Salaries", "Travel", "Rent", "Vendor", "Trainer", "Office", "Misc"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Month</Label><Input type="month" value={f.month} onChange={e => setF({ ...f, month: e.target.value })} /></div>
      <div><Label>Planned Amount</Label><Input type="number" value={f.plannedAmount || ""} onChange={e => setF({ ...f, plannedAmount: +e.target.value })} /></div>
      <Button className="w-full" onClick={() => {
        if (!f.department || f.plannedAmount <= 0) { toast({ title: "Department + amount required", variant: "destructive" }); return; }
        createBudget(f as any, currentUser?.id || "u0");
        toast({ title: "Budget set" }); onDone();
      }}>Save Budget</Button>
    </div>
  );
}

/* ───────── Profitability ───────── */
function ProfitTab() {
  const fin = useFinance();
  const byStream = fin.invoices.reduce<Record<string, { revenue: number }>>((acc, i) => {
    acc[i.revenueStream] = acc[i.revenueStream] || { revenue: 0 };
    acc[i.revenueStream].revenue += i.amountPaid;
    return acc;
  }, {});
  const totalExp = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.total, 0);
  const totalRev = fin.payments.reduce((s, p) => s + p.amount, 0);
  const expShare = (rev: number) => totalRev > 0 ? totalExp * (rev / totalRev) : 0;

  const data = Object.entries(byStream).map(([name, v]) => {
    const cost = expShare(v.revenue);
    return { name, revenue: v.revenue, cost, profit: v.revenue - cost, margin: v.revenue > 0 ? ((v.revenue - cost) / v.revenue * 100) : 0 };
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Profit by Vertical (allocated cost)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={60} />
            <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="cost" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <FinanceTable
        rows={data.map((d, i) => ({ id: String(i), ...d }))}
        columns={[
          { key: "name", header: "Stream", render: r => r.name, exportValue: r => r.name },
          { key: "rev", header: "Revenue", render: r => fmtINR(r.revenue), sortValue: r => r.revenue, exportValue: r => r.revenue },
          { key: "cost", header: "Allocated Cost", render: r => fmtINR(r.cost), sortValue: r => r.cost, exportValue: r => r.cost },
          { key: "profit", header: "Profit", render: r => <b className={r.profit >= 0 ? "text-emerald-700" : "text-destructive"}>{fmtINR(r.profit)}</b>, sortValue: r => r.profit, exportValue: r => r.profit },
          { key: "margin", header: "Margin %", render: r => `${r.margin.toFixed(1)}%`, sortValue: r => r.margin, exportValue: r => r.margin },
        ]}
        exportName="profitability"
      />
    </div>
  );
}

/* ───────── Cashflow ───────── */
function CashflowTab() {
  const fin = useFinance();
  const inflow = fin.cashflow.filter(c => c.type === "Inflow").reduce((s, c) => s + c.amount, 0);
  const outflow = fin.cashflow.filter(c => c.type === "Outflow").reduce((s, c) => s + c.amount, 0);

  // Forecast: sum of expected receivables (open invoices due in next N days) and payables
  const horizons = [30, 60, 90];
  const forecast = horizons.map(d => {
    const receivable = fin.invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled" && new Date(i.dueDate).getTime() < Date.now() + d * 86400000).reduce((s, i) => s + (i.total - i.amountPaid), 0);
    const payable = fin.vendorBills.filter(b => b.status !== "Paid" && new Date(b.dueDate).getTime() < Date.now() + d * 86400000).reduce((s, b) => s + (b.total - b.paid), 0);
    return { name: `${d}D`, receivable, payable, net: receivable - payable };
  });

  const cols: Column<any>[] = [
    { key: "date", header: "Date", render: r => fmtDate(r.date), sortValue: r => r.date, exportValue: r => fmtDate(r.date) },
    { key: "type", header: "Type", render: r => <Badge variant={r.type === "Inflow" ? "default" : "outline"} className="text-[10px]">{r.type}</Badge>, exportValue: r => r.type },
    { key: "src", header: "Source", render: r => r.source, exportValue: r => r.source },
    { key: "amt", header: "Amount", render: r => <span className={r.type === "Inflow" ? "text-emerald-700 font-semibold tabular-nums" : "text-destructive font-semibold tabular-nums"}>{fmtINR(r.amount)}</span>, sortValue: r => r.amount, exportValue: r => r.amount },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <FinanceKpi label="Total Inflow" value={fmtINR(inflow)} tone="success" />
        <FinanceKpi label="Total Outflow" value={fmtINR(outflow)} tone="destructive" />
        <FinanceKpi label="Net" value={fmtINR(inflow - outflow)} tone={inflow >= outflow ? "success" : "destructive"} />
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">30 / 60 / 90-Day Forecast</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Legend />
            <Bar dataKey="receivable" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="payable" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <FinanceTable rows={fin.cashflow} columns={cols} searchKeys={["source"]} exportName="cashflow" />
    </div>
  );
}

/* ───────── GST ───────── */
function GstTab() {
  const fin = useFinance();
  const output = fin.invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const input = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.gst, 0);
  const payable = Math.max(0, output - input);

  const cols: Column<Invoice>[] = [
    { key: "no", header: "Invoice #", render: r => <span className="font-mono text-xs">{r.invoiceNo}</span>, exportValue: r => r.invoiceNo },
    { key: "cust", header: "Customer", render: r => r.customerName, exportValue: r => r.customerName },
    { key: "gstin", header: "GSTIN", render: r => <span className="font-mono text-xs">{r.gstin || "—"}</span>, exportValue: r => r.gstin || "" },
    { key: "type", header: "Type", render: r => r.gstType, exportValue: r => r.gstType },
    { key: "rate", header: "Rate", render: r => `${r.gstRate}%`, exportValue: r => r.gstRate },
    { key: "cgst", header: "CGST", render: r => fmtINR(r.cgst), exportValue: r => r.cgst },
    { key: "sgst", header: "SGST", render: r => fmtINR(r.sgst), exportValue: r => r.sgst },
    { key: "total", header: "Total", render: r => fmtINR(r.total), exportValue: r => r.total },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <FinanceKpi label="Output Tax" value={fmtINR(output)} hint="Collected from sales" tone="primary" />
        <FinanceKpi label="Input Tax Credit" value={fmtINR(input)} hint="On approved expenses" tone="success" />
        <FinanceKpi label="Net GST Payable" value={fmtINR(payable)} tone={payable > 0 ? "warning" : "success"} />
      </div>
      <FinanceTable rows={fin.invoices} columns={cols} searchKeys={["invoiceNo", "customerName", "gstin"]} exportName="gst-summary" />
    </div>
  );
}

/* ───────── Exports ───────── */
function ExportsTab() {
  const fin = useFinance();
  const { toast } = useToast();
  const [txnType, setTxnType] = useState<TxnType>("all_transactions");
  const [range, setRange] = useState<DateRange>("this_month");
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const preview = useMemo(() => buildVouchers(txnType, range, from, to), [txnType, range, from, to, fin]);

  const stamp = () => `${txnType}_${range}_${new Date().toISOString().slice(0, 10)}`;

  const onExport = (format: "csv" | "json") => {
    try {
      if (!preview.length) { toast({ title: "No records found for selected filters." }); return; }
      if (format === "csv") {
        downloadFile(`tally_${stamp()}.csv`, vouchersToCsv(preview), "text/csv");
      } else {
        downloadFile(`tally_${stamp()}.json`, JSON.stringify(vouchersToJson(preview), null, 2), "application/json");
      }
      toast({ title: "Export generated successfully.", description: `${preview.length} voucher${preview.length > 1 ? "s" : ""} → ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed. Please retry.", variant: "destructive" });
    }
  };

  const TXN_OPTIONS: { value: TxnType; label: string }[] = [
    { value: "all_transactions", label: "All Transactions" },
    { value: "sales_invoices", label: "Sales Invoices" },
    { value: "receipts", label: "Receipts" },
    { value: "expense_vouchers", label: "Expense Vouchers" },
    { value: "payment_vouchers", label: "Payment Vouchers" },
    { value: "journal_entries", label: "Journal Entries" },
    { value: "student_fee_collections", label: "Student Fee Collections" },
    { value: "vendor_payments", label: "Vendor Payments" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileDown className="h-4 w-4 text-primary" /> Tally-Ready Voucher Export</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Filter by transaction type and date range, then download as CSV or JSON.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Transaction Type</Label>
            <Select value={txnType} onValueChange={(v: TxnType) => setTxnType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TXN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date Range</Label>
            <Select value={range} onValueChange={(v: DateRange) => setRange(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom_range">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {range === "custom_range" && (
            <>
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            <b className="text-foreground tabular-nums">{preview.length}</b> voucher{preview.length === 1 ? "" : "s"} match
          </div>
          <div className="flex-1" />
          <Button id="export_csv" size="sm" variant="outline" onClick={() => onExport("csv")} className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button id="export_json" size="sm" onClick={() => onExport("json")} className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" /> Export JSON
          </Button>
        </div>
      </Card>

      {preview.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No records found for selected filters.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/40 text-xs font-medium">Preview · first 25 rows</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Voucher #</th>
                  <th className="px-3 py-2 text-left">Ledger</th>
                  <th className="px-3 py-2 text-left">Party</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 25).map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{v.voucher_date}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{v.voucher_type}</Badge></td>
                    <td className="px-3 py-2 font-mono">{v.voucher_number}</td>
                    <td className="px-3 py-2">{v.ledger_name}</td>
                    <td className="px-3 py-2">{v.party_name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.debit_amount ? fmtINR(v.debit_amount) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.credit_amount ? fmtINR(v.credit_amount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
