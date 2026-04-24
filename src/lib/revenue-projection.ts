/**
 * Revenue Projection Engine
 * Pure-derivation library — no own state. Reads from finance-store + master-schema.
 *
 * Layers per the spec:
 *   1. collected_revenue        – payments already received
 *   2. scheduled_emi_revenue    – future EMIs already committed
 *   3. continuing_revenue       – Y2/Y3 from long-duration courses (BVoc etc.)
 *   4. new_admission_forecast   – linear trend of last 6 months × scenario
 *   5. risk_adjusted_revenue    – after default/dropout/recovery deductions
 *
 * Scenarios: conservative / expected / growth.
 */
import type { Invoice, Payment, EmiSchedule } from "./finance-types";

// ────────────────────────────── Types ──────────────────────────────
export type ScenarioKey = "conservative" | "expected" | "growth";

export interface ScenarioParams {
  admissionMultiplier: number;
  emiRecoveryRate: number;
}

export const DEFAULT_SCENARIOS: Record<ScenarioKey, ScenarioParams> = {
  conservative: { admissionMultiplier: 0.8, emiRecoveryRate: 0.8 },
  expected:     { admissionMultiplier: 1.0, emiRecoveryRate: 0.9 },
  growth:       { admissionMultiplier: 1.25, emiRecoveryRate: 0.93 },
};

export interface ContinuationRates {
  y1ToY2: number; // default 0.82
  y2ToY3: number; // default 0.74
}
export const DEFAULT_CONTINUATION: ContinuationRates = { y1ToY2: 0.82, y2ToY3: 0.74 };

export interface MonthBucket {
  month: string;          // YYYY-MM
  label: string;          // "Jan '26"
  confirmedCollections: number;
  scheduledEmis: number;
  continuationRevenue: number;
  newAdmissionForecast: number;
  riskLeakage: number;          // negative effect, expressed as positive deduction
  netProjectedRevenue: number;
}

export interface ProjectionInput {
  invoices: Invoice[];
  payments: Payment[];
  emiSchedules: EmiSchedule[];
  horizonMonths: number;          // 12 or 36
  scenario: ScenarioKey;
  continuation?: ContinuationRates;
  scenarios?: Record<ScenarioKey, ScenarioParams>;
}

// Long-duration courses that generate continuation revenue.
// Heuristic: any course fee > ₹2L treated as multi-year track (BVoc / 36-month).
export function isLongDuration(invoice: Invoice): boolean {
  return invoice.total > 200000;
}

