import { useMemo, useState } from "react";
import { store, COURSE_FEE_TIERS, getFeeBand } from "@/lib/mock-data";
import { MASTER_COURSES } from "@/lib/master-schema";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign, Target, TrendingUp, AlertTriangle, BarChart3,
  GraduationCap, Users, Zap, Star, Activity, Bell, Settings,
  ChevronDown, ChevronUp, Save, ArrowUpRight, ArrowDownRight,
  Phone, CheckCircle2, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const CHART_COLORS = [
  "hsl(358, 78%, 51%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)",
  "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(320, 70%, 50%)", "hsl(45, 90%, 45%)",
];

const STORAGE_KEY = "crm_revenue_targets";

function getTargets() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return { monthlyTarget: 600000, roasTarget: 10, maxCPA: 6500 };
}
function saveTargets(t: { monthlyTarget: number; roasTarget: number; maxCPA: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export default function RevenueAnalyticsPage() {
  const campaigns = store.getCampaigns();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const callLogs = store.getCallLogs();
  const followUps = store.getFollowUps();
  const users = store.getUsers();
  const courses = store.getCourses();

  const [targets, setTargets] = useState(getTargets);
  const [editingTargets, setEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState(targets);
  const [activeTab, setActiveTab] = useState("overview");

  // Core metrics
  const totalRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const cpa = admissions.length > 0 ? Math.round(totalSpend / admissions.length) : 0;
  const avgTicket = admissions.length > 0 ? Math.round(totalRevenue / admissions.length) : 0;
  const admissionsNeeded = avgTicket > 0 ? Math.ceil(targets.monthlyTarget / avgTicket) : 0;
  const revenueRemaining = Math.max(0, targets.monthlyTarget - totalRevenue);
  const roasOnTrack = roas >= targets.roasTarget;
  const cpaOnTrack = cpa <= targets.maxCPA || admissions.length === 0;

  // Course priority scoring
  const coursePriority = useMemo(() => {
    return MASTER_COURSES.map((c) => {
      const fee = c.course_fee;
      const courseLeads = leads.filter((l) => l.interestedCourse === c.course_name && l.status !== "Lost");
      const courseAdmissions = admissions.filter((a) => a.courseSelected === c.course_name);
      const revenue = courseAdmissions.reduce((s, a) => s + (a.totalFee || 0), 0);
      const convRate = courseLeads.length > 0 ? (courseAdmissions.length / courseLeads.length) * 100 : 0;
      // Priority: higher fee = higher weight, also consider demand & conversion
      const revenueWeight = fee >= 160000 ? 3 : fee >= 90000 ? 2 : 1;
      const demandWeight = courseLeads.length >= 5 ? 3 : courseLeads.length >= 2 ? 2 : 1;
      const convWeight = convRate >= 20 ? 3 : convRate >= 10 ? 2 : 1;
      const priorityScore = revenueWeight * 40 + demandWeight * 30 + convWeight * 30;
      // Course-level ROAS
      const courseCampaigns = campaigns.filter((camp) => {
        return leads.some((l) => l.campaignId === camp.id && l.interestedCourse === c.course_name);
      });
      const courseSpend = courseCampaigns.reduce((s, camp) => s + (camp.budget || 0), 0) / Math.max(courseCampaigns.length, 1);
      const courseROAS = courseSpend > 0 ? revenue / courseSpend : 0;

      return {
        name: c.course_name, fee, leads: courseLeads.length,
        admissions: courseAdmissions.length, revenue, convRate: +convRate.toFixed(1),
        priorityScore, revenueWeight: revenueWeight === 3 ? "High" : revenueWeight === 2 ? "Medium" : "Low",
        demand: demandWeight === 3 ? "High" : demandWeight === 2 ? "Medium" : "Low",
        courseROAS: +courseROAS.toFixed(1),
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [leads, admissions, campaigns]);

  // Pipeline revenue forecast
  const pipelineForecast = useMemo(() => {
    const stages = [
      { stage: "Interested", probability: 0.15 },
      { stage: "Counseling", probability: 0.35 },
      { stage: "Qualified", probability: 0.55 },
      { stage: "Walk-in Scheduled", probability: 0.25 },
      { stage: "Walk-in Completed", probability: 0.50 },
      { stage: "DoJ Confirmed", probability: 0.80 },
    ];
    return stages.map((s) => {
      let stageLeads;
      if (s.stage === "Walk-in Scheduled") {
        stageLeads = leads.filter((l) => l.walkInStatus === "Scheduled");
      } else if (s.stage === "Walk-in Completed") {
        stageLeads = leads.filter((l) => l.walkInStatus === "Completed" && l.status !== "Admission");
      } else if (s.stage === "DoJ Confirmed") {
        stageLeads = leads.filter((l) => l.expectedDOJ && l.status !== "Admission");
      } else {
        stageLeads = leads.filter((l) => l.status === s.stage);
      }
      const expectedRevenue = stageLeads.reduce((sum, l) => {
        const course = courses.find((c) => c.name === l.interestedCourse);
        return sum + (course?.fee || 0) * s.probability;
      }, 0);
      return { ...s, count: stageLeads.length, expectedRevenue: Math.round(expectedRevenue) };
    });
  }, [leads, courses]);
  const totalPipelineRevenue = pipelineForecast.reduce((s, p) => s + p.expectedRevenue, 0);

  // High value leads (course fee >= 90000)
  const highValueLeads = leads.filter((l) => {
    const course = courses.find((c) => c.name === l.interestedCourse);
    return course && course.fee >= 90000 && l.status !== "Admission" && l.status !== "Lost";
  });

  // Objection analytics
  const objectionData = useMemo(() => {
    const m = new Map<string, number>();
    leads.filter((l) => l.lostReason).forEach((l) => m.set(l.lostReason!, (m.get(l.lostReason!) || 0) + 1));
    callLogs.filter((cl) => cl.notInterestedReason).forEach((cl) => m.set(cl.notInterestedReason!, (m.get(cl.notInterestedReason!) || 0) + 1));
    return Array.from(m.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [leads, callLogs]);

  // Telecaller performance
  const telecallers = users.filter((u) => u.role === "telecaller");
  const tcPerf = telecallers.map((tc) => {
    const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
    const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
    const connected = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
    const walkIns = leads.filter((l) => l.assignedTelecallerId === tc.id && l.walkInStatus && l.walkInStatus !== "Not Scheduled");
    const converted = admissions.filter((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      return lead?.assignedTelecallerId === tc.id;
    });
    const per100 = assigned.length > 0 ? +((converted.length / assigned.length) * 100).toFixed(1) : 0;
    return { name: tc.name, assigned: assigned.length, calls: calls.length, connected: connected.length, walkIns: walkIns.length, admissions: converted.length, per100 };
  });

  // Counselor revenue
  const counselors = users.filter((u) => u.role === "counselor");
  const counselorPerf = counselors.map((co) => {
    const assigned = leads.filter((l) => l.assignedCounselor === co.id);
    const walkIns = assigned.filter((l) => l.walkInStatus === "Completed");
    const converted = admissions.filter((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      return lead?.assignedCounselor === co.id;
    });
    const revenue = converted.reduce((s, a) => s + (a.totalFee || 0), 0);
    return { name: co.name, walkIns: walkIns.length, discussions: assigned.filter((l) => l.counselingOutcome).length, admissions: converted.length, revenue };
  });

  // Walk-in metrics
  const walkInScheduled = leads.filter((l) => l.walkInStatus === "Scheduled" || l.walkInStatus === "Completed" || l.walkInStatus === "No Show");
  const walkInCompleted = leads.filter((l) => l.walkInStatus === "Completed");
  const walkInAdmissions = admissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead?.walkInStatus === "Completed";
  });
  const walkInConvRate = walkInCompleted.length > 0 ? ((walkInAdmissions.length / walkInCompleted.length) * 100).toFixed(1) : "0";

  // Follow-up KPIs
  const totalFU = followUps.length;
  const completedFU = followUps.filter((f) => f.completed).length;
  const missedFU = followUps.filter((f) => !f.completed && f.date < new Date().toISOString().split("T")[0]).length;

  // Platform ROAS
  const platformROAS = useMemo(() => {
    const m = new Map<string, { spend: number; revenue: number }>();
    campaigns.forEach((c) => {
      const e = m.get(c.platform) || { spend: 0, revenue: 0 };
      e.spend += c.budget || 0;
      m.set(c.platform, e);
    });
    admissions.forEach((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      if (lead) {
        const camp = campaigns.find((c) => c.id === lead.campaignId);
        if (camp) {
          const e = m.get(camp.platform) || { spend: 0, revenue: 0 };
          e.revenue += a.totalFee || 0;
          m.set(camp.platform, e);
        }
      }
    });
    return Array.from(m.entries()).map(([platform, d]) => ({
      platform, ...d, roas: d.spend > 0 ? +(d.revenue / d.spend).toFixed(1) : 0,
      cpa: d.spend > 0 ? Math.round(d.spend / Math.max(admissions.filter((a) => {
        const lead = leads.find((l) => l.id === a.leadId);
        const camp = campaigns.find((c) => c.id === lead?.campaignId);
        return camp?.platform === platform;
      }).length, 1)) : 0,
    }));
  }, [campaigns, leads, admissions]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: "error" | "warning" | "info"; msg: string }[] = [];
    if (!roasOnTrack && totalSpend > 0) items.push({ type: "error", msg: `ROAS is ${roas.toFixed(1)}x — below ${targets.roasTarget}x target.` });
    if (!cpaOnTrack) items.push({ type: "error", msg: `Cost per admission is ₹${cpa.toLocaleString()} — exceeds ₹${targets.maxCPA.toLocaleString()} threshold.` });
    if (totalRevenue < targets.monthlyTarget * 0.5) items.push({ type: "warning", msg: `Revenue is below 50% of ₹${(targets.monthlyTarget / 100000).toFixed(0)}L target.` });
    const lowConvTC = tcPerf.filter((t) => t.per100 < 5 && t.assigned > 5);
    lowConvTC.forEach((t) => items.push({ type: "warning", msg: `${t.name} has low conversion (${t.per100}% per 100 leads).` }));
    if (parseFloat(walkInConvRate) < 30 && walkInCompleted.length > 2) items.push({ type: "warning", msg: `Walk-in conversion is ${walkInConvRate}% — consider improving counseling.` });
    if (missedFU > 3) items.push({ type: "warning", msg: `${missedFU} follow-ups overdue — missed follow-ups reduce admissions.` });
    return items;
  }, [roasOnTrack, cpaOnTrack, roas, cpa, totalRevenue, targets, tcPerf, walkInConvRate, walkInCompleted, missedFU]);

  // Insights / suggestions
  const insights = useMemo(() => {
    const items: string[] = [];
    const topCourse = coursePriority[0];
    if (topCourse) items.push(`"${topCourse.name}" has highest priority score — focus counseling slots here.`);
    const highDemand = coursePriority.filter((c) => c.demand === "High");
    highDemand.forEach((c) => items.push(`"${c.name}" showing high demand (${c.leads} leads).`));
    const bestPlatform = platformROAS.sort((a, b) => b.roas - a.roas)[0];
    if (bestPlatform && bestPlatform.roas > 0) items.push(`${bestPlatform.platform} producing best ROAS (${bestPlatform.roas}x) — consider increasing budget.`);
    const lowestCPA = platformROAS.filter((p) => p.cpa > 0).sort((a, b) => a.cpa - b.cpa)[0];
    if (lowestCPA) items.push(`${lowestCPA.platform} has lowest CPA (₹${lowestCPA.cpa}) — most cost-efficient channel.`);
    const topTC = tcPerf.sort((a, b) => b.per100 - a.per100)[0];
    if (topTC && topTC.per100 > 0) items.push(`${topTC.name} leads telecaller conversion at ${topTC.per100}%.`);
    const topCounselor = counselorPerf.sort((a, b) => b.revenue - a.revenue)[0];
    if (topCounselor && topCounselor.revenue > 0) items.push(`${topCounselor.name} generated ₹${topCounselor.revenue.toLocaleString()} in admissions.`);
    return items.slice(0, 6);
  }, [coursePriority, platformROAS, tcPerf, counselorPerf]);

  const handleSaveTargets = () => {
    setTargets(tempTargets);
    saveTargets(tempTargets);
    setEditingTargets(false);
    toast.success("Revenue targets updated.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Revenue & ROAS Engine</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Revenue optimization, cost control & strategic insights</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setEditingTargets(!editingTargets); setTempTargets(targets); }} className="text-xs self-start sm:self-auto">
          <Settings className="mr-1 h-3.5 w-3.5" /> Targets
        </Button>
      </div>

      {/* Target editor */}
      {editingTargets && (
        <div className="rounded-xl bg-card p-5 shadow-card border-2 border-primary/20 animate-in slide-in-from-top-2">
          <h3 className="text-sm font-semibold text-card-foreground mb-3">Revenue Targets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Monthly Revenue Target (₹)</Label>
              <Input type="number" value={tempTargets.monthlyTarget} onChange={(e) => setTempTargets({ ...tempTargets, monthlyTarget: +e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Target ROAS (x)</Label>
              <Input type="number" value={tempTargets.roasTarget} onChange={(e) => setTempTargets({ ...tempTargets, roasTarget: +e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Max Cost Per Admission (₹)</Label>
              <Input type="number" value={tempTargets.maxCPA} onChange={(e) => setTempTargets({ ...tempTargets, maxCPA: +e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditingTargets(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSaveTargets} className="text-xs"><Save className="mr-1 h-3.5 w-3.5" /> Save Targets</Button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${a.type === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : a.type === "warning" ? "border-warning/30 bg-warning/5 text-warning" : "border-primary/30 bg-primary/5 text-primary"}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard title="Revenue" value={`₹${(totalRevenue / 100000).toFixed(1)}L`} icon={<DollarSign className="h-5 w-5" />} trend={totalRevenue >= targets.monthlyTarget ? "Target met ✓" : undefined} />
        <StatCard title="Target" value={`₹${(targets.monthlyTarget / 100000).toFixed(0)}L`} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Remaining" value={`₹${(revenueRemaining / 100000).toFixed(1)}L`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} trend={`Need ${Math.max(0, admissionsNeeded - admissions.length)} more`} />
        <StatCard title="ROAS" value={`${roas.toFixed(1)}x`} icon={<BarChart3 className="h-5 w-5" />} trend={roasOnTrack ? `≥${targets.roasTarget}x ✓` : `< ${targets.roasTarget}x ✗`} className={roasOnTrack ? "" : "border-destructive/20"} />
        <StatCard title="CPA" value={`₹${cpa.toLocaleString()}`} icon={<Target className="h-5 w-5" />} trend={cpaOnTrack ? `≤₹${targets.maxCPA} ✓` : `> ₹${targets.maxCPA} ✗`} className={cpaOnTrack ? "" : "border-destructive/20"} />
        <StatCard title="Avg Ticket" value={`₹${avgTicket.toLocaleString()}`} icon={<Star className="h-5 w-5" />} />
        <StatCard title="High Value" value={highValueLeads.length} icon={<Zap className="h-5 w-5" />} trend="₹90k+ courses" />
      </div>

      {/* Admission target calculator */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Admission Target Calculator</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly Target</p>
            <p className="text-xl font-bold text-card-foreground">₹{(targets.monthlyTarget / 100000).toFixed(0)}L</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg Ticket Size</p>
            <p className="text-xl font-bold text-card-foreground">₹{avgTicket.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Admissions Needed</p>
            <p className="text-xl font-bold text-primary">{admissionsNeeded}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Current / Remaining</p>
            <p className="text-xl font-bold text-card-foreground">{admissions.length} <span className="text-sm text-muted-foreground">/ {Math.max(0, admissionsNeeded - admissions.length)}</span></p>
          </div>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((totalRevenue / targets.monthlyTarget) * 100, 100)}%` }} />
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">{((totalRevenue / targets.monthlyTarget) * 100).toFixed(0)}% of monthly target achieved</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm">Courses</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm">Pipeline</TabsTrigger>
          <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
          <TabsTrigger value="marketing" className="text-xs sm:text-sm">Marketing</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW ═══ */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ROAS Dashboard */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Real-Time ROAS</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marketing Spend</span>
                  <span className="font-semibold text-card-foreground">₹{totalSpend.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue Generated</span>
                  <span className="font-semibold text-success">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current ROAS</span>
                  <span className={`text-xl font-bold ${roasOnTrack ? "text-success" : "text-destructive"}`}>{roas.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target ROAS</span>
                  <span className="font-semibold text-card-foreground">{targets.roasTarget}x</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${roasOnTrack ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min((roas / targets.roasTarget) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Daily tracker */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Daily Admission Tracker</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Admissions Today</span>
                  <span className="font-semibold text-card-foreground">{admissions.filter((a) => a.admissionDate === new Date().toISOString().split("T")[0]).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue Today</span>
                  <span className="font-semibold text-success">₹{admissions.filter((a) => a.admissionDate === new Date().toISOString().split("T")[0]).reduce((s, a) => s + (a.totalFee || 0), 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pipeline Revenue (Forecast)</span>
                  <span className="font-semibold text-primary">₹{(totalPipelineRevenue / 100000).toFixed(1)}L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Walk-in Conversion</span>
                  <span className="font-semibold text-card-foreground">{walkInConvRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Follow-up Completion</span>
                  <span className={`font-semibold ${missedFU > 3 ? "text-destructive" : "text-success"}`}>{totalFU > 0 ? ((completedFU / totalFU) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Objection analytics */}
          {objectionData.length > 0 && (
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Objection & Lost Reason Analysis</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={objectionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="reason" type="category" width={160} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" name="Occurrences" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        {/* ═══ COURSE PRIORITY ═══ */}
        <TabsContent value="courses" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> High Revenue Courses</h3>
              <div className="space-y-2">
                {coursePriority.filter((c) => c.revenueWeight === "High").map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">₹{c.fee.toLocaleString()} · {c.leads} leads</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success">{c.priorityScore}pts</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Fast Converting</h3>
              <div className="space-y-2">
                {coursePriority.filter((c) => c.convRate > 0).sort((a, b) => b.convRate - a.convRate).slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.convRate}% conv · {c.admissions} admissions</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">{c.convRate}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> High Demand</h3>
              <div className="space-y-2">
                {coursePriority.filter((c) => c.demand === "High" || c.demand === "Medium").sort((a, b) => b.leads - a.leads).slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.leads} leads · ₹{c.fee.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${c.demand === "High" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{c.demand}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full course table */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Course Priority Ranking</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Course</th>
                    <th className="pb-2 font-medium text-right">Fee</th>
                    <th className="pb-2 font-medium text-center">Leads</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                    <th className="pb-2 font-medium text-center">Conv%</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-center">ROAS</th>
                    <th className="pb-2 font-medium text-center">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {coursePriority.map((c, i) => (
                    <tr key={c.name} className="border-b last:border-0">
                      <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 font-medium text-card-foreground">{c.name}</td>
                      <td className="py-2.5 text-right text-muted-foreground">₹{c.fee.toLocaleString()}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c.leads}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c.admissions}</td>
                      <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${c.convRate >= 20 ? "bg-success/10 text-success" : c.convRate > 0 ? "bg-warning/10 text-warning" : ""}`}>{c.convRate}%</Badge></td>
                      <td className="py-2.5 text-right text-muted-foreground">₹{c.revenue.toLocaleString()}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c.courseROAS}x</td>
                      <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${c.revenueWeight === "High" ? "bg-success/10 text-success" : c.revenueWeight === "Medium" ? "bg-warning/10 text-warning" : ""}`}>{c.priorityScore}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══ PIPELINE FORECAST ═══ */}
        <TabsContent value="pipeline" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Revenue Pipeline Forecast</h3>
              <div className="space-y-2">
                {pipelineForecast.map((p) => (
                  <div key={p.stage} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{p.stage}</p>
                      <p className="text-xs text-muted-foreground">{p.count} leads · {(p.probability * 100).toFixed(0)}% probability</p>
                    </div>
                    <span className="font-semibold text-sm text-primary">₹{(p.expectedRevenue / 1000).toFixed(0)}k</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold text-card-foreground">Total Pipeline Revenue</span>
                  <span className="text-lg font-bold text-primary">₹{(totalPipelineRevenue / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>

            {/* Pipeline chart */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Pipeline Stage Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Expected Revenue"]} />
                  <Bar dataKey="expectedRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High value leads */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> High Value Leads (₹90k+ courses) — {highValueLeads.length} leads</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {highValueLeads.map((l) => {
                const course = courses.find((c) => c.name === l.interestedCourse);
                return (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-warning/20 p-3">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.interestedCourse} · ₹{(course?.fee || 0).toLocaleString()} · {l.temperature || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.admissionProbability && <Badge variant="outline" className={`text-[10px] ${l.admissionProbability === "High" || l.admissionProbability === "Very High" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.admissionProbability}</Badge>}
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">High Value</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TEAM PERFORMANCE ═══ */}
        <TabsContent value="team" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Telecaller performance */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Telecaller Conversion Efficiency</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Agent</th>
                      <th className="pb-2 font-medium text-center">Assigned</th>
                      <th className="pb-2 font-medium text-center">Calls</th>
                      <th className="pb-2 font-medium text-center">Connected</th>
                      <th className="pb-2 font-medium text-center">Walk-ins</th>
                      <th className="pb-2 font-medium text-center">Admissions</th>
                      <th className="pb-2 font-medium text-center">Per 100</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tcPerf.map((tc) => (
                      <tr key={tc.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium text-card-foreground">{tc.name}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.assigned}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.calls}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.connected}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.walkIns}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.admissions}</td>
                        <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${tc.per100 >= 10 ? "bg-success/10 text-success" : tc.per100 >= 5 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{tc.per100}%</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Counselor revenue */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Counselor Revenue Contribution</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Counselor</th>
                      <th className="pb-2 font-medium text-center">Walk-ins</th>
                      <th className="pb-2 font-medium text-center">Discussions</th>
                      <th className="pb-2 font-medium text-center">Admissions</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counselorPerf.map((co) => (
                      <tr key={co.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium text-card-foreground">{co.name}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{co.walkIns}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{co.discussions}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{co.admissions}</td>
                        <td className="py-2.5 text-right font-semibold text-success">₹{co.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Walk-in optimization */}
          <div className="grid gap-6 lg:grid-cols-3">
            <StatCard title="Walk-ins Scheduled" value={walkInScheduled.length} icon={<Calendar className="h-5 w-5" />} />
            <StatCard title="Walk-ins Completed" value={walkInCompleted.length} icon={<CheckCircle2 className="h-5 w-5" />} />
            <StatCard title="Walk-in → Admission" value={`${walkInConvRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          {/* Follow-up KPIs */}
          <div className="grid gap-6 lg:grid-cols-3">
            <StatCard title="Follow-ups Scheduled" value={totalFU} icon={<Calendar className="h-5 w-5" />} />
            <StatCard title="Follow-ups Completed" value={completedFU} icon={<CheckCircle2 className="h-5 w-5" />} />
            <StatCard title="Missed Follow-ups" value={missedFU} icon={<AlertTriangle className="h-5 w-5" />} className={missedFU > 3 ? "border-destructive/20" : ""} />
          </div>
        </TabsContent>

        {/* ═══ MARKETING ROI ═══ */}
        <TabsContent value="marketing" className="mt-4 space-y-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Spend" value={`₹${totalSpend.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="CPL" value={`₹${campaigns.reduce((s, c) => s + c.leadsGenerated, 0) > 0 ? Math.round(totalSpend / campaigns.reduce((s, c) => s + c.leadsGenerated, 0)) : 0}`} icon={<Target className="h-5 w-5" />} />
            <StatCard title="CPA" value={`₹${cpa.toLocaleString()}`} icon={<Target className="h-5 w-5" />} trend={cpaOnTrack ? "On track" : "Over budget"} className={cpaOnTrack ? "" : "border-destructive/20"} />
            <StatCard title="Overall ROAS" value={`${roas.toFixed(1)}x`} icon={<BarChart3 className="h-5 w-5" />} trend={roasOnTrack ? "Target met" : "Below target"} />
          </div>

          {/* Platform ROAS */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Platform ROAS Comparison</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={platformROAS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="platform" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="spend" name="Spend (₹)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Platform Performance Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Platform</th>
                      <th className="pb-2 font-medium text-right">Spend</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-center">ROAS</th>
                      <th className="pb-2 font-medium text-center">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformROAS.map((p) => (
                      <tr key={p.platform} className="border-b last:border-0">
                        <td className="py-2.5 font-medium text-card-foreground">{p.platform}</td>
                        <td className="py-2.5 text-right text-muted-foreground">₹{p.spend.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-success">₹{p.revenue.toLocaleString()}</td>
                        <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${p.roas >= targets.roasTarget ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{p.roas}x</Badge></td>
                        <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${p.cpa <= targets.maxCPA ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>₹{p.cpa}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Course-wise ROAS */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Course-wise ROAS</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={coursePriority.filter((c) => c.revenue > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="courseROAS" name="ROAS (x)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ═══ INSIGHTS ═══ */}
        <TabsContent value="insights" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* AI Suggestions */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Admission Acceleration Insights</h3>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3 bg-primary/5">
                    <ArrowUpRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-card-foreground">{ins}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic decisions */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Strategic Decision Support</h3>
              <div className="space-y-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Best Converting Course</p>
                  <p className="text-sm font-medium text-card-foreground">{coursePriority.filter((c) => c.convRate > 0).sort((a, b) => b.convRate - a.convRate)[0]?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{coursePriority.filter((c) => c.convRate > 0).sort((a, b) => b.convRate - a.convRate)[0]?.convRate || 0}% conversion rate</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Most Profitable Channel</p>
                  <p className="text-sm font-medium text-card-foreground">{platformROAS.sort((a, b) => b.roas - a.roas)[0]?.platform || "—"}</p>
                  <p className="text-xs text-muted-foreground">{platformROAS.sort((a, b) => b.roas - a.roas)[0]?.roas || 0}x ROAS</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Top Telecaller</p>
                  <p className="text-sm font-medium text-card-foreground">{tcPerf.sort((a, b) => b.per100 - a.per100)[0]?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{tcPerf.sort((a, b) => b.per100 - a.per100)[0]?.per100 || 0}% admission per 100 leads</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Top Counselor</p>
                  <p className="text-sm font-medium text-card-foreground">{counselorPerf.sort((a, b) => b.revenue - a.revenue)[0]?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">₹{(counselorPerf.sort((a, b) => b.revenue - a.revenue)[0]?.revenue || 0).toLocaleString()} revenue</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
