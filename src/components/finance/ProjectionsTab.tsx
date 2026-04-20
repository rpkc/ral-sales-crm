/**
 * Owner Projections Tab — 36-month strategic revenue intelligence.
 * Pure derivation from finance-store. Editable assumptions (continuation rates +
 * scenario multipliers). Excel/CSV exports via xlsx (browser-safe).
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar, Target, AlertTriangle, BadgePercent, FileDown, ShieldAlert, RefreshCw, Sparkles } from "lucide-react";
import { getFinance, subscribeFinance } from "@/lib/finance-store";
import {
  projectMonthly, projectYearly, computeAdmissionTrend, computeEmiMetrics,
  computeStudentRisk, revenueByCourse, revenueBySource, computeRevenueKpis,
  DEFAULT_CONTINUATION, DEFAULT_SCENARIOS,
  type ScenarioKey, type ContinuationRates,
} from "@/lib/revenue-projection";
import { FinanceKpi, fmtINR } from "./FinanceKpi";

const COLORS = ["hsl(var(--primary))", "#1A1A1A", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9", "#a855f7"];

function useFin() {
  return useSyncExternalStore(subscribeFinance, getFinance, getFinance);
}

export function ProjectionsTab() {
  const fin = useFin();
  const { toast } = useToast();
  const [scenario, setScenario] = useState<ScenarioKey>("expected");
  const [horizon, setHorizon] = useState<12 | 36>(12);
  const [cont, setCont] = useState<ContinuationRates>(DEFAULT_CONTINUATION);
  const [scenariosLocal, setScenariosLocal] = useState(DEFAULT_SCENARIOS);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const monthly = useMemo(
    () => projectMonthly({
      invoices: fin.invoices, payments: fin.payments, emiSchedules: fin.emiSchedules,
      horizonMonths: horizon, scenario, continuation: cont, scenarios: scenariosLocal,
    }),
    [fin, horizon, scenario, cont, scenariosLocal],
  );

  const yearly = useMemo(
    () => projectYearly(fin.invoices, fin.payments, fin.emiSchedules, cont, scenariosLocal),
    [fin, cont, scenariosLocal],
  );

  const trend = useMemo(() => computeAdmissionTrend(fin.invoices, 6), [fin.invoices]);
  const emiMetrics = useMemo(() => computeEmiMetrics(fin.emiSchedules), [fin.emiSchedules]);
  const risk = useMemo(() => computeStudentRisk(fin.invoices, fin.emiSchedules), [fin.invoices, fin.emiSchedules]);
  const courseBreak = useMemo(() => revenueByCourse(fin.invoices), [fin.invoices]);
  const sourceBreak = useMemo(() => revenueBySource(fin.invoices), [fin.invoices]);

  const monthlyBurn = useMemo(() => {
    const approved = fin.expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.total, 0);
    return approved / 30 * 30 || 1;
  }, [fin.expenses]);

  const kpis = useMemo(
    () => computeRevenueKpis(fin.invoices, fin.payments, monthlyBurn || 1),
    [fin, monthlyBurn],
  );

  const totalProjected = monthly.reduce((s, m) => s + m.netProjectedRevenue, 0);
  const next30 = monthly[0]?.netProjectedRevenue || 0;
  const next90 = monthly.slice(0, 3).reduce((s, m) => s + m.netProjectedRevenue, 0);
  const riskRevenueAtStake = risk.filter(r => r.riskLevel !== "low").reduce((s, r) => s + r.balanceDue, 0);

  const exportCsv = () => {
    const header = ["Month", "Confirmed", "Scheduled EMI", "Continuation", "New Admissions", "Risk Leakage", "Net Projection"];
    const rows = monthly.map(m => [m.label, m.confirmedCollections, m.scheduledEmis, m.continuationRevenue, m.newAdmissionForecast, m.riskLeakage, m.netProjectedRevenue]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-projection-${scenario}-${horizon}m.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const exportExcel = async () => {
    // Use SheetJS via dynamic import — browser-safe, already in deps tree via xlsx skill
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const monthlySheet = XLSX.utils.json_to_sheet(monthly.map(m => ({
        Month: m.label, Confirmed: m.confirmedCollections, "Scheduled EMI": m.scheduledEmis,
        Continuation: m.continuationRevenue, "New Admissions": m.newAdmissionForecast,
        "Risk Leakage": m.riskLeakage, "Net Projection": m.netProjectedRevenue,
      })));
      XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Projection");
      const yearlySheet = XLSX.utils.json_to_sheet(yearly);
      XLSX.utils.book_append_sheet(wb, yearlySheet, "3-Year Strategic");
      const riskSheet = XLSX.utils.json_to_sheet(risk);
      XLSX.utils.book_append_sheet(wb, riskSheet, "Risk Ledger");
      XLSX.writeFile(wb, `revenue-projection-${scenario}.xlsx`);
      toast({ title: "Excel exported" });
    } catch {
      toast({ title: "Excel export unavailable", description: "Falling back to CSV.", variant: "destructive" });
      exportCsv();
    }
  };

  return (
    <div className="space-y-5">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FinanceKpi label="MRR" value={fmtINR(kpis.mrr)} hint="Last 3 months avg" tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
        <FinanceKpi label="Avg LTV" value={fmtINR(kpis.ltv)} hint="Per student" tone="success" icon={<Sparkles className="h-4 w-4" />} />
        <FinanceKpi label={`Next 30d (${scenario})`} value={fmtINR(next30)} tone="primary" icon={<Calendar className="h-4 w-4" />} />
        <FinanceKpi label={`Next 90d (${scenario})`} value={fmtINR(next90)} tone="primary" icon={<Calendar className="h-4 w-4" />} />
        <FinanceKpi label={`${horizon}-month Total`} value={fmtINR(totalProjected)} tone="success" icon={<Target className="h-4 w-4" />} />
        <FinanceKpi label="Risk Revenue" value={fmtINR(riskRevenueAtStake)} hint={`${risk.filter(r => r.riskLevel !== "low").length} students`} tone={riskRevenueAtStake > 0 ? "warning" : "success"} icon={<ShieldAlert className="h-4 w-4" />} />
      </div>

      {/* EMI cashflow strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FinanceKpi label="EMI Today" value={fmtINR(emiMetrics.todayDue)} tone={emiMetrics.todayDue > 0 ? "warning" : "default"} />
        <FinanceKpi label="EMI This Week" value={fmtINR(emiMetrics.weekDue)} tone="primary" />
        <FinanceKpi label="EMI This Month" value={fmtINR(emiMetrics.monthDue)} tone="primary" />
        <FinanceKpi label="Overdue EMI" value={fmtINR(emiMetrics.overdueTotal)} tone={emiMetrics.overdueTotal > 0 ? "destructive" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        <FinanceKpi label="Next 30d Expected" value={fmtINR(emiMetrics.next30Expected)} tone="success" />
      </div>

      {/* Controls */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Scenario</Label>
            <Tabs value={scenario} onValueChange={(v) => setScenario(v as ScenarioKey)}>
              <TabsList className="h-8">
                <TabsTrigger value="conservative" className="text-xs">Conservative</TabsTrigger>
                <TabsTrigger value="expected" className="text-xs">Expected</TabsTrigger>
                <TabsTrigger value="growth" className="text-xs">Growth</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Horizon</Label>
            <Tabs value={String(horizon)} onValueChange={(v) => setHorizon(+v as 12 | 36)}>
              <TabsList className="h-8">
                <TabsTrigger value="12" className="text-xs">12m</TabsTrigger>
                <TabsTrigger value="36" className="text-xs">36m</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Badge variant="outline" className="gap-1 text-[11px]">
            Trend slope: {trend.slope.toFixed(2)} adm/mo · Avg ticket {fmtINR(trend.avgTicket)}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAssumptions(s => !s)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> {showAssumptions ? "Hide" : "Edit"} Assumptions
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" onClick={exportExcel} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Excel
            </Button>
          </div>
        </div>

        {showAssumptions && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Y1 → Y2 retention</Label>
              <Input type="number" step="0.01" min={0} max={1} value={cont.y1ToY2}
                onChange={e => setCont({ ...cont, y1ToY2: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Y2 → Y3 retention</Label>
              <Input type="number" step="0.01" min={0} max={1} value={cont.y2ToY3}
                onChange={e => setCont({ ...cont, y2ToY3: +e.target.value })} />
            </div>
            {(["conservative", "expected", "growth"] as ScenarioKey[]).map(scn => (
              <div key={scn} className="grid grid-cols-2 gap-1">
                <div>
                  <Label className="text-[10px] capitalize">{scn} adm×</Label>
                  <Input type="number" step="0.05" value={scenariosLocal[scn].admissionMultiplier}
                    onChange={e => setScenariosLocal({ ...scenariosLocal, [scn]: { ...scenariosLocal[scn], admissionMultiplier: +e.target.value } })} />
                </div>
                <div>
                  <Label className="text-[10px] capitalize">{scn} EMI rec</Label>
                  <Input type="number" step="0.01" value={scenariosLocal[scn].emiRecoveryRate}
                    onChange={e => setScenariosLocal({ ...scenariosLocal, [scn]: { ...scenariosLocal[scn], emiRecoveryRate: +e.target.value } })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Monthly projection chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">{horizon}-Month Revenue Projection · {scenario}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" fontSize={10} interval={horizon === 36 ? 2 : 0} />
            <YAxis fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Legend />
            <Bar dataKey="confirmedCollections" stackId="rev" fill="#10b981" name="Confirmed" />
            <Bar dataKey="scheduledEmis" stackId="rev" fill="hsl(var(--primary))" name="Scheduled EMI" />
            <Bar dataKey="continuationRevenue" stackId="rev" fill="#6366f1" name="Continuation" />
            <Bar dataKey="newAdmissionForecast" stackId="rev" fill="#f59e0b" name="New Admissions" />
            <Line type="monotone" dataKey="netProjectedRevenue" stroke="#1A1A1A" strokeWidth={2} name="Net Projection" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* 3-year strategic table */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">3-Year Strategic Projection</h3>
          <Badge variant="outline" className="text-[11px]">Continuation Y1→Y2: {(cont.y1ToY2 * 100).toFixed(0)}% · Y2→Y3: {(cont.y2ToY3 * 100).toFixed(0)}%</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Conservative</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Growth</TableHead>
              <TableHead className="text-right">Δ Growth vs Conservative</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearly.map(y => (
              <TableRow key={y.year}>
                <TableCell className="font-semibold">{y.year}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtINR(y.conservative)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmtINR(y.expected)}</TableCell>
                <TableCell className="text-right tabular-nums text-success">{fmtINR(y.growth)}</TableCell>
                <TableCell className="text-right tabular-nums">+{fmtINR(y.growth - y.conservative)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{fmtINR(yearly.reduce((s, y) => s + y.conservative, 0))}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtINR(yearly.reduce((s, y) => s + y.expected, 0))}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtINR(yearly.reduce((s, y) => s + y.growth, 0))}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Course + Source breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue by Course</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={courseBreak} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${v/1000}k`} />
              <YAxis type="category" dataKey="name" fontSize={10} width={110} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue by Source / Stream</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sourceBreak} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name.split(" ")[0]}>
                {sourceBreak.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtINR(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Risk ledger */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-warning" /> Risk Ledger · Students at risk of dropout
          </h3>
          <Badge variant="outline" className="text-[11px]">{risk.length} flagged · {fmtINR(riskRevenueAtStake)} at stake</Badge>
        </div>
        {risk.length === 0 ? (
          <p className="text-xs text-muted-foreground">No risk flags. All students within healthy thresholds.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Missed EMI</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead>Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risk.slice(0, 12).map(r => (
                  <TableRow key={r.invoiceId}>
                    <TableCell><span className="font-medium">{r.studentName}</span><span className="block text-[10px] text-muted-foreground font-mono">{r.invoiceNo}</span></TableCell>
                    <TableCell className="text-xs">{r.course || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(r.balanceDue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.emisMissed}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.attendanceScore}%</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{r.dropoutRiskScore}</TableCell>
                    <TableCell>
                      <Badge variant={r.riskLevel === "high" ? "destructive" : r.riskLevel === "medium" ? "secondary" : "outline"} className="text-[10px] capitalize">
                        {r.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
