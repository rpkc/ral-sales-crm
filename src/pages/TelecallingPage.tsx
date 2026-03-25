import { useState, useMemo } from "react";
import { store } from "@/lib/mock-data";
import { CallLog, CallOutcome, Lead, Admission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, PhoneCall, Clock, TrendingDown, TrendingUp, AlertTriangle, BarChart3, Users, Target, Zap, Timer, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, FunnelChart } from "recharts";

const OUTCOMES: CallOutcome[] = ["Connected", "Not answered", "Interested", "Not interested", "Call later"];

/* ─── ATT helpers ─── */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function getLeadAge(createdAt: string): number {
  return daysBetween(createdAt, new Date().toISOString().split("T")[0]);
}

function getAgeBadge(days: number) {
  if (days <= 2) return { label: "Fresh Lead", color: "bg-success/15 text-success" };
  if (days <= 7) return { label: "Active Lead", color: "bg-primary/15 text-primary" };
  if (days <= 15) return { label: "Aging Lead", color: "bg-warning/15 text-warning" };
  return { label: "Critical", color: "bg-destructive/15 text-destructive" };
}

function getATTColor(days: number) {
  if (days <= 5) return "text-success";
  if (days <= 10) return "text-warning";
  return "text-destructive";
}

function getATTBg(days: number) {
  if (days <= 5) return "bg-success/15 text-success";
  if (days <= 10) return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}

const PIPELINE_STAGES = [
  "New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission"
] as const;

const CHART_COLORS = [
  "hsl(358, 78%, 51%)",   // primary
  "hsl(38, 92%, 50%)",    // warning
  "hsl(142, 71%, 45%)",   // success
  "hsl(220, 70%, 55%)",   // blue
  "hsl(280, 60%, 55%)",   // purple
  "hsl(180, 60%, 45%)",   // teal
];