// ────────────────────────────── Helpers ──────────────────────────────
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d: Date) =>
  `${d.toLocaleString("en-IN", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function buildEmptyMonths(horizon: number): MonthBucket[] {
  const start = new Date();
  start.setDate(1);
  const out: MonthBucket[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = addMonths(start, i);
    out.push({
      month: monthKey(d), label: monthLabel(d),
      confirmedCollections: 0, scheduledEmis: 0,
      continuationRevenue: 0, newAdmissionForecast: 0,
      riskLeakage: 0, netProjectedRevenue: 0,
    });
  }
  return out;
}

// ────────────────────────────── Layer 1: Collected (TI only) ──────────────────────────────
// "Confirmed collections" = payments received against TI (Tax Invoices) only.
// PI payments — if any leak in via legacy data — are excluded so collected revenue
// is never double-counted with PI receivables.
function applyConfirmedCollections(buckets: MonthBucket[], payments: Payment[], invoices: Invoice[]) {
  const tiIds = new Set(invoices.filter(i => i.invoiceType === "TI").map(i => i.id));
  const byMonth = new Map<string, number>();
  payments.forEach(p => {
    // Only count payments linked to a TI (or unlinked legacy payments treated as TI-equivalent).
    if (p.invoiceId && !tiIds.has(p.invoiceId)) return;
    const k = monthKey(new Date(p.paidOn));
    byMonth.set(k, (byMonth.get(k) || 0) + p.amount);
  });
  buckets.forEach(b => {
    b.confirmedCollections = byMonth.get(b.month) || 0;
  });
}

// ────────────────────────────── Layer 2: Scheduled EMIs (TI-backed only) ──────────────────────────────
// Open PI receivables flow through the dedicated PI receivables layer (computePiReceivableSchedule),
// not via EMIs. Scheduled EMIs only count when the underlying invoice is a TI.
function applyScheduledEmis(buckets: MonthBucket[], emis: EmiSchedule[], invoices: Invoice[], recoveryRate: number) {
  const tiIds = new Set(invoices.filter(i => i.invoiceType === "TI").map(i => i.id));
  const byMonth = new Map<string, number>();
  emis.forEach(e => {
    if (e.status === "Paid") return;
    if (e.invoiceId && !tiIds.has(e.invoiceId)) return;
    const k = monthKey(new Date(e.dueDate));
    byMonth.set(k, (byMonth.get(k) || 0) + e.amount * recoveryRate);
  });
  buckets.forEach(b => {
    b.scheduledEmis = byMonth.get(b.month) || 0;
  });
}

// ────────────────────────────── Layer 3: Continuation ──────────────────────────────
// For long-duration enrolments, assume a renewal in the same calendar month
// of year 2 and year 3, scaled by continuation rates.
function applyContinuation(buckets: MonthBucket[], invoices: Invoice[], rates: ContinuationRates) {
  invoices.filter(isLongDuration).forEach(inv => {
    const issued = new Date(inv.issueDate);
    const annualRevenue = inv.total / 3; // approximate per-year split for 3-year track
    const y2 = monthKey(addMonths(issued, 12));
    const y3 = monthKey(addMonths(issued, 24));
    buckets.forEach(b => {
      if (b.month === y2) b.continuationRevenue += annualRevenue * rates.y1ToY2;
      if (b.month === y3) b.continuationRevenue += annualRevenue * rates.y1ToY2 * rates.y2ToY3;
    });
  });
}

// ────────────────────────────── Layer 4: New-admission forecast ──────────────────────────────
// Linear trend (least-squares slope) over last 6 months of admission count + avg ticket size.
export interface AdmissionTrend {
  monthlyCounts: { month: string; count: number; revenue: number }[];
  avgTicket: number;
  slope: number;          // additional admissions per month
  intercept: number;      // admissions in month 0 of regression
  baselineMonthly: number; // last observed month count, fallback
}

export function computeAdmissionTrend(invoices: Invoice[], windowMonths = 6): AdmissionTrend {
  const now = new Date();
  const start = addMonths(now, -windowMonths);
  start.setDate(1);
  const buckets = new Map<string, { count: number; revenue: number }>();
  for (let i = 0; i < windowMonths; i++) {
    const d = addMonths(start, i);
    buckets.set(monthKey(d), { count: 0, revenue: 0 });
  }
  invoices.forEach(inv => {
    const k = monthKey(new Date(inv.issueDate));
    const b = buckets.get(k);
    if (b) { b.count += 1; b.revenue += inv.total; }
  });
  const monthlyCounts = Array.from(buckets.entries()).map(([month, v]) => ({
    month, count: v.count, revenue: v.revenue,
  }));
  const totalCount = monthlyCounts.reduce((s, m) => s + m.count, 0);
  const totalRev = monthlyCounts.reduce((s, m) => s + m.revenue, 0);
  const avgTicket = totalCount > 0 ? totalRev / totalCount : 50000;

  // Least-squares slope on counts
  const n = monthlyCounts.length;
  const xs = monthlyCounts.map((_, i) => i);
  const ys = monthlyCounts.map(m => m.count);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const baselineMonthly = monthlyCounts[monthlyCounts.length - 1]?.count || meanY || 1;

  return { monthlyCounts, avgTicket, slope, intercept, baselineMonthly };
}

function applyNewAdmissionForecast(
  buckets: MonthBucket[],
  trend: AdmissionTrend,
  scenario: ScenarioParams,
) {
  // The trend window ends at "today's month" (offset = windowMonths-1 in regression coords).
  // First projection bucket [0] corresponds to next-month-after-window.
  const offsetStart = trend.monthlyCounts.length;
  buckets.forEach((b, i) => {
    if (b.confirmedCollections > 0 || b.scheduledEmis > 0) {
      // Mix in some forecast as well — these months are "current+future", forecast still applies.
    }
    const x = offsetStart + i;
    const projectedCount = Math.max(0, trend.intercept + trend.slope * x) * scenario.admissionMultiplier;
    b.newAdmissionForecast = projectedCount * trend.avgTicket;
  });
  // Suppress forecast for the *current* month (already partially captured by confirmed)
  if (buckets[0]) buckets[0].newAdmissionForecast *= 0.3;
}

// ────────────────────────────── Layer 5: Risk leakage ──────────────────────────────
function applyRiskLeakage(buckets: MonthBucket[], scenario: ScenarioParams) {
  const leakRate = 1 - scenario.emiRecoveryRate;
  buckets.forEach(b => {
    // Leakage applies on EMIs and continuation (both are "expected but uncertain").
    b.riskLeakage = (b.scheduledEmis + b.continuationRevenue) * leakRate * 0.5;
  });
}

function finalize(buckets: MonthBucket[]) {
  buckets.forEach(b => {
    b.netProjectedRevenue =
      b.confirmedCollections + b.scheduledEmis + b.continuationRevenue + b.newAdmissionForecast - b.riskLeakage;
    // Clamp tiny floats
    (Object.keys(b) as (keyof MonthBucket)[]).forEach(k => {
      if (typeof b[k] === "number") (b as unknown as Record<string, number>)[k] = Math.round(b[k] as number);
    });
  });
}

// ────────────────────────────── Public ──────────────────────────────
export function projectMonthly(input: ProjectionInput): MonthBucket[] {
  const horizon = Math.max(1, input.horizonMonths);
  const scenarios = input.scenarios ?? DEFAULT_SCENARIOS;
  const scenario = scenarios[input.scenario] ?? DEFAULT_SCENARIOS.expected;
  const continuation = input.continuation ?? DEFAULT_CONTINUATION;

  const buckets = buildEmptyMonths(horizon);
  applyConfirmedCollections(buckets, input.payments, input.invoices);
  applyScheduledEmis(buckets, input.emiSchedules, input.invoices, scenario.emiRecoveryRate);
  applyContinuation(buckets, input.invoices, continuation);

  const trend = computeAdmissionTrend(input.invoices, 6);
  applyNewAdmissionForecast(buckets, trend, scenario);
  applyRiskLeakage(buckets, scenario);
  finalize(buckets);
  return buckets;
}

export interface YearProjection {
  year: number;
  conservative: number;
  expected: number;
  growth: number;
}

/** 3-year strategic table — sums monthly projection per scenario across 12-month windows. */
export function projectYearly(
  invoices: Invoice[],
  payments: Payment[],
  emiSchedules: EmiSchedule[],
  continuation: ContinuationRates = DEFAULT_CONTINUATION,
  scenarios: Record<ScenarioKey, ScenarioParams> = DEFAULT_SCENARIOS,
): YearProjection[] {
  const out: YearProjection[] = [];
  const totals: Record<ScenarioKey, number[]> = { conservative: [0,0,0], expected: [0,0,0], growth: [0,0,0] };
  (Object.keys(scenarios) as ScenarioKey[]).forEach(scn => {
    const months = projectMonthly({ invoices, payments, emiSchedules, horizonMonths: 36, scenario: scn, continuation, scenarios });
    months.forEach((m, i) => {
      const yearIdx = Math.floor(i / 12);
      totals[scn][yearIdx] += m.netProjectedRevenue;
    });
  });
  const currentYear = new Date().getFullYear();
  for (let y = 0; y < 3; y++) {
    out.push({
      year: currentYear + y,
      conservative: Math.round(totals.conservative[y]),
      expected: Math.round(totals.expected[y]),
      growth: Math.round(totals.growth[y]),
    });
  }
  return out;
}

// ────────────────────────────── EMI auto-metrics ──────────────────────────────
export interface EmiMetrics {
  todayDue: number;
  weekDue: number;
  monthDue: number;
  overdueTotal: number;
  next30Expected: number;
}

export function computeEmiMetrics(emis: EmiSchedule[]): EmiMetrics {
  const now = new Date();
  const todayKey = now.toDateString();
  const weekEnd = addMonths(now, 0); weekEnd.setDate(now.getDate() + 7);
  const monthEnd = addMonths(now, 1);
  const day30 = addMonths(now, 0); day30.setDate(now.getDate() + 30);
  let todayDue = 0, weekDue = 0, monthDue = 0, overdueTotal = 0, next30Expected = 0;
  emis.forEach(e => {
    if (e.status === "Paid") return;
    const due = new Date(e.dueDate);
    if (due.toDateString() === todayKey) todayDue += e.amount;
    if (due >= now && due <= weekEnd) weekDue += e.amount;
    if (due >= now && due <= monthEnd) monthDue += e.amount;
    if (due >= now && due <= day30) next30Expected += e.amount;
    if (due < now) overdueTotal += e.amount;
  });
  return { todayDue, weekDue, monthDue, overdueTotal, next30Expected };
}

// ────────────────────────────── Risk scoring ──────────────────────────────
export type RiskLevel = "low" | "medium" | "high";

export interface StudentRiskRow {
  studentId: string;
  studentName: string;
  invoiceId: string;
  invoiceNo: string;
  course?: string;
  totalDue: number;
  balanceDue: number;
  emisMissed: number;
  overdueAmount: number;
  paymentDisciplineScore: number; // 0..100, higher is better
  attendanceScore: number;        // mock 60..100
  dropoutRiskScore: number;       // 0..100, higher = riskier
  riskLevel: RiskLevel;
}

/**
 * Rule-based risk score:
 *   - 2+ missed EMIs                  → +35
 *   - overdue ratio > 30% of total     → +25
 *   - attendance < 60                  → +25
 *   - balance > 50% & past due date    → +15
 */
export function computeStudentRisk(
  invoices: Invoice[],
  emis: EmiSchedule[],
): StudentRiskRow[] {
  const now = Date.now();
  return invoices
    .filter(i => i.status !== "Cancelled")
    .map(inv => {
      const myEmis = emis.filter(e => e.invoiceId === inv.id);
      const overdue = myEmis.filter(e => e.status !== "Paid" && new Date(e.dueDate).getTime() < now);
      const overdueAmount = overdue.reduce((s, e) => s + e.amount, 0);
      const balanceDue = Math.max(0, inv.total - inv.amountPaid);
      const emisMissed = overdue.length;
      const overdueRatio = inv.total > 0 ? overdueAmount / inv.total : 0;
      // Mock attendance — derive from invoice id hash so it's stable per record
      const seed = Array.from(inv.id).reduce((s, c) => s + c.charCodeAt(0), 0);
      const attendanceScore = 60 + (seed % 40);
      const paymentDisciplineScore = Math.max(0, 100 - emisMissed * 25 - Math.round(overdueRatio * 50));
      let score = 0;
      if (emisMissed >= 2) score += 35;
      if (overdueRatio > 0.3) score += 25;
      if (attendanceScore < 60) score += 25;
      if (balanceDue > inv.total * 0.5 && new Date(inv.dueDate).getTime() < now) score += 15;
      score = Math.min(100, score);
      const riskLevel: RiskLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
      return {
        studentId: inv.customerId,
        studentName: inv.customerName,
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        course: inv.programName,
        totalDue: inv.total,
        balanceDue,
        emisMissed,
        overdueAmount,
        paymentDisciplineScore,
        attendanceScore,
        dropoutRiskScore: score,
        riskLevel,
      };
    })
    .filter(r => r.balanceDue > 0 || r.emisMissed > 0)
    .sort((a, b) => b.dropoutRiskScore - a.dropoutRiskScore);
}

// ────────────────────────────── Course / source breakdowns ──────────────────────────────
export interface BreakdownRow { name: string; value: number; count: number }

export function revenueByCourse(invoices: Invoice[]): BreakdownRow[] {
  const m = new Map<string, { value: number; count: number }>();
  invoices.forEach(i => {
    const k = i.programName || i.revenueStream;
    const cur = m.get(k) || { value: 0, count: 0 };
    cur.value += i.total; cur.count += 1;
    m.set(k, cur);
  });
  return Array.from(m.entries()).map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value);
}

export function revenueBySource(invoices: Invoice[]): BreakdownRow[] {
  const m = new Map<string, { value: number; count: number }>();
  invoices.forEach(i => {
    const cur = m.get(i.revenueStream) || { value: 0, count: 0 };
    cur.value += i.total; cur.count += 1;
    m.set(i.revenueStream, cur);
  });
  return Array.from(m.entries()).map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value);
}

// ────────────────────────────── Headline KPIs ──────────────────────────────
export interface RevenueKpis {
  mrr: number;             // Monthly Recurring Revenue (avg of last 3 months collections)
  ltv: number;             // Avg Lifetime Value per student
  collectionEfficiency: number; // 0..1
  realizationPct: number;       // collected / billed
  overdueRatio: number;         // overdue / billed
  cacPaybackMonths: number;     // simplistic = avg ticket / monthly burn
}

export function computeRevenueKpis(
  invoices: Invoice[],
  payments: Payment[],
  monthlyBurn: number,
): RevenueKpis {
  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const overdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + (i.total - i.amountPaid), 0);

  const now = new Date();
  const last3MonthsKeys = [0, 1, 2].map(o => monthKey(addMonths(now, -o)));
  const last3Sum = payments.filter(p => last3MonthsKeys.includes(monthKey(new Date(p.paidOn))))
    .reduce((s, p) => s + p.amount, 0);
  const mrr = last3Sum / 3;

  const studentCount = new Set(invoices.map(i => i.customerId)).size || 1;
  const ltv = totalBilled / studentCount;
  const avgTicket = invoices.length > 0 ? totalBilled / invoices.length : 0;

  return {
    mrr,
    ltv,
    collectionEfficiency: totalBilled > 0 ? totalCollected / totalBilled : 0,
    realizationPct: totalBilled > 0 ? totalCollected / totalBilled : 0,
    overdueRatio: totalBilled > 0 ? overdue / totalBilled : 0,
    cacPaybackMonths: monthlyBurn > 0 ? Math.max(0, avgTicket / monthlyBurn) : 0,
  };
}

// ────────────────────────────── PI / TI split (dashboards) ──────────────────────────────
export interface PiTiSplit {
  /** Sum of TI totals — recognized / realized billing. */
  realizedRevenueBilled: number;
  /** Cash actually collected on TI invoices. */
  realizedRevenueCollected: number;
  /** Open PI total (issued but not converted) — pure receivable pipeline. */
  piReceivableOpen: number;
  /** All PI raised in window (regardless of state). */
  piRaised: number;
  /** PI amount converted to TI so far. */
  piConverted: number;
  /** Conversion %. */
  piToTiConversionPct: number;
  /** GST collected on TI only — what actually creates GST liability. */
  gstFromTi: number;
  /** Receivable aging on PI only. */
  piAgingBuckets: { bucket: string; amount: number; count: number }[];
}

export function computePiTiSplit(
  invoices: Invoice[],
  payments: Payment[],
  piOpenBalanceFn: (invoiceId: string) => number,
): PiTiSplit {
  const ti = invoices.filter(i => i.invoiceType === "TI" && i.status !== "Cancelled");
  const pi = invoices.filter(i => i.invoiceType === "PI" && i.status !== "Cancelled");
  const tiIds = new Set(ti.map(i => i.id));

  const realizedRevenueBilled = ti.reduce((s, i) => s + i.total, 0);
  const realizedRevenueCollected = payments
    .filter(p => !p.invoiceId || tiIds.has(p.invoiceId))
    .reduce((s, p) => s + p.amount, 0);
  const piRaised = pi.reduce((s, i) => s + i.total, 0);
  const piReceivableOpen = pi.reduce((s, i) => s + piOpenBalanceFn(i.id), 0);
  const piConverted = Math.max(0, piRaised - piReceivableOpen);
  const piToTiConversionPct = piRaised > 0 ? Math.round((piConverted / piRaised) * 100) : 0;
  const gstFromTi = ti.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);

  const now = Date.now();
  const buckets: Record<string, { amount: number; count: number }> = {
    "0-30": { amount: 0, count: 0 },
    "31-60": { amount: 0, count: 0 },
    "61-90": { amount: 0, count: 0 },
    "90+":   { amount: 0, count: 0 },
  };
  pi.forEach(i => {
    const open = piOpenBalanceFn(i.id);
    if (open <= 0) return;
    const days = Math.floor((now - new Date(i.dueDate).getTime()) / 86400000);
    const k = days < 30 ? "0-30" : days < 60 ? "31-60" : days < 90 ? "61-90" : "90+";
    buckets[k].amount += open;
    buckets[k].count += 1;
  });
  const piAgingBuckets = Object.entries(buckets).map(([bucket, v]) => ({ bucket, ...v }));

  return {
    realizedRevenueBilled,
    realizedRevenueCollected,
    piReceivableOpen,
    piRaised,
    piConverted,
    piToTiConversionPct,
    gstFromTi,
    piAgingBuckets,
  };
}

/** PI vs TI monthly trend (last `months` months). */
export interface PiTiMonthlyPoint {
  month: string;
  label: string;
  piRaised: number;
  tiGenerated: number;
  collected: number;
}

export function computePiTiMonthlyTrend(
  invoices: Invoice[],
  payments: Payment[],
  months = 6,
): PiTiMonthlyPoint[] {
  const out: PiTiMonthlyPoint[] = [];
  const start = new Date();
  start.setDate(1);
  const tiIds = new Set(invoices.filter(i => i.invoiceType === "TI").map(i => i.id));
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(start, -i);
    const k = monthKey(d);
    const piRaised = invoices.filter(inv => inv.invoiceType === "PI" && monthKey(new Date(inv.issueDate)) === k)
      .reduce((s, inv) => s + inv.total, 0);
    const tiGenerated = invoices.filter(inv => inv.invoiceType === "TI" && monthKey(new Date(inv.issueDate)) === k)
      .reduce((s, inv) => s + inv.total, 0);
    const collected = payments.filter(p => (!p.invoiceId || tiIds.has(p.invoiceId)) && monthKey(new Date(p.paidOn)) === k)
      .reduce((s, p) => s + p.amount, 0);
    out.push({ month: k, label: monthLabel(d), piRaised, tiGenerated, collected });
  }
  return out;
}

