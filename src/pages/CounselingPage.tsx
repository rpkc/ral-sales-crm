import { useState, useMemo } from "react";
import { store } from "@/lib/mock-data";
import { Lead, LeadActivity, WalkInStatus, CounselingOutcome, FeeCommitment, DocumentStatus, JoiningFailureReason, FollowUpType } from "@/lib/types";
import {
  MASTER_COUNSELING_OUTCOMES, MASTER_FEE_COMMITMENTS, MASTER_DOCUMENT_STATUS,
  MASTER_JOINING_FAILURE_REASONS, MASTER_COUNSELOR_FOLLOWUP_TYPES, MASTER_COURSE_NAMES,
} from "@/lib/master-schema";
import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/StatCard";
import { PiPendingWidget } from "@/components/counseling/PiPendingWidget";
import { CollectionsWidget } from "@/components/counseling/CollectionsWidget";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingChart } from "@/components/billing/BillingChart";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, GraduationCap, Target, Calendar, DollarSign, AlertTriangle,
  CheckCircle2, Clock, FileText, TrendingUp, User, Star, Zap, Activity,
  Save, Send, X, ChevronDown, ChevronUp, Bell,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(358, 78%, 51%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)",
  "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)",
];

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function CounselingPage() {
  const { currentUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(store.getLeads());
  const [followUps, setFollowUps] = useState(store.getFollowUps());
  const admissions = store.getAdmissions();
  const users = store.getUsers();
  const today = new Date().toISOString().split("T")[0];

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState("walkins");

  // Filter counselor's leads
  const counselorId = currentUser?.id || "u5";
  const myLeads = leads.filter((l) => l.assignedCounselor === counselorId || l.walkInCounselor === counselorId);
  const walkInScheduled = myLeads.filter((l) => l.walkInStatus === "Scheduled");
  const walkInCompleted = myLeads.filter((l) => l.walkInStatus === "Completed");
  const walkInNoShow = myLeads.filter((l) => l.walkInStatus === "No Show");
  const walkInToday = walkInScheduled.filter((l) => l.walkInDate === today);
  const completedToday = walkInCompleted.filter((l) => l.walkInDate === today);

  const counselingLeads = myLeads.filter((l) => l.status === "Counseling" || l.walkInStatus === "Completed");
  const dojLeads = myLeads.filter((l) => l.expectedDOJ);
  const delayedJoinings = dojLeads.filter((l) => l.expectedDOJ && l.expectedDOJ < today && l.status !== "Admission");
  const upcomingDOJ = dojLeads.filter((l) => l.expectedDOJ && l.expectedDOJ >= today && daysBetween(today, l.expectedDOJ) <= 3);

  const myAdmissions = admissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead?.assignedCounselor === counselorId;
  });
  const totalRevenue = myAdmissions.reduce((s, a) => s + (a.totalFee || 0), 0);

  const myFollowUps = followUps.filter((f) => f.assignedTo === counselorId && !f.completed && f.date <= today);

  // Walk-in conversion rate
  const walkInAdmissions = myAdmissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead?.walkInStatus === "Completed";
  });
  const walkInConvRate = walkInCompleted.length > 0 ? ((walkInAdmissions.length / walkInCompleted.length) * 100).toFixed(1) : "0";

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: "warning" | "info"; msg: string }[] = [];
    walkInScheduled.filter((l) => l.walkInDate && l.walkInDate < today).forEach((l) => {
      items.push({ type: "warning", msg: `Walk-in for ${l.name} was scheduled on ${l.walkInDate} but not completed.` });
    });
    upcomingDOJ.forEach((l) => {
      items.push({ type: "info", msg: `${l.name}'s expected joining date is ${l.expectedDOJ} (${daysBetween(today, l.expectedDOJ!)} days away).` });
    });
    delayedJoinings.forEach((l) => {
      items.push({ type: "warning", msg: `${l.name}'s joining date (${l.expectedDOJ}) has passed without admission.` });
    });
    myFollowUps.forEach((f) => {
      const lead = leads.find((l) => l.id === f.leadId);
      if (f.date < today) items.push({ type: "warning", msg: `Overdue follow-up for ${lead?.name || "Unknown"} (${f.date}).` });
    });
    return items.slice(0, 8);
  }, [walkInScheduled, upcomingDOJ, delayedJoinings, myFollowUps, today, leads]);

  // Funnel data
  const funnelData = [
    { stage: "Walk-in Scheduled", count: walkInScheduled.length + walkInCompleted.length + walkInNoShow.length },
    { stage: "Walk-in Completed", count: walkInCompleted.length },
    { stage: "Admission Discussion", count: counselingLeads.filter((l) => l.counselingOutcome).length },
    { stage: "DoJ Assigned", count: dojLeads.length },
    { stage: "Admission Completed", count: myAdmissions.length },
  ];

  // Outcome distribution
  const outcomeData = useMemo(() => {
    const m = new Map<string, number>();
    myLeads.forEach((l) => { if (l.counselingOutcome) m.set(l.counselingOutcome, (m.get(l.counselingOutcome) || 0) + 1); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [myLeads]);

  const updateLead = (updated: Lead) => {
    const all = leads.map((l) => l.id === updated.id ? updated : l);
    setLeads(all);
    store.saveLeads(all);
  };

  const addFollowUp = (leadId: string, date: string, type: string, notes: string) => {
    const fu = {
      id: `f${Date.now()}`, leadId, assignedTo: counselorId,
      date, notes, completed: false, createdAt: today,
      followUpType: type as FollowUpType || undefined,
    };
    const updated = [...followUps, fu];
    setFollowUps(updated);
    store.saveFollowUps(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Counseling</h1>
        <p className="text-sm text-muted-foreground">Walk-in management, counseling outcomes & joining tracker</p>
      </div>

      {/* PI Pending + Collections widgets — top priority row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <PiPendingWidget counselorId={counselorId} studentNames={myLeads.map(l => l.name)} />
        <CollectionsWidget
          counselorId={counselorId}
          studentNames={myLeads.map(l => l.name)}
          students={myLeads.map(l => ({ id: l.id, name: l.name, course: l.interestedCourse || "—" }))}
        />
      </div>

      {/* KPI Ribbon */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard title="Walk-ins Today" value={walkInToday.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Completed Today" value={completedToday.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="No Shows" value={walkInNoShow.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard title="Walk-in Conv%" value={`${walkInConvRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="DoJ Pending" value={dojLeads.filter((l) => l.status !== "Admission").length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Delayed" value={delayedJoinings.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Admissions" value={myAdmissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}k`} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 4).map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${a.type === "warning" ? "border-warning/30 bg-warning/5 text-warning" : "border-primary/30 bg-primary/5 text-primary"}`}>
              {a.type === "warning" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Bell className="h-4 w-4 shrink-0" />}
              {a.msg}
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="walkins" className="text-xs sm:text-sm">Walk-ins</TabsTrigger>
          <TabsTrigger value="counseling" className="text-xs sm:text-sm">Counseling</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm">Billing</TabsTrigger>
          <TabsTrigger value="joining" className="text-xs sm:text-sm">Joining</TabsTrigger>
          <TabsTrigger value="kpi" className="text-xs sm:text-sm">KPI</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-4">
          <BillingChart />
        </TabsContent>

        {/* ═══════ TAB 1: Walk-ins ═══════ */}
        <TabsContent value="walkins" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-5 grid-cols-1">
            <div className="lg:col-span-3 space-y-4">
              {/* Scheduled walk-ins */}
              <div className="rounded-xl bg-card p-5 shadow-card">
                <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Scheduled Walk-ins ({walkInScheduled.length})
                </h3>
                {walkInScheduled.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No walk-ins scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {walkInScheduled.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedLead(l)}>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.walkInDate} {l.walkInTime ? `at ${l.walkInTime}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Scheduled</Badge>
                          <StatusBadge status={l.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed walk-ins needing counseling outcome */}
              <div className="rounded-xl bg-card p-5 shadow-card">
                <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Completed Walk-ins ({walkInCompleted.length})
                </h3>
                {walkInCompleted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed walk-ins.</p>
                ) : (
                  <div className="space-y-2">
                    {walkInCompleted.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedLead(l)}>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.counselingOutcome || "Outcome pending"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {l.counselingOutcome ? (
                            <Badge variant="outline" className="text-[10px] bg-success/10 text-success">{l.counselingOutcome}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Needs Outcome</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* No Shows */}
              {walkInNoShow.length > 0 && (
                <div className="rounded-xl bg-card p-5 shadow-card">
                  <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> No Shows ({walkInNoShow.length})
                  </h3>
                  <div className="space-y-2">
                    {walkInNoShow.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:shadow-md"
                        onClick={() => setSelectedLead(l)}>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.interestedCourse} · Scheduled: {l.walkInDate}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">No Show</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right panel: Lead detail / counseling form */}
            <div className="lg:col-span-2">
              {selectedLead ? (
                <CounselingWorkspace lead={selectedLead} users={users} onUpdate={(l) => { updateLead(l); setSelectedLead(l); }} onAddFollowUp={addFollowUp} />
              ) : (
                <div className="rounded-xl bg-card p-8 text-center shadow-card">
                  <User className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Click a lead to open the counseling workspace</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 2: All Counseling leads ═══════ */}
        <TabsContent value="counseling" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-5 grid-cols-1">
            <div className="lg:col-span-3 space-y-2">
              <div className="rounded-xl bg-card p-5 shadow-card">
                <h3 className="mb-3 text-sm font-semibold text-card-foreground">Active Counseling Leads ({counselingLeads.length})</h3>
                {counselingLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 mb-2 cursor-pointer hover:shadow-md"
                    onClick={() => setSelectedLead(l)}>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.counselingOutcome || "Pending"} {l.expectedDOJ ? `· DoJ: ${l.expectedDOJ}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      {l.expectedDOJ && l.expectedDOJ < today && l.status !== "Admission" && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">Delayed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              {selectedLead ? (
                <CounselingWorkspace lead={selectedLead} users={users} onUpdate={(l) => { updateLead(l); setSelectedLead(l); }} onAddFollowUp={addFollowUp} />
              ) : (
                <div className="rounded-xl bg-card p-8 text-center shadow-card">
                  <User className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Select a lead to manage counseling</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 3: Joining Tracker ═══════ */}
        <TabsContent value="joining" className="mt-4 space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Joinings
              </h3>
              {dojLeads.filter((l) => l.expectedDOJ && l.expectedDOJ >= today && l.status !== "Admission").length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming joinings.</p>
              ) : (
                <div className="space-y-2">
                  {dojLeads.filter((l) => l.expectedDOJ && l.expectedDOJ >= today && l.status !== "Admission").map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:shadow-md"
                      onClick={() => { setSelectedLead(l); setActiveTab("counseling"); }}>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.interestedCourse} · DoJ: {l.expectedDOJ} · {l.feeCommitment || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {daysBetween(today, l.expectedDOJ!) <= 3 && (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Soon</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{l.documentStatus || "Docs Pending"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Delayed Joinings ({delayedJoinings.length})
              </h3>
              {delayedJoinings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delayed joinings.</p>
              ) : (
                <div className="space-y-2">
                  {delayedJoinings.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-destructive/20 p-3 cursor-pointer hover:shadow-md"
                      onClick={() => { setSelectedLead(l); setActiveTab("counseling"); }}>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.interestedCourse} · DoJ: {l.expectedDOJ} · {l.joiningFailureReason || "Reason not recorded"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">
                        {daysBetween(l.expectedDOJ!, today)}d overdue
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 4: KPI Dashboard ═══════ */}
        <TabsContent value="kpi" className="mt-4 space-y-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Walk-ins Assigned" value={walkInScheduled.length + walkInCompleted.length + walkInNoShow.length} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Walk-ins Completed" value={walkInCompleted.length} icon={<CheckCircle2 className="h-5 w-5" />} />
            <StatCard title="Walk-in Conv Rate" value={`${walkInConvRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion Funnel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Counselor Conversion Funnel</h3>
              <div className="space-y-1.5">
                {funnelData.map((f, i) => {
                  const max = Math.max(...funnelData.map((x) => x.count), 1);
                  const pct = funnelData[0].count > 0 ? ((f.count / funnelData[0].count) * 100).toFixed(0) : "0";
                  return (
                    <div key={f.stage} className="flex items-center gap-3">
                      <span className="w-36 text-[11px] text-muted-foreground truncate">{f.stage}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div className="h-full rounded flex items-center px-2 transition-all"
                          style={{ width: `${Math.max((f.count / max) * 100, f.count > 0 ? 12 : 0)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}>
                          <span className="text-[9px] font-medium text-white whitespace-nowrap">{f.count}</span>
                        </div>
                      </div>
                      <span className="w-10 text-[10px] text-muted-foreground text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Counseling Outcome Distribution */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Counseling Outcomes</h3>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {outcomeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-10">No outcome data yet</p>}
            </div>
          </div>

          {/* Follow-up KPI */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Follow-up KPIs</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-semibold text-card-foreground">{followUps.filter((f) => f.assignedTo === counselorId).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-semibold text-success">{followUps.filter((f) => f.assignedTo === counselorId && f.completed).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Missed/Overdue</span>
                  <span className="font-semibold text-destructive">{myFollowUps.filter((f) => f.date < today).length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Joining Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confirmed DoJ</span>
                  <span className="font-semibold text-card-foreground">{dojLeads.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Joined on Time</span>
                  <span className="font-semibold text-success">{myAdmissions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delayed Joinings</span>
                  <span className="font-semibold text-warning">{delayedJoinings.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Revenue KPIs</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Admissions Closed</span>
                  <span className="font-semibold text-card-foreground">{myAdmissions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue Generated</span>
                  <span className="font-semibold text-success">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Ticket Size</span>
                  <span className="font-semibold text-card-foreground">₹{myAdmissions.length > 0 ? Math.round(totalRevenue / myAdmissions.length).toLocaleString() : 0}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COUNSELING WORKSPACE — Detail panel for a single lead
   ═══════════════════════════════════════════════════════════════ */
function CounselingWorkspace({ lead, users, onUpdate, onAddFollowUp }: {
  lead: Lead; users: ReturnType<typeof store.getUsers>;
  onUpdate: (l: Lead) => void;
  onAddFollowUp: (leadId: string, date: string, type: string, notes: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [showOutcome, setShowOutcome] = useState(false);
  const [showDOJ, setShowDOJ] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  const [counselingOutcome, setCounselingOutcome] = useState<CounselingOutcome | "">(lead.counselingOutcome || "");
  const [courseSelected, setCourseSelected] = useState(lead.interestedCourse || "");
  const [expectedDOJ, setExpectedDOJ] = useState(lead.expectedDOJ || "");
  const [feeCommitment, setFeeCommitment] = useState<FeeCommitment | "">(lead.feeCommitment || "");
  const [totalEmis, setTotalEmis] = useState(lead.totalEmisPlanned?.toString() || "");
  const [firstEmiDate, setFirstEmiDate] = useState(lead.firstEmiDate || "");
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | "">(lead.documentStatus || "");
  const [docsChecklist, setDocsChecklist] = useState(lead.documentsChecklist || { idProof: false, addressProof: false, educationCertificate: false, photographs: false });
  const [fuDate, setFuDate] = useState("");
  const [fuType, setFuType] = useState("");
  const [fuNotes, setFuNotes] = useState("");
  const [failureReason, setFailureReason] = useState<JoiningFailureReason | "">(lead.joiningFailureReason || "");

  const markWalkInCompleted = () => {
    const now = new Date();
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Walk-in Completed",
      description: "Walk-in counseling session completed",
      timestamp: now.toISOString(),
    }, {
      id: `act${Date.now() + 1}`, leadId: lead.id, type: "Ownership Transfer",
      description: `Lead ownership transferred to counselor ${users.find((u) => u.id === (lead.walkInCounselor || lead.assignedCounselor))?.name || ""}`,
      timestamp: new Date(now.getTime() + 1000).toISOString(),
    }];
    onUpdate({
      ...lead, walkInStatus: "Completed", status: "Counseling",
      leadOwner: lead.walkInCounselor || lead.assignedCounselor,
      activities,
    });
    toast.success("Walk-in marked as completed. Ownership transferred to counselor.");
  };

  const markNoShow = () => {
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Walk-in No Show",
      description: "Student did not show up for scheduled walk-in",
      timestamp: new Date().toISOString(),
    }];
    onUpdate({ ...lead, walkInStatus: "No Show", activities });
    toast.info("Walk-in marked as No Show.");
  };

  const saveCounselingOutcome = () => {
    if (!counselingOutcome) return;
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Counseling Outcome",
      description: `Counseling outcome: ${counselingOutcome}`,
      timestamp: new Date().toISOString(),
    }];
    onUpdate({ ...lead, counselingOutcome, activities });
    toast.success("Counseling outcome saved.");
  };

  const saveDOJ = () => {
    if (!expectedDOJ || !feeCommitment) return;
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "DoJ Set",
      description: `Expected joining date: ${expectedDOJ} · Fee: ${feeCommitment}`,
      timestamp: new Date().toISOString(),
    }];
    onUpdate({
      ...lead, expectedDOJ, feeCommitment, interestedCourse: courseSelected || lead.interestedCourse,
      totalEmisPlanned: feeCommitment === "EMI Plan" ? parseInt(totalEmis) || undefined : undefined,
      firstEmiDate: feeCommitment === "EMI Plan" ? firstEmiDate : undefined,
      activities,
    });
    toast.success("Date of Joining and fee commitment saved.");
  };

  const saveDocs = () => {
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Document Update",
      description: `Document status: ${documentStatus}`,
      timestamp: new Date().toISOString(),
    }];
    onUpdate({ ...lead, documentStatus: documentStatus as DocumentStatus, documentsChecklist: docsChecklist, activities });
    toast.success("Document status updated.");
  };

  const scheduleFollowUp = () => {
    if (!fuDate) return;
    onAddFollowUp(lead.id, fuDate, fuType, fuNotes);
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Follow-up Scheduled",
      description: `Counselor follow-up: ${fuType || "Call"} on ${fuDate}`,
      timestamp: new Date().toISOString(),
    }];
    onUpdate({ ...lead, activities });
    setFuDate(""); setFuType(""); setFuNotes("");
    toast.success("Follow-up scheduled.");
  };

  const saveFailureReason = () => {
    if (!failureReason) return;
    const activities: LeadActivity[] = [...(lead.activities || []), {
      id: `act${Date.now()}`, leadId: lead.id, type: "Joining Failed",
      description: `Joining failure: ${failureReason}`,
      timestamp: new Date().toISOString(),
    }];
    onUpdate({ ...lead, joiningFailureReason: failureReason, joiningDelayed: true, activities });
    if (failureReason === "Follow-Up Missed") {
      toast.warning("Alert: Follow-up missed flagged for performance review.");
    } else {
      toast.success("Joining failure reason recorded.");
    }
  };

  return (
    <div className="rounded-xl bg-card p-5 shadow-card space-y-4 sticky top-4">
      <ScrollArea className="max-h-[75vh]">
        <div className="space-y-4 pr-2">
          {/* Lead info header */}
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">{lead.phone} · {lead.email}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <StatusBadge status={lead.status} />
              {lead.walkInStatus && <Badge variant="outline" className="text-[10px]">{lead.walkInStatus}</Badge>}
              {lead.temperature && <Badge variant="outline" className={`text-[10px] ${lead.temperature === "Hot" ? "bg-destructive/10 text-destructive" : lead.temperature === "Warm" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{lead.temperature}</Badge>}
            </div>
          </div>

          <Separator />

          {/* Walk-in actions */}
          {lead.walkInStatus === "Scheduled" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={markWalkInCompleted} className="flex-1 text-xs">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Completed
              </Button>
              <Button size="sm" variant="outline" onClick={markNoShow} className="text-xs">
                <X className="mr-1 h-3.5 w-3.5" /> No Show
              </Button>
            </div>
          )}

          {/* ─── Counseling Outcome ─── */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <button onClick={() => setShowOutcome(!showOutcome)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Counseling Outcome</span>
              </div>
              {showOutcome ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showOutcome && (
              <div className="space-y-2 animate-in slide-in-from-top-1">
                <Select value={counselingOutcome} onValueChange={(v) => setCounselingOutcome(v as CounselingOutcome)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                  <SelectContent>{MASTER_COUNSELING_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" className="w-full text-xs" onClick={saveCounselingOutcome} disabled={!counselingOutcome}>
                  <Save className="mr-1 h-3.5 w-3.5" /> Save Outcome
                </Button>
              </div>
            )}
          </div>

          {/* ─── Date of Joining ─── */}
          {counselingOutcome && counselingOutcome !== "Not Interested" && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <button onClick={() => setShowDOJ(!showDOJ)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joining Plan</span>
                </div>
                {showDOJ ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showDOJ && (
                <div className="space-y-2 animate-in slide-in-from-top-1">
                  <div>
                    <Label className="text-xs">Course Selected</Label>
                    <Select value={courseSelected} onValueChange={setCourseSelected}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{MASTER_COURSE_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Expected Date of Joining</Label>
                    <Input type="date" value={expectedDOJ} onChange={(e) => setExpectedDOJ(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Fee Commitment</Label>
                    <Select value={feeCommitment} onValueChange={(v) => setFeeCommitment(v as FeeCommitment)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{MASTER_FEE_COMMITMENTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {feeCommitment === "EMI Plan" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Total EMIs</Label>
                        <Input type="number" value={totalEmis} onChange={(e) => setTotalEmis(e.target.value)} className="h-8 text-sm" placeholder="e.g. 6" />
                      </div>
                      <div>
                        <Label className="text-xs">First EMI Date</Label>
                        <Input type="date" value={firstEmiDate} onChange={(e) => setFirstEmiDate(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  )}
                  <Button size="sm" className="w-full text-xs" onClick={saveDOJ} disabled={!expectedDOJ || !feeCommitment}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Save Joining Plan
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── Document Tracking ─── */}
          {(lead.expectedDOJ || lead.counselingOutcome) && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <button onClick={() => setShowDocs(!showDocs)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents</span>
                </div>
                {showDocs ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showDocs && (
                <div className="space-y-2 animate-in slide-in-from-top-1">
                  <Select value={documentStatus} onValueChange={(v) => setDocumentStatus(v as DocumentStatus)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Document status..." /></SelectTrigger>
                    <SelectContent>{MASTER_DOCUMENT_STATUS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="space-y-1.5">
                    {([
                      { key: "idProof" as const, label: "ID Proof" },
                      { key: "addressProof" as const, label: "Address Proof" },
                      { key: "educationCertificate" as const, label: "Education Certificate" },
                      { key: "photographs" as const, label: "Photographs" },
                    ]).map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Checkbox checked={docsChecklist[item.key]} onCheckedChange={(v) => setDocsChecklist({ ...docsChecklist, [item.key]: !!v })} />
                        <span className="text-xs text-card-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full text-xs" onClick={saveDocs}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Save Documents
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── Follow-up ─── */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <button onClick={() => setShowFollowUp(!showFollowUp)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule Follow-up</span>
              </div>
              {showFollowUp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showFollowUp && (
              <div className="space-y-2 animate-in slide-in-from-top-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={fuType} onValueChange={setFuType}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{MASTER_COUNSELOR_FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} className="h-8 text-sm" placeholder="Follow-up notes..." />
                </div>
                <Button size="sm" className="w-full text-xs" onClick={scheduleFollowUp} disabled={!fuDate}>
                  <Send className="mr-1 h-3.5 w-3.5" /> Schedule
                </Button>
              </div>
            )}
          </div>

          {/* ─── Joining Failure (only if DOJ passed) ─── */}
          {lead.expectedDOJ && lead.expectedDOJ < today && lead.status !== "Admission" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <button onClick={() => setShowFailure(!showFailure)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Joining Failure</span>
                </div>
                {showFailure ? <ChevronUp className="h-4 w-4 text-destructive" /> : <ChevronDown className="h-4 w-4 text-destructive" />}
              </button>
              {showFailure && (
                <div className="space-y-2 animate-in slide-in-from-top-1">
                  <Select value={failureReason} onValueChange={(v) => setFailureReason(v as JoiningFailureReason)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>{MASTER_JOINING_FAILURE_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="destructive" className="w-full text-xs" onClick={saveFailureReason} disabled={!failureReason}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Record Failure
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── Activity Timeline ─── */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" /> Timeline
            </p>
            <div className="space-y-0 max-h-48 overflow-y-auto">
              {[...(lead.activities || [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((act, i) => (
                <div key={act.id} className="flex gap-3 pb-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2 w-2 rounded-full mt-1.5 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {i < (lead.activities || []).length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-card-foreground">{act.type}</p>
                    <p className="text-[10px] text-muted-foreground">{act.description}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {(lead.activities || []).length === 0 && <p className="text-[10px] text-muted-foreground">No activity yet</p>}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