export default function TelecallingPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>(store.getCallLogs());
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const users = store.getUsers();

  const currentUser = users.find((u) => u.id === "u3")!;
  const assignedLeads = leads.filter((l) => l.assignedTelecallerId === currentUser.id);

  const [form, setForm] = useState({ leadId: "", outcome: "" as CallOutcome, notes: "", nextFollowUp: "" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notification, setNotification] = useState<string | null>(null);

  /* ─── ATT Calculations ─── */
  const conversionData = useMemo(() => {
    return admissions.map((adm) => {
      const lead = leads.find((l) => l.id === adm.leadId);
      if (!lead) return null;
      const att = daysBetween(lead.createdAt, adm.admissionDate);
      return { ...adm, lead, att, source: lead.source, course: adm.courseSelected, telecallerId: lead.assignedTelecallerId };
    }).filter(Boolean) as (Admission & { lead: Lead; att: number; source: string; course: string; telecallerId: string })[];
  }, [admissions, leads]);

  const overallATT = useMemo(() => {
    if (conversionData.length === 0) return 0;
    return +(conversionData.reduce((s, c) => s + c.att, 0) / conversionData.length).toFixed(1);
  }, [conversionData]);

  /* Telecaller performance */
  const telecallerPerf = useMemo(() => {
    const telecallers = users.filter((u) => u.role === "telecaller");
    return telecallers.map((tc) => {
      const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
      const converted = conversionData.filter((c) => c.telecallerId === tc.id);
      const avgATT = converted.length > 0 ? +(converted.reduce((s, c) => s + c.att, 0) / converted.length).toFixed(1) : 0;
      const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
      const todayCalls = calls.filter((cl) => cl.createdAt === new Date().toISOString().split("T")[0]);
      const connectedCalls = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
      return {
        id: tc.id, name: tc.name, leadsAssigned: assigned.length,
        admissions: converted.length, avgATT, totalCalls: calls.length,
        todayCalls: todayCalls.length, connectedCalls: connectedCalls.length,
        conversionRate: assigned.length > 0 ? +((converted.length / assigned.length) * 100).toFixed(1) : 0,
      };
    });
  }, [leads, conversionData, callLogs, users]);

  /* ATT by Source */
  const sourcePerf = useMemo(() => {
    const sourceMap = new Map<string, { leads: number; admissions: number; totalATT: number }>();
    leads.forEach((l) => {
      const existing = sourceMap.get(l.source) || { leads: 0, admissions: 0, totalATT: 0 };
      existing.leads++;
      sourceMap.set(l.source, existing);
    });
    conversionData.forEach((c) => {
      const existing = sourceMap.get(c.source) || { leads: 0, admissions: 0, totalATT: 0 };
      existing.admissions++;
      existing.totalATT += c.att;
      sourceMap.set(c.source, existing);
    });
    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source, ...data, avgATT: data.admissions > 0 ? +(data.totalATT / data.admissions).toFixed(1) : 0,
    }));
  }, [leads, conversionData]);

  /* ATT by Course */
  const coursePerf = useMemo(() => {
    const courseMap = new Map<string, { leads: number; admissions: number; totalATT: number }>();
    leads.forEach((l) => {
      const existing = courseMap.get(l.interestedCourse) || { leads: 0, admissions: 0, totalATT: 0 };
      existing.leads++;
      courseMap.set(l.interestedCourse, existing);
    });
    conversionData.forEach((c) => {
      const existing = courseMap.get(c.course) || { leads: 0, admissions: 0, totalATT: 0 };
      existing.admissions++;
      existing.totalATT += c.att;
      courseMap.set(c.course, existing);
    });
    return Array.from(courseMap.entries()).map(([course, data]) => ({
      course, ...data, avgATT: data.admissions > 0 ? +(data.totalATT / data.admissions).toFixed(1) : 0,
    }));
  }, [leads, conversionData]);

  /* Pipeline stage counts */
  const pipelineCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      stage, count: leads.filter((l) => l.status === stage).length,
    }));
  }, [leads]);

  /* Smart alerts */
  const alerts = useMemo(() => {
    const items: { type: "warning" | "info"; message: string }[] = [];
    leads.forEach((l) => {
      if (l.status === "Admission" || l.status === "Lost") return;
      const age = getLeadAge(l.createdAt);
      if (l.status === "Counseling" && age > 7) {
        items.push({ type: "warning", message: `${l.name} has been in admission discussion for ${age} days. Consider escalation.` });
      }
      if (age > 2 && l.assignedTelecallerId === currentUser.id) {
        const hasCalls = callLogs.some((cl) => cl.leadId === l.id);
        if (!hasCalls) items.push({ type: "warning", message: `${l.name} has not been contacted yet (${age} days old).` });
      }
    });
    if (overallATT > 10) items.push({ type: "info", message: "Conversion cycle is increasing. Review counseling workflow." });
    return items;
  }, [leads, callLogs, currentUser.id, overallATT]);

  /* Lead stage time tracking (simulated) */
  const getStageTimeline = (lead: Lead) => {
    const activities = lead.activities || [];
    if (activities.length === 0) return [];
    const stages = [
      { type: "Lead Created", label: "New Lead" },
      { type: "Call Attempted", label: "Contact Attempted" },
      { type: "Call Connected", label: "Connected" },
      { type: "Follow-up Scheduled", label: "Follow-up" },
      { type: "Counseling Done", label: "Counseling Done" },
      { type: "Admission Discussion", label: "Admission Discussion" },
    ];
    const result: { label: string; days: number }[] = [];
    for (let i = 0; i < stages.length; i++) {
      const act = activities.find((a) => a.type === stages[i].type);
      if (!act) continue;
      const nextAct = activities.find((a) => {
        const nextStages = stages.slice(i + 1).map((s) => s.type);
        return nextStages.includes(a.type);
      });
      const duration = nextAct ? daysBetween(act.timestamp.split("T")[0], nextAct.timestamp.split("T")[0]) : 0;
      result.push({ label: stages[i].label, days: duration || 1 });
    }
    return result;
  };

  /* ─── Handlers ─── */
  const handleLogCall = () => {
    if (!form.leadId || !form.outcome) return;
    const newLog: CallLog = {
      id: `cl${Date.now()}`,
      leadId: form.leadId,
      telecallerId: currentUser.id,
      outcome: form.outcome,
      notes: form.notes,
      nextFollowUp: form.nextFollowUp,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...callLogs, newLog];
    setCallLogs(updated);
    store.saveCallLogs(updated);
    setForm({ leadId: "", outcome: "" as CallOutcome, notes: "", nextFollowUp: "" });
    setNotification("Call logged successfully.");
    setTimeout(() => setNotification(null), 3000);
  };

  const myLogs = callLogs.filter((cl) => cl.telecallerId === currentUser.id);
  const todayLogs = myLogs.filter((cl) => cl.createdAt === new Date().toISOString().split("T")[0]);
  const connectedToday = todayLogs.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested").length;

  return (
    <div className="space-y-6">
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 rounded-lg bg-success px-4 py-3 text-success-foreground shadow-lg flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecalling</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="dashboard">ATT Dashboard</TabsTrigger>
          <TabsTrigger value="calls">Call Center</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="leads">Lead Queue</TabsTrigger>
        </TabsList>

        {/* ═══════ TAB 1: ATT DASHBOARD ═══════ */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Smart Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${a.type === "warning" ? "border-warning/30 bg-warning/5 text-warning" : "border-primary/30 bg-primary/5 text-primary"}`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {a.message}
                </div>
              ))}
            </div>
          )}

          {/* Top metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Overall ATT"
              value={`${overallATT} Days`}
              icon={<Timer className="h-5 w-5" />}
            />
            <StatCard title="Total Admissions" value={admissions.length} icon={<Target className="h-5 w-5" />} />
            <StatCard title="Active Leads" value={leads.filter((l) => l.status !== "Lost" && l.status !== "Admission").length} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ATT by Source */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">ATT by Lead Source</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sourcePerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="avgATT" name="Avg ATT (Days)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ATT by Course */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">ATT by Course</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={coursePerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="course" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="avgATT" name="Avg ATT (Days)" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline funnel + Source performance table */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Pipeline Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pipelineCounts} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={90} label={({ stage, count }) => `${stage}: ${count}`}>
                    {pipelineCounts.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Source performance table */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Source Conversion Speed</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium text-center">Leads</th>
                      <th className="pb-2 font-medium text-center">Admissions</th>
                      <th className="pb-2 font-medium text-center">Avg ATT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourcePerf.map((s) => (
                      <tr key={s.source} className="border-b last:border-0">
                        <td className="py-2.5 font-medium text-card-foreground">{s.source}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{s.leads}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{s.admissions}</td>
                        <td className="py-2.5 text-center">
                          {s.avgATT > 0 ? (
                            <Badge variant="outline" className={getATTBg(s.avgATT)}>{s.avgATT} Days</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 2: CALL CENTER ═══════ */}
        <TabsContent value="calls" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard title="Assigned Leads" value={assignedLeads.length} icon={<Phone className="h-5 w-5" />} />
            <StatCard title="Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
            <StatCard title="Connected Today" value={connectedToday} icon={<Zap className="h-5 w-5" />} />
            <StatCard title="Total Calls" value={myLogs.length} icon={<Clock className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Call logging form */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h2 className="mb-4 text-lg font-semibold text-card-foreground">Log a Call</h2>
              <div className="space-y-4">
                <div>
                  <Label>Select Lead</Label>
                  <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose lead" /></SelectTrigger>
                    <SelectContent>
                      {assignedLeads.map((l) => {
                        const age = getLeadAge(l.createdAt);
                        const badge = getAgeBadge(age);
                        return (
                          <SelectItem key={l.id} value={l.id}>
                            <div className="flex items-center gap-2">
                              <span>{l.name} — {l.phone}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Pick a lead from your assigned queue</p>
                </div>
                <div>
                  <Label>Call Outcome</Label>
                  <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v as CallOutcome })}>
                    <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Summarize the call..." rows={3} />
                </div>
                <div>
                  <Label>Next Follow-up</Label>
                  <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
                  <p className="mt-1 text-xs text-muted-foreground">Leave blank if no follow-up is needed</p>
                </div>
                <Button onClick={handleLogCall} className="w-full" disabled={!form.leadId || !form.outcome}>Log Call</Button>
                {!form.leadId && !form.outcome && (
                  <p className="text-xs text-muted-foreground text-center">Select a lead and outcome to log the call</p>
                )}
              </div>
            </div>

            {/* Call history */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h2 className="mb-4 text-lg font-semibold text-card-foreground">Call History</h2>
              <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                {myLogs.length === 0 && <p className="text-sm text-muted-foreground">No calls logged yet</p>}
                {[...myLogs].reverse().map((log) => {
                  const lead = leads.find((l) => l.id === log.leadId);
                  return (
                    <div key={log.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{lead?.phone}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.outcome === "Interested" ? "bg-success/10 text-success" :
                          log.outcome === "Not interested" ? "bg-destructive/10 text-destructive" :
                          log.outcome === "Connected" ? "bg-primary/10 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>{log.outcome}</span>
                      </div>
                      {log.notes && <p className="mt-2 text-xs text-muted-foreground">{log.notes}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{log.createdAt}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 3: PERFORMANCE ═══════ */}
        <TabsContent value="performance" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Overall ATT" value={`${overallATT} Days`} icon={<Timer className="h-5 w-5" />} />
            <StatCard title="Total Telecallers" value={telecallerPerf.length} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Lead Contact Rate" value={`${leads.length > 0 ? ((callLogs.length / leads.length) * 100).toFixed(0) : 0}%`} icon={<Activity className="h-5 w-5" />} />
          </div>

          {/* Telecaller comparison */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Telecaller Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Telecaller</th>
                    <th className="pb-2 font-medium text-center">Assigned</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                    <th className="pb-2 font-medium text-center">Conversion %</th>
                    <th className="pb-2 font-medium text-center">Avg ATT</th>
                    <th className="pb-2 font-medium text-center">Today Calls</th>
                    <th className="pb-2 font-medium text-center">Total Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {telecallerPerf.map((tc) => (
                    <tr key={tc.id} className="border-b last:border-0">
                      <td className="py-3 font-medium text-card-foreground">{tc.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.leadsAssigned}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.admissions}</td>
                      <td className="py-3 text-center">
                        <span className="font-medium text-card-foreground">{tc.conversionRate}%</span>
                      </td>
                      <td className="py-3 text-center">
                        {tc.avgATT > 0 ? (
                          <Badge variant="outline" className={getATTBg(tc.avgATT)}>{tc.avgATT} Days</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-muted-foreground">{tc.todayCalls}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.totalCalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Course ATT */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Conversion Speed by Course</h3>
            <p className="mb-4 text-xs text-muted-foreground">Courses with longer ATT may require stronger counseling support</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Course</th>
                    <th className="pb-2 font-medium text-center">Leads</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                    <th className="pb-2 font-medium text-center">Avg ATT</th>
                  </tr>
                </thead>
                <tbody>
                  {coursePerf.map((c) => (
                    <tr key={c.course} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-card-foreground">{c.course}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c.leads}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{c.admissions}</td>
                      <td className="py-2.5 text-center">
                        {c.avgATT > 0 ? (
                          <Badge variant="outline" className={getATTBg(c.avgATT)}>{c.avgATT} Days</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 4: LEAD QUEUE ═══════ */}
        <TabsContent value="leads" className="space-y-6 mt-4">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-1 text-sm font-semibold text-card-foreground">My Lead Queue</h3>
            <p className="mb-4 text-xs text-muted-foreground">Sorted by priority — high-priority leads appear first</p>
            <div className="space-y-3">
              {[...assignedLeads]
                .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
                .map((lead) => {
                  const age = getLeadAge(lead.createdAt);
                  const ageBadge = getAgeBadge(age);
                  const stageTimeline = getStageTimeline(lead);
                  const hasCalls = callLogs.some((cl) => cl.leadId === lead.id);
                  const suggestions: string[] = [];
                  if (!hasCalls && age > 0) suggestions.push(`Lead has not been contacted for ${age} day${age > 1 ? "s" : ""}.`);
                  if (lead.intentCategory === "High Intent" && lead.status !== "Counseling") suggestions.push("High intent lead. Schedule counseling.");
                  if (lead.temperature === "Hot" && lead.status === "Follow-up") suggestions.push("Hot lead in follow-up. Prioritize conversion.");

                  return (
                    <div key={lead.id} className="rounded-lg border p-4 transition-all hover:shadow-md">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-card-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone} · {lead.email}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{lead.interestedCourse} · {lead.source}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Priority */}
                          <Badge variant="outline" className={
                            lead.priorityCategory === "High Priority" ? "bg-destructive/10 text-destructive border-destructive/20" :
                            lead.priorityCategory === "Medium Priority" ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-muted text-muted-foreground"
                          }>
                            {lead.priorityScore || 0} pts
                          </Badge>
                          {/* Temperature */}
                          {lead.temperature && (
                            <Badge variant="outline" className={
                              lead.temperature === "Hot" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              lead.temperature === "Warm" ? "bg-warning/10 text-warning border-warning/20" :
                              lead.temperature === "Cold" ? "bg-muted text-muted-foreground" :
                              "bg-muted text-muted-foreground"
                            }>
                              {lead.temperature}
                            </Badge>
                          )}
                          {/* Age */}
                          <Badge variant="outline" className={ageBadge.color}>{ageBadge.label}</Badge>
                          {/* Status */}
                          <Badge variant="secondary">{lead.status}</Badge>
                        </div>
                      </div>

                      {/* Stage timeline bars */}
                      {stageTimeline.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Stage Duration</p>
                          {stageTimeline.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-28 text-muted-foreground truncate">{s.label}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(s.days * 15, 100)}%` }} />
                              </div>
                              <span className="w-12 text-right text-muted-foreground">{s.days}d</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Smart suggestions */}
                      {suggestions.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {suggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 rounded bg-warning/5 px-2.5 py-1.5 text-xs text-warning">
                              <Zap className="h-3 w-3 shrink-0" />
                              {s}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setForm({ ...form, leadId: lead.id }); setActiveTab("calls"); }}>
                          <Phone className="h-3 w-3 mr-1" /> Call
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Clock className="h-3 w-3 mr-1" /> Schedule Follow-up
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
