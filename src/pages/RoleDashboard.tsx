import { useAuth, roleLabels } from "@/lib/auth-context";
import { store, BENCHMARKS } from "@/lib/mock-data";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Phone, PhoneCall, Users, Target, Calendar, GraduationCap, Megaphone,
  TrendingUp, DollarSign, Activity, Shield, Clock, Star, Zap, BarChart3,
  UserPlus, Settings, AlertTriangle, Timer, Download, ArrowUpRight, CheckCircle2, FileText,
  Building2, School,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { useMemo, useState } from "react";

const CHART_COLORS = [
  "hsl(358, 78%, 51%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)",
  "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)",
];

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

/* ═══════════════════════════════════════════════════════════════
   TELECALLER DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function TelecallerDashboard() {
  const { currentUser } = useAuth();
  const leads = store.getLeads();
  const callLogs = store.getCallLogs();
  const followUps = store.getFollowUps();
  const today = new Date().toISOString().split("T")[0];

  const myLeads = leads.filter((l) => l.assignedTelecallerId === currentUser!.id);
  const activeLeads = myLeads.filter((l) => l.status !== "Admission" && l.status !== "Lost");
  const myLogs = callLogs.filter((cl) => cl.telecallerId === currentUser!.id);
  const todayLogs = myLogs.filter((cl) => cl.createdAt === today);
  const connected = todayLogs.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested").length;
  const myFollowUps = followUps.filter((f) => f.assignedTo === currentUser!.id && !f.completed && f.date <= today);
  const highPriority = activeLeads.filter((l) => l.priorityCategory === "High Priority");
  const newLeads = activeLeads.filter((l) => daysBetween(l.createdAt, today) <= 1);
  const callbackLeads = activeLeads.filter((l) => l.leadSourceFormType === "Free Callback");
  const counsellingReqs = activeLeads.filter((l) => l.leadSourceFormType === "Free Counselling");
  const applicationLeads = activeLeads.filter((l) => l.leadSourceFormType === "Apply Now");

  // Walk-in metrics
  const walkInsScheduled = myLeads.filter((l) => l.walkInStatus === "Scheduled" || l.walkInStatus === "Completed" || l.walkInStatus === "No Show");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecaller Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser!.name}</p>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="New Leads" value={newLeads.length} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard title="Callback Requests" value={callbackLeads.length} icon={<Phone className="h-5 w-5" />} />
        <StatCard title="Counselling Requests" value={counsellingReqs.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Application Leads" value={applicationLeads.length} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Walk-ins Scheduled" value={walkInsScheduled.length} icon={<Calendar className="h-5 w-5" />} />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard title="Connected" value={connected} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Follow-ups Today" value={myFollowUps.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="High Priority" value={highPriority.length} icon={<Star className="h-5 w-5" />} />
      </div>

      {highPriority.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Target className="h-4 w-4 text-destructive" /> High Priority Leads</h3>
          <div className="space-y-2">
            {highPriority.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.source} {l.leadSourceFormType ? `· ${l.leadSourceFormType}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">{l.priorityScore || 0} pts</Badge>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myFollowUps.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-warning" /> Follow-ups Due Today</h3>
          <div className="space-y-2">
            {myFollowUps.slice(0, 5).map((f) => {
              const lead = leads.find((l) => l.id === f.leadId);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{f.notes}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{f.date}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COUNSELOR DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function CounselorDashboard() {
  const { currentUser } = useAuth();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const followUps = store.getFollowUps();
  const today = new Date().toISOString().split("T")[0];

  const myLeads = leads.filter((l) => l.assignedCounselor === currentUser!.id);
  const pendingCounseling = myLeads.filter((l) => l.status === "Counseling");
  const hotLeads = leads.filter((l) => l.intentCategory === "High Intent" && l.qualification?.budgetConfirmed && l.status !== "Admission" && l.status !== "Lost");
  const admissionsToday = admissions.filter((a) => a.admissionDate === today);
  const scholarshipReqs = leads.filter((l) => l.scholarshipApplied && l.status !== "Admission" && l.status !== "Lost");
  const emiLeads = leads.filter((l) => l.emiSelected && l.status !== "Admission" && l.status !== "Lost");
  const highTicket = leads.filter((l) => {
    const course = store.getCourses().find((c) => c.name === l.interestedCourse);
    return course && course.fee >= 160000 && l.status !== "Admission" && l.status !== "Lost";
  });

  // Walk-in metrics
  const walkInsAssigned = myLeads.filter((l) => l.walkInStatus && l.walkInStatus !== "Not Scheduled");
  const walkInsScheduledToday = walkInsAssigned.filter((l) => l.walkInDate === today && l.walkInStatus === "Scheduled");
  const walkInsCompleted = walkInsAssigned.filter((l) => l.walkInStatus === "Completed");
  const walkInsCompletedToday = walkInsCompleted.filter((l) => l.walkInDate === today);
  const walkInAdmissions = admissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead?.walkInStatus === "Completed" && lead?.assignedCounselor === currentUser!.id;
  });
  const walkInConvRate = walkInsCompleted.length > 0 ? ((walkInAdmissions.length / walkInsCompleted.length) * 100).toFixed(1) : "0";

  // Follow-up KPIs
  const myFollowUps = followUps.filter((f) => f.assignedTo === currentUser!.id);
  const overdueFU = myFollowUps.filter((f) => !f.completed && f.date < today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Counselor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser!.name}</p>
      </div>

      {/* Walk-in metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Walk-ins Assigned" value={walkInsAssigned.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Today's Walk-ins" value={walkInsScheduledToday.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Completed Today" value={walkInsCompletedToday.length} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Walk-in Conv%" value={`${walkInConvRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Overdue Follow-ups" value={overdueFU.length} icon={<AlertTriangle className="h-5 w-5" />} className={overdueFU.length > 0 ? "border-destructive/20" : ""} />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Admission Discussions" value={pendingCounseling.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Scholarship Requests" value={scholarshipReqs.length} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="EMI Discussions" value={emiLeads.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="High Ticket Leads" value={highTicket.length} icon={<Star className="h-5 w-5" />} />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard title="Hot Leads" value={hotLeads.length} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Admissions Today" value={admissionsToday.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Total Admissions" value={admissions.length} icon={<Target className="h-5 w-5" />} />
      </div>

      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Hot Leads — Ready for Conversion</h3>
        {hotLeads.length === 0 ? <p className="text-sm text-muted-foreground">No hot leads at the moment</p> : (
          <div className="space-y-2">
            {hotLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.interestedCourse} · Budget: {l.budgetRange || "—"} {l.scholarshipApplied ? `· Scholarship: ${l.scholarshipPercentage || 0}%` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {l.admissionProbability && <Badge variant="outline" className={`text-[10px] ${l.admissionProbability === "High" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.admissionProbability}</Badge>}
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">Recent Admissions</h3>
        {admissions.length === 0 ? <p className="text-sm text-muted-foreground">No admissions yet</p> : (
          <div className="space-y-2">
            {admissions.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{a.studentName}</p>
                  <p className="text-xs text-muted-foreground">{a.courseSelected} · ₹{(a.totalFee || 0).toLocaleString()} {a.scholarshipApplied ? `· ${a.scholarshipPercentage}% scholarship` : ""}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{a.admissionDate}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MARKETING DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function MarketingDashboard() {
  const campaigns = store.getCampaigns();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();

  const totalSpend = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
  const avgCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const totalRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : "0";
  const cac = admissions.length > 0 ? Math.round(totalSpend / admissions.length) : 0;

  const sourceData = useMemo(() => {
    const m = new Map<string, { leads: number; admissions: number }>();
    leads.forEach((l) => { const e = m.get(l.source) || { leads: 0, admissions: 0 }; e.leads++; m.set(l.source, e); });
    admissions.forEach((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      if (lead) { const e = m.get(lead.source) || { leads: 0, admissions: 0 }; e.admissions++; m.set(lead.source, e); }
    });
    return Array.from(m.entries()).map(([source, d]) => ({ source, ...d }));
  }, [leads, admissions]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>
        <p className="text-sm text-muted-foreground">Campaign performance and marketing ROI</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Campaign Spend" value={`₹${totalSpend.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Leads Generated" value={totalLeads} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Cost Per Lead" value={`₹${avgCPL}`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="ROAS" value={`${roas}x`} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="CAC" value={`₹${cac.toLocaleString()}`} icon={<Target className="h-5 w-5" />} />
      </div>

      {/* Lead source pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead Source Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sourceData} dataKey="leads" nameKey="source" cx="50%" cy="50%" outerRadius={90} label={({ source, leads }) => `${source}: ${leads}`}>
                {sourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign performance */}
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Campaign Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={campaigns.map((c) => ({ name: c.name.substring(0, 15), spend: c.budget || 0, leads: c.leadsGenerated || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="spend" name="Spend (₹)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leads" name="Leads" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progressive disclosure: advanced */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary font-medium hover:underline">
        {showAdvanced ? "Hide" : "Show"} Advanced Analytics →
      </button>
      {showAdvanced && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Source Conversion Analysis</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium text-center">Leads</th>
                <th className="pb-2 font-medium text-center">Admissions</th>
                <th className="pb-2 font-medium text-center">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {sourceData.map((s) => (
                <tr key={s.source} className="border-b last:border-0">
                  <td className="py-2.5 font-medium text-card-foreground">{s.source}</td>
                  <td className="py-2.5 text-center text-muted-foreground">{s.leads}</td>
                  <td className="py-2.5 text-center text-muted-foreground">{s.admissions}</td>
                  <td className="py-2.5 text-center font-medium text-card-foreground">{s.leads > 0 ? ((s.admissions / s.leads) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TELECALLING MANAGER DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function TelecallingManagerDashboard() {
  const leads = store.getLeads();
  const callLogs = store.getCallLogs();
  const admissions = store.getAdmissions();
  const users = store.getUsers();
  const today = new Date().toISOString().split("T")[0];

  const telecallers = users.filter((u) => u.role === "telecaller");
  const conversionData = admissions.map((adm) => {
    const lead = leads.find((l) => l.id === adm.leadId);
    return lead ? { att: daysBetween(lead.createdAt, adm.admissionDate), telecallerId: lead.assignedTelecallerId } : null;
  }).filter(Boolean) as { att: number; telecallerId: string }[];
  const overallATT = conversionData.length > 0 ? +(conversionData.reduce((s, c) => s + c.att, 0) / conversionData.length).toFixed(1) : 0;

  const tcPerf = telecallers.map((tc) => {
    const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
    const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
    const connected = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
    const converted = conversionData.filter((c) => c.telecallerId === tc.id);
    const avgATT = converted.length > 0 ? +(converted.reduce((s, c) => s + c.att, 0) / converted.length).toFixed(1) : 0;
    const uncontacted = assigned.filter((l) => l.status !== "Admission" && l.status !== "Lost" && !calls.some((cl) => cl.leadId === l.id));
    return {
      name: tc.name, calls: calls.length, connected: connected.length,
      admissions: converted.length, avgATT, assigned: assigned.length,
      connectionRate: calls.length > 0 ? +((connected.length / calls.length) * 100).toFixed(1) : 0,
      uncontacted: uncontacted.length,
    };
  });

  const agingLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost" && daysBetween(l.createdAt, today) > 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecalling Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor team productivity and performance</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Calls Today" value={callLogs.filter((cl) => cl.createdAt === today).length} icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard title="Telecallers" value={telecallers.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Overall ATT" value={`${overallATT}d`} icon={<Timer className="h-5 w-5" />} />
        <StatCard title="Aging Leads" value={agingLeads.length} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {/* Agent performance table */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Agent</th>
                <th className="pb-2 font-medium text-center">Calls</th>
                <th className="pb-2 font-medium text-center">Connected</th>
                <th className="pb-2 font-medium text-center">Conn %</th>
                <th className="pb-2 font-medium text-center">Admissions</th>
                <th className="pb-2 font-medium text-center">ATT</th>
                <th className="pb-2 font-medium text-center">Uncontacted</th>
              </tr>
            </thead>
            <tbody>
              {tcPerf.map((tc) => (
                <tr key={tc.name} className="border-b last:border-0">
                  <td className="py-3 font-medium text-card-foreground">{tc.name}</td>
                  <td className="py-3 text-center text-muted-foreground">{tc.calls}</td>
                  <td className="py-3 text-center text-muted-foreground">{tc.connected}</td>
                  <td className="py-3 text-center font-medium text-card-foreground">{tc.connectionRate}%</td>
                  <td className="py-3 text-center text-muted-foreground">{tc.admissions}</td>
                  <td className="py-3 text-center">
                    {tc.avgATT > 0 ? (
                      <Badge variant="outline" className={`text-[10px] ${tc.avgATT <= 5 ? "bg-success/10 text-success" : tc.avgATT <= 10 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{tc.avgATT}d</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 text-center">
                    {tc.uncontacted > 0 ? <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">{tc.uncontacted}</Badge> : <span className="text-muted-foreground">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA violations */}
      {agingLeads.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Aging Leads ({agingLeads.length})</h3>
          <div className="space-y-2">
            {agingLeads.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.interestedCourse} · {l.source}</p>
                </div>
                <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">{daysBetween(l.createdAt, today)} days old</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OWNER / DIRECTOR DASHBOARD — Financial & Operational Command Center
   ═══════════════════════════════════════════════════════════════ */

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function OwnerDashboard() {
  const campaigns = store.getCampaigns();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const callLogs = store.getCallLogs();
  const followUps = store.getFollowUps();
  const users = store.getUsers();
  const courses = store.getCourses();
  const today = new Date().toISOString().split("T")[0];

  // ── Multi-Vertical Data ──
  const internshipAdmissions = store.getInternshipAdmissions();
  const collegePrograms = store.getCollegePrograms();
  const schoolPrograms = store.getSchoolPrograms();
  const collegeAccounts = store.getCollegeAccounts();
  const schoolAccounts = store.getSchoolAccounts();
  const internshipLeads = leads.filter(l => l.programChannel === "Internship Program");
  const individualLeads = leads.filter(l => !l.programChannel || l.programChannel === "Individual Course Admission");

  // ── Vertical Revenue ──
  const individualRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);
  const internshipRevenue = internshipAdmissions.reduce((s, a) => s + (a.fee || 0), 0);
  const collegeRevenue = collegePrograms.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const schoolRevenue = schoolPrograms.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const totalMultiVerticalRevenue = individualRevenue + internshipRevenue + collegeRevenue + schoolRevenue;

  // ── Core Financial Metrics ──
  const totalRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);
  const totalCollected = admissions.reduce((s, a) => s + (a.paymentHistory?.reduce((ps, p) => ps + (p.amountPaid || 0), 0) || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeadsGenerated = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
  const cpl = totalLeadsGenerated > 0 ? Math.round(totalSpend / totalLeadsGenerated) : 0;
  const cpa = admissions.length > 0 ? Math.round(totalSpend / admissions.length) : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const spendRatio = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;
  const avgFee = admissions.length > 0 ? Math.round(totalRevenue / admissions.length) : 0;
  const convRate = leads.length > 0 ? ((admissions.length / leads.length) * 100).toFixed(1) : "0";

  // ── Benchmark Comparisons ──
  const cpaStatus: "excellent" | "healthy" | "attention" = cpa < BENCHMARKS.cpaMin ? "excellent" : cpa <= BENCHMARKS.cpaMax ? "healthy" : "attention";
  const spendEfficient = spendRatio <= BENCHMARKS.marketingSpendRatioMax;
  const roasOK = roas >= BENCHMARKS.minROAS;
  const billingTarget = BENCHMARKS.monthlyBilling;
  const billingRemaining = Math.max(0, billingTarget - totalRevenue);
  const billingProgress = Math.min((totalRevenue / billingTarget) * 100, 100);

  // ── ATT ──
  const conversionData = admissions.map((adm) => {
    const lead = leads.find((l) => l.id === adm.leadId);
    return lead ? daysBetween(lead.createdAt, adm.admissionDate) : 0;
  });
  const avgATT = conversionData.length > 0 ? +(conversionData.reduce((s, d) => s + d, 0) / conversionData.length).toFixed(1) : 0;

  const activeLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost");
  const hotLeads = leads.filter((l) => l.temperature === "Hot" && l.status !== "Admission" && l.status !== "Lost");

  // ── Walk-in Metrics ──
  const walkInsScheduled = leads.filter((l) => l.walkInStatus === "Scheduled" || l.walkInStatus === "Completed" || l.walkInStatus === "No Show");
  const walkInsCompleted = leads.filter((l) => l.walkInStatus === "Completed");
  const walkInsNoShow = leads.filter((l) => l.walkInStatus === "No Show");
  const walkInAdmissions = admissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead?.walkInStatus === "Completed";
  });
  const walkInConvRate = walkInsCompleted.length > 0 ? ((walkInAdmissions.length / walkInsCompleted.length) * 100).toFixed(1) : "0";

  // ── Course Revenue ──
  const courseRevenue = useMemo(() => {
    return courses.map((c) => {
      const cLeads = leads.filter((l) => l.interestedCourse === c.name);
      const cAdm = admissions.filter((a) => a.courseSelected === c.name);
      const rev = cAdm.reduce((s, a) => s + (a.totalFee || 0), 0);
      return { name: c.name, fee: c.fee, leads: cLeads.length, admissions: cAdm.length, revenue: rev, convRate: cLeads.length > 0 ? +((cAdm.length / cLeads.length) * 100).toFixed(1) : 0 };
    }).filter(c => c.leads > 0 || c.admissions > 0).sort((a, b) => b.revenue - a.revenue);
  }, [leads, admissions, courses]);

  // ── Channel Performance ──
  const channelPerf = useMemo(() => {
    const m = new Map<string, { leads: number; admissions: number; revenue: number }>();
    leads.forEach((l) => { const e = m.get(l.source) || { leads: 0, admissions: 0, revenue: 0 }; e.leads++; m.set(l.source, e); });
    admissions.forEach((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      if (lead) { const e = m.get(lead.source) || { leads: 0, admissions: 0, revenue: 0 }; e.admissions++; e.revenue += a.totalFee || 0; m.set(lead.source, e); }
    });
    const totalCRM = leads.length;
    return Array.from(m.entries()).map(([source, d]) => {
      const spend = totalCRM > 0 ? Math.round((d.leads / totalCRM) * totalSpend) : 0;
      return { source, ...d, spend, cpl: d.leads > 0 ? Math.round(spend / d.leads) : 0, cpa: d.admissions > 0 ? Math.round(spend / d.admissions) : 0 };
    }).sort((a, b) => b.admissions - a.admissions);
  }, [leads, admissions, totalSpend]);

  // ── Telecaller Performance ──
  const telecallers = users.filter((u) => u.role === "telecaller");
  const tcPerf = telecallers.map((tc) => {
    const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
    const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
    const connected = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
    const walkIns = leads.filter((l) => l.assignedTelecallerId === tc.id && l.walkInStatus && l.walkInStatus !== "Not Scheduled");
    const converted = admissions.filter((a) => { const lead = leads.find((l) => l.id === a.leadId); return lead?.assignedTelecallerId === tc.id; });
    const per100 = assigned.length > 0 ? +((converted.length / assigned.length) * 100).toFixed(1) : 0;
    return { name: tc.name, assigned: assigned.length, calls: calls.length, connected: connected.length, walkIns: walkIns.length, admissions: converted.length, per100 };
  });

  // ── Counselor Performance ──
  const counselors = users.filter((u) => u.role === "counselor");
  const counselorPerf = counselors.map((co) => {
    const assigned = leads.filter((l) => l.assignedCounselor === co.id);
    const walkIns = assigned.filter((l) => l.walkInStatus === "Completed");
    const converted = admissions.filter((a) => { const lead = leads.find((l) => l.id === a.leadId); return lead?.assignedCounselor === co.id; });
    const revenue = converted.reduce((s, a) => s + (a.totalFee || 0), 0);
    return { name: co.name, walkIns: walkIns.length, admissions: converted.length, revenue };
  });

  // ── Pipeline Forecast ──
  const pipelineForecast = useMemo(() => {
    const stages = [
      { stage: "Interested", probability: 0.15 }, { stage: "Walk-in Scheduled", probability: 0.25 },
      { stage: "Walk-in Completed", probability: 0.50 }, { stage: "Counseling", probability: 0.35 },
      { stage: "Qualified", probability: 0.55 }, { stage: "DoJ Confirmed", probability: 0.80 },
    ];
    return stages.map((s) => {
      let sl;
      if (s.stage === "Walk-in Scheduled") sl = leads.filter((l) => l.walkInStatus === "Scheduled");
      else if (s.stage === "Walk-in Completed") sl = leads.filter((l) => l.walkInStatus === "Completed" && l.status !== "Admission");
      else if (s.stage === "DoJ Confirmed") sl = leads.filter((l) => l.expectedDOJ && l.status !== "Admission");
      else sl = leads.filter((l) => l.status === s.stage);
      const er = sl.reduce((sum, l) => { const c = courses.find((cc) => cc.name === l.interestedCourse); return sum + (c?.fee || 0) * s.probability; }, 0);
      return { ...s, count: sl.length, expectedRevenue: Math.round(er) };
    });
  }, [leads, courses]);
  const totalPipelineRevenue = pipelineForecast.reduce((s, p) => s + p.expectedRevenue, 0);

  // ── Lead Funnel ──
  const funnelStages = useMemo(() => {
    const names = ["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission"];
    const counts = names.map(s => ({ stage: s, count: leads.filter(l => l.status === s).length }));
    return counts.map((s, i) => ({ ...s, convFromPrev: i > 0 && counts[i - 1].count > 0 ? +((s.count / counts[i - 1].count) * 100).toFixed(1) : 0 }));
  }, [leads]);

  // ── Objection Analytics ──
  const objectionData = useMemo(() => {
    const m = new Map<string, number>();
    leads.filter((l) => l.lostReason).forEach((l) => m.set(l.lostReason!, (m.get(l.lostReason!) || 0) + 1));
    callLogs.filter((cl) => cl.notInterestedReason).forEach((cl) => m.set(cl.notInterestedReason!, (m.get(cl.notInterestedReason!) || 0) + 1));
    return Array.from(m.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [leads, callLogs]);

  // ── Follow-up KPIs ──
  const totalFU = followUps.length;
  const completedFU = followUps.filter((f) => f.completed).length;
  const missedFU = followUps.filter((f) => !f.completed && f.date < today).length;

  // ── Fee Collection & Scholarship ──
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const pendingFees = totalRevenue - totalCollected;
  const scholarshipAdmissions = admissions.filter((a) => a.scholarshipApplied);
  const totalScholarshipDiscount = scholarshipAdmissions.reduce((s, a) => s + ((a.totalFee || 0) * (a.scholarshipPercentage || 0) / 100), 0);

  // ── CPA Distribution ──
  const cpaDistribution = useMemo(() => {
    const cats = [
      { label: "Excellent", range: "Below ₹5,500", count: 0, color: "hsl(142, 71%, 45%)" },
      { label: "Healthy", range: "₹5,500 – ₹6,500", count: 0, color: "hsl(38, 92%, 50%)" },
      { label: "Needs Attention", range: "Above ₹6,500", count: 0, color: "hsl(358, 78%, 51%)" },
    ];
    channelPerf.filter(c => c.admissions > 0).forEach(c => {
      if (c.cpa < BENCHMARKS.cpaMin) cats[0].count++;
      else if (c.cpa <= BENCHMARKS.cpaMax) cats[1].count++;
      else cats[2].count++;
    });
    return cats;
  }, [channelPerf]);

  // ── Lead Source Pie ──
  const leadSourceData = useMemo(() => {
    const m = new Map<string, number>();
    leads.forEach((l) => m.set(l.source, (m.get(l.source) || 0) + 1));
    return Array.from(m.entries()).map(([source, count]) => ({ source, count }));
  }, [leads]);

  // ── Platform ROI ──
  const sourceROI = useMemo(() => {
    const m = new Map<string, { spend: number; revenue: number; leads: number; admissions: number }>();
    campaigns.forEach((c) => { const e = m.get(c.platform) || { spend: 0, revenue: 0, leads: 0, admissions: 0 }; e.spend += c.budget || 0; e.leads += c.leadsGenerated || 0; m.set(c.platform, e); });
    admissions.forEach((a) => { const lead = leads.find((l) => l.id === a.leadId); if (lead) { const camp = campaigns.find((c) => c.id === lead.campaignId); if (camp) { const e = m.get(camp.platform) || { spend: 0, revenue: 0, leads: 0, admissions: 0 }; e.revenue += a.totalFee || 0; e.admissions++; m.set(camp.platform, e); } } });
    return Array.from(m.entries()).map(([platform, d]) => ({ platform, ...d, roi: d.spend > 0 ? +(d.revenue / d.spend).toFixed(1) : 0 }));
  }, [campaigns, leads, admissions]);

  // ── Activity Feed ──
  const recentActivities = useMemo(() => {
    const all: { text: string; time: string; type: string }[] = [];
    leads.forEach((l) => { l.activities?.forEach((a) => { all.push({ text: `${l.name} — ${a.description || a.type}`, time: a.timestamp, type: a.type }); }); });
    return all.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }, [leads]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    const items: { type: "error" | "warning" | "info"; msg: string }[] = [];
    if (cpa > BENCHMARKS.cpaMax && admissions.length > 0) items.push({ type: "error", msg: `Admission acquisition cost ₹${cpa.toLocaleString()} exceeding benchmark of ₹${BENCHMARKS.cpaMax.toLocaleString()}.` });
    if (!roasOK && totalSpend > 0) items.push({ type: "error", msg: `ROAS is ${roas.toFixed(1)}x — below ${BENCHMARKS.minROAS}x minimum threshold.` });
    if (!spendEfficient && totalRevenue > 0) items.push({ type: "warning", msg: `Marketing spend ratio ${spendRatio.toFixed(1)}% exceeds ${BENCHMARKS.marketingSpendRatioMax}% industry benchmark.` });
    if (parseFloat(walkInConvRate) < 40 && walkInsCompleted.length > 2) items.push({ type: "warning", msg: `Walk-in conversion at ${walkInConvRate}% — falling below expected.` });
    if (missedFU > 3) items.push({ type: "warning", msg: `${missedFU} follow-ups overdue — missed follow-ups reduce admissions.` });
    const lowTC = tcPerf.filter((t) => t.per100 < 5 && t.assigned > 5);
    lowTC.forEach((t) => items.push({ type: "warning", msg: `${t.name} has low conversion (${t.per100}%).` }));
    return items;
  }, [cpa, roasOK, spendEfficient, roas, spendRatio, totalSpend, totalRevenue, walkInConvRate, walkInsCompleted, missedFU, tcPerf, admissions.length]);

  // ── Insights ──
  const insights = useMemo(() => {
    const items: string[] = [];
    const bestCh = channelPerf.filter(c => c.admissions > 0).sort((a, b) => a.cpa - b.cpa)[0];
    if (bestCh) items.push(`"${bestCh.source}" producing lowest CPA at ₹${bestCh.cpa.toLocaleString()}.`);
    const topC = courseRevenue[0];
    if (topC?.revenue > 0) items.push(`"${topC.name}" generating highest revenue at ₹${topC.revenue.toLocaleString()}.`);
    if (walkInAdmissions.length > 0 && admissions.length > 0) items.push(`Walk-in conversions contributing ${((walkInAdmissions.length / admissions.length) * 100).toFixed(0)}% of admissions.`);
    const topTC = [...tcPerf].sort((a, b) => b.per100 - a.per100)[0];
    if (topTC?.per100 > 0) items.push(`${topTC.name} leads telecaller conversion at ${topTC.per100}%.`);
    const topCo = [...counselorPerf].sort((a, b) => b.revenue - a.revenue)[0];
    if (topCo?.revenue > 0) items.push(`${topCo.name} generated ₹${topCo.revenue.toLocaleString()} in admission revenue.`);
    const bestP = [...sourceROI].sort((a, b) => b.roi - a.roi)[0];
    if (bestP?.roi > 0) items.push(`${bestP.platform} delivering best ROAS at ${bestP.roi}x.`);
    const bestConv = [...courseRevenue].filter(c => c.admissions > 0).sort((a, b) => b.convRate - a.convRate)[0];
    if (bestConv) items.push(`"${bestConv.name}" has highest conversion rate at ${bestConv.convRate}%.`);
    return items.slice(0, 7);
  }, [channelPerf, courseRevenue, walkInAdmissions, admissions, tcPerf, counselorPerf, sourceROI]);

  // ── State ──
  const [activeSection, setActiveSection] = useState("overview");
  const [drillDown, setDrillDown] = useState<string | null>(null);

  // ── Export ──
  const exportReport = (type: string) => {
    if (type === "marketing") {
      downloadCSV("marketing_report.csv", ["Platform", "Spend", "Leads", "Revenue", "ROAS"], sourceROI.map(p => [p.platform, `${p.spend}`, `${p.leads}`, `${p.revenue}`, `${p.roi}x`]));
    } else if (type === "admissions") {
      downloadCSV("admission_report.csv", ["Student", "Course", "Fee", "Source", "Telecaller", "Counselor", "Date"],
        admissions.map(a => { const l = leads.find(ld => ld.id === a.leadId); const tc = users.find(u => u.id === l?.assignedTelecallerId); const co = users.find(u => u.id === l?.assignedCounselor);
          return [a.studentName, a.courseSelected, `${a.totalFee}`, l?.source || "", tc?.name || "", co?.name || "", a.admissionDate]; }));
    } else if (type === "revenue") {
      downloadCSV("revenue_report.csv", ["Course", "Leads", "Admissions", "Revenue", "Conv%"], courseRevenue.map(c => [c.name, `${c.leads}`, `${c.admissions}`, `${c.revenue}`, `${c.convRate}%`]));
    } else if (type === "telecaller") {
      downloadCSV("telecaller_report.csv", ["Agent", "Assigned", "Calls", "Connected", "Walk-ins", "Admissions", "Per100"], tcPerf.map(t => [t.name, `${t.assigned}`, `${t.calls}`, `${t.connected}`, `${t.walkIns}`, `${t.admissions}`, `${t.per100}%`]));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Director Command Center</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Financial & operational command center</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["overview", "revenue", "verticals", "pipeline", "team", "marketing", "insights"].map((tab) => (
            <button key={tab} onClick={() => setActiveSection(tab)}
              className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium capitalize transition-colors ${activeSection === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 16: Automated Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${a.type === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-warning/30 bg-warning/5 text-warning"}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" /> {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 2: Marketing KPIs ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard title="Leads This Month" value={totalLeadsGenerated} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Campaign Spend" value={`₹${totalSpend.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Cost Per Lead" value={`₹${cpl}`} icon={<Target className="h-5 w-5" />} />
        <StatCard title="CPA" value={`₹${cpa.toLocaleString()}`} icon={<Target className="h-5 w-5" />}
          trend={cpaStatus === "excellent" ? "Excellent ✓" : cpaStatus === "healthy" ? "Healthy ✓" : "Needs Attention ✗"}
          className={cpaStatus === "attention" ? "border-destructive/20" : ""} />
        <StatCard title="ROAS" value={`${roas.toFixed(1)}x`} icon={<BarChart3 className="h-5 w-5" />}
          trend={roasOK ? `≥${BENCHMARKS.minROAS}x ✓` : `< ${BENCHMARKS.minROAS}x ✗`}
          className={!roasOK && totalSpend > 0 ? "border-destructive/20" : ""} />
        <div className="rounded-xl bg-card p-3 sm:p-5 shadow-card cursor-pointer hover:shadow-card-hover" onClick={() => setDrillDown("admissions")}>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Admissions</p>
          <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-primary underline decoration-dotted">{admissions.length}</p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground">Click to drill down</p>
        </div>
        <StatCard title="Conv Rate" value={`${convRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Avg ATT" value={`${avgATT}d`} icon={<Timer className="h-5 w-5" />} />
      </div>

      {/* ── SECTION 3: Revenue Efficiency Widget ── */}
      {(activeSection === "overview" || activeSection === "revenue") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Revenue vs Marketing Spend</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Marketing Spend</span><span className="font-semibold">₹{totalSpend.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue Generated</span><span className="font-semibold text-success">₹{totalRevenue.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Marketing Spend Ratio</span><span className={`font-bold text-lg ${spendEfficient ? "text-success" : "text-destructive"}`}>{spendRatio.toFixed(1)}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Benchmark</span><span className="font-medium">≤ {BENCHMARKS.marketingSpendRatioMax}%</span></div>
              <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${spendEfficient ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                {spendEfficient ? "✓ Efficient Marketing" : "⚠ Marketing Overspend Alert"}
              </Badge>
            </div>
          </div>

          {/* ── SECTION 4: ROAS Monitor ── */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> ROAS Monitor</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current ROAS</span><span className={`text-2xl font-bold ${roasOK ? "text-success" : "text-destructive"}`}>{roas.toFixed(1)}x</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Minimum Target</span><span className="font-semibold">{BENCHMARKS.minROAS}x</span></div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${roasOK ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min((roas / 25) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-center text-muted-foreground">Range: 1x – 25x</p>
              {!roasOK && totalSpend > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs w-full justify-center py-1">⚠ ROAS below {BENCHMARKS.minROAS}x threshold</Badge>}
            </div>
          </div>

          {/* ── SECTION 6: Monthly Billing Tracker ── */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Monthly Billing Tracker</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Target Billing</span><span className="font-semibold">₹{billingTarget.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current Billing</span><span className="font-semibold text-success">₹{totalRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Remaining Target</span><span className="font-semibold text-destructive">₹{billingRemaining.toLocaleString()}</span></div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${billingProgress}%` }} />
              </div>
              <p className="text-xs text-center text-muted-foreground">{billingProgress.toFixed(0)}% of monthly target</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: CPA Distribution & Walk-ins ── */}
      {(activeSection === "overview") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">CPA Distribution by Channel</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cpaDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" name="Channels">
                  {cpaDistribution.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {cpaDistribution.map(c => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.label} ({c.range})</span>
                  <span className="font-medium">{c.count} channels</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 10: Walk-in Analytics ── */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Walk-in Contribution Analytics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Scheduled</p><p className="text-xl font-bold text-card-foreground">{walkInsScheduled.length}</p></div>
              <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold text-card-foreground">{walkInsCompleted.length}</p></div>
              <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Admissions</p><p className="text-xl font-bold text-primary">{walkInAdmissions.length}</p></div>
              <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Conversion</p><p className="text-xl font-bold text-success">{walkInConvRate}%</p></div>
            </div>
            {walkInsNoShow.length > 0 && <Badge variant="outline" className="mt-3 bg-destructive/10 text-destructive text-xs">{walkInsNoShow.length} No Shows</Badge>}
          </div>
        </div>
      )}

      {/* ── SECTION 7: Course-wise Revenue ── */}
      {(activeSection === "overview" || activeSection === "revenue") && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-card-foreground">Course-wise Revenue Analytics</h3>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => exportReport("revenue")}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Course</th>
                  <th className="pb-2 font-medium text-center">Leads</th>
                  <th className="pb-2 font-medium text-center">Admissions</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-center">Conv%</th>
                </tr>
              </thead>
              <tbody>
                {courseRevenue.map((c, i) => (
                  <tr key={c.name} className={`border-b last:border-0 ${i === 0 && c.revenue > 0 ? "bg-primary/5" : ""}`}>
                    <td className="py-2.5 font-medium text-card-foreground">{c.name} {i === 0 && c.revenue > 0 && <Badge variant="outline" className="ml-1 text-[9px] bg-primary/10 text-primary">Top Revenue</Badge>}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{c.leads}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{c.admissions}</td>
                    <td className="py-2.5 text-right font-semibold text-success">₹{c.revenue.toLocaleString()}</td>
                    <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${c.convRate >= 20 ? "bg-success/10 text-success" : c.convRate > 0 ? "bg-warning/10 text-warning" : ""}`}>{c.convRate}%</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fee Collection + Scholarship + Avg Ticket */}
      {(activeSection === "revenue") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Fee Collection</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Invoiced</span><span className="font-semibold">₹{totalRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Collected</span><span className="font-semibold text-success">₹{totalCollected.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending</span><span className="font-semibold text-destructive">₹{pendingFees.toLocaleString()}</span></div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${collectionRate}%` }} /></div>
              <p className="text-xs text-center text-muted-foreground">{collectionRate}% collected</p>
            </div>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Scholarship Impact</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Scholarship Students</span><span className="font-semibold">{scholarshipAdmissions.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Discount Given</span><span className="font-semibold text-warning">₹{totalScholarshipDiscount.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">EMI Students</span><span className="font-semibold">{admissions.filter(a => a.emiSelected).length}</span></div>
              {scholarshipAdmissions.map(a => (
                <div key={a.id} className="flex justify-between text-xs border rounded p-2">
                  <span className="text-card-foreground">{a.studentName}</span>
                  <Badge variant="outline" className="text-[9px]">{a.scholarshipPercentage}% off</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Avg Ticket Size</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Fee</span><span className="font-semibold text-xl">₹{avgFee.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost Per Lead</span><span className="font-semibold">₹{cpl}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost Per Admission</span><span className={`font-semibold ${cpaStatus === "attention" ? "text-destructive" : "text-success"}`}>₹{cpa.toLocaleString()}</span></div>
              <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${cpaStatus === "excellent" ? "bg-success/10 text-success" : cpaStatus === "healthy" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                CPA: {cpaStatus === "excellent" ? "Below ₹5,500 — Excellent" : cpaStatus === "healthy" ? "₹5,500–₹6,500 — Healthy" : "Above ₹6,500 — Needs Attention"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 13: Lead Funnel ── */}
      {(activeSection === "overview" || activeSection === "pipeline") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead-to-Admission Funnel</h3>
            <div className="space-y-1.5">
              {funnelStages.map((s, i) => {
                const max = Math.max(...funnelStages.map(x => x.count), 1);
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className="w-24 text-[11px] text-muted-foreground truncate">{s.stage}</span>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div className="h-full rounded flex items-center px-2" style={{ width: `${Math.max((s.count / max) * 100, s.count > 0 ? 8 : 0)}%`, background: s.stage === "Admission" ? "hsl(var(--primary))" : CHART_COLORS[i % CHART_COLORS.length] }}>
                        <span className="text-[9px] font-medium text-white">{s.count}</span>
                      </div>
                    </div>
                    {i > 0 && <span className="w-12 text-[10px] text-right text-muted-foreground">{s.convFromPrev}%</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead Source Pie */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead Source Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leadSourceData} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={90} label={({ source, count }) => `${source}: ${count}`}>
                  {leadSourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── SECTION 12: Pipeline Forecast ── */}
      {(activeSection === "pipeline") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Revenue Pipeline Forecast</h3>
            <div className="space-y-2">
              {pipelineForecast.map(p => (
                <div key={p.stage} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-sm font-medium text-card-foreground">{p.stage}</p><p className="text-xs text-muted-foreground">{p.count} leads · {(p.probability * 100).toFixed(0)}% probability</p></div>
                  <span className="font-semibold text-sm text-primary">₹{(p.expectedRevenue / 1000).toFixed(0)}k</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between px-3 py-2"><span className="font-semibold text-card-foreground">Total Pipeline</span><span className="text-lg font-bold text-primary">₹{(totalPipelineRevenue / 100000).toFixed(1)}L</span></div>
            </div>
          </div>
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
      )}

      {/* ── VERTICALS TAB: 4-Channel Revenue View ── */}
      {(activeSection === "verticals") && (
        <>
          {/* Revenue Blocks — Section 24 & 25 */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-card p-5 shadow-card border-l-4 border-primary">
              <p className="text-xs text-muted-foreground">Individual Admissions</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">₹{individualRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{admissions.length} students</p>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card border-l-4 border-warning">
              <p className="text-xs text-muted-foreground">Internship Revenue</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">₹{internshipRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{internshipAdmissions.length} interns</p>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card border-l-4 border-info">
              <p className="text-xs text-muted-foreground">College Program Revenue</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">₹{collegeRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{collegeAccounts.length} colleges · {collegePrograms.length} programs</p>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-card border-l-4 border-success">
              <p className="text-xs text-muted-foreground">School Program Revenue</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">₹{schoolRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{schoolAccounts.length} schools · {schoolPrograms.length} programs</p>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-card-foreground">Total Revenue Summary</h3>
              <span className="text-lg font-bold text-primary">₹{totalMultiVerticalRevenue.toLocaleString()}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
              {totalMultiVerticalRevenue > 0 && (
                <>
                  <div className="h-full bg-primary" style={{ width: `${(individualRevenue / totalMultiVerticalRevenue) * 100}%` }} title="Individual" />
                  <div className="h-full bg-warning" style={{ width: `${(internshipRevenue / totalMultiVerticalRevenue) * 100}%` }} title="Internship" />
                  <div className="h-full bg-info" style={{ width: `${(collegeRevenue / totalMultiVerticalRevenue) * 100}%` }} title="College" />
                  <div className="h-full bg-success" style={{ width: `${(schoolRevenue / totalMultiVerticalRevenue) * 100}%` }} title="School" />
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Individual ({totalMultiVerticalRevenue > 0 ? ((individualRevenue / totalMultiVerticalRevenue) * 100).toFixed(0) : 0}%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Internship ({totalMultiVerticalRevenue > 0 ? ((internshipRevenue / totalMultiVerticalRevenue) * 100).toFixed(0) : 0}%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-info" /> College ({totalMultiVerticalRevenue > 0 ? ((collegeRevenue / totalMultiVerticalRevenue) * 100).toFixed(0) : 0}%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> School ({totalMultiVerticalRevenue > 0 ? ((schoolRevenue / totalMultiVerticalRevenue) * 100).toFixed(0) : 0}%)</span>
            </div>
          </div>

          {/* Section 26: Three Funnels */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* B2C Funnel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">B2C Funnel</h4>
              <div className="space-y-1">
                {["New", "Contacted", "Follow-up", "Counseling", "Admission"].map((s, i) => {
                  const count = individualLeads.filter(l => l.status === s).length;
                  const max = Math.max(...["New", "Contacted", "Follow-up", "Counseling", "Admission"].map(st => individualLeads.filter(l => l.status === st).length), 1);
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-20 text-[10px] text-muted-foreground truncate">{s}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div className="h-full rounded bg-primary flex items-center px-1" style={{ width: `${Math.max((count / max) * 100, count > 0 ? 10 : 0)}%` }}>
                          <span className="text-[8px] font-medium text-primary-foreground">{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Internship Funnel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Internship Funnel</h4>
              <div className="space-y-1">
                {["Internship Lead", "Call Attempted", "Internship Discussion", "Proposal Shared", "Internship Confirmed", "Batch Start"].map((s) => {
                  const count = internshipLeads.filter(l => l.internshipPipelineStage === s).length;
                  const max = Math.max(...["Internship Lead", "Call Attempted", "Internship Discussion", "Proposal Shared", "Internship Confirmed", "Batch Start"].map(st => internshipLeads.filter(l => l.internshipPipelineStage === st).length), 1);
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] text-muted-foreground truncate">{s.replace("Internship ", "")}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div className="h-full rounded bg-warning flex items-center px-1" style={{ width: `${Math.max((count / max) * 100, count > 0 ? 10 : 0)}%` }}>
                          <span className="text-[8px] font-medium text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Institutional Funnel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Institutional Funnel</h4>
              <div className="space-y-1">
                {["Identified", "Meeting Scheduled", "Proposal Shared", "Negotiation", "Agreement Signed", "Program Launch"].map((s) => {
                  const collegeCount = collegeAccounts.filter(c => c.pipelineStage === s || c.pipelineStage === `College ${s}`).length;
                  const schoolCount = schoolAccounts.filter(sc => sc.pipelineStage === s || sc.pipelineStage === `School ${s}`).length;
                  const total = collegeCount + schoolCount;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] text-muted-foreground truncate">{s}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden flex">
                        {collegeCount > 0 && <div className="h-full bg-info flex items-center px-1" style={{ width: `${(collegeCount / Math.max(total, 1)) * 100}%` }}><span className="text-[8px] font-medium text-white">{collegeCount}</span></div>}
                        {schoolCount > 0 && <div className="h-full bg-success flex items-center px-1" style={{ width: `${(schoolCount / Math.max(total, 1)) * 100}%` }}><span className="text-[8px] font-medium text-white">{schoolCount}</span></div>}
                      </div>
                      <span className="w-6 text-[10px] text-right text-muted-foreground">{total}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-info" /> Colleges</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Schools</span>
              </div>
            </div>
          </div>

          {/* Institutional KPIs */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Colleges Contacted" value={collegeAccounts.length} icon={<Building2 className="h-5 w-5" />} />
            <StatCard title="Schools Contacted" value={schoolAccounts.length} icon={<School className="h-5 w-5" />} />
            <StatCard title="Meetings Scheduled" value={collegeAccounts.filter(c => c.pipelineStage === "Meeting Scheduled").length + schoolAccounts.filter(s => s.pipelineStage === "Meeting Scheduled").length} icon={<Calendar className="h-5 w-5" />} />
            <StatCard title="Programs Signed" value={collegeAccounts.filter(c => c.pipelineStage === "Agreement Signed" || c.pipelineStage === "Program Launch").length + schoolAccounts.filter(s => s.pipelineStage === "Agreement Signed" || s.pipelineStage === "Program Launch").length} icon={<Target className="h-5 w-5" />} />
            <StatCard title="Internship Conv." value={internshipAdmissions.length} icon={<GraduationCap className="h-5 w-5" />} />
            <StatCard title="Internship Calls" value={callLogs.filter(cl => internshipLeads.some(l => l.id === cl.leadId)).length} icon={<PhoneCall className="h-5 w-5" />} />
          </div>
        </>
      )}


      {(activeSection === "overview" || activeSection === "team") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2"><PhoneCall className="h-4 w-4 text-primary" /> Telecaller Performance Impact</h3>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => exportReport("telecaller")}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">Agent</th><th className="pb-2 font-medium text-center">Assigned</th><th className="pb-2 font-medium text-center">Calls</th><th className="pb-2 font-medium text-center">Connected</th><th className="pb-2 font-medium text-center">Walk-ins</th><th className="pb-2 font-medium text-center">Admissions</th><th className="pb-2 font-medium text-center">Per 100</th></tr></thead>
                <tbody>
                  {tcPerf.map((tc, i) => {
                    const isBest = tcPerf.length > 1 && tc.per100 === Math.max(...tcPerf.map(t => t.per100));
                    return (
                      <tr key={tc.name} className={`border-b last:border-0 ${isBest ? "bg-success/5" : ""}`}>
                        <td className="py-2.5 font-medium text-card-foreground">{tc.name} {isBest && <Badge variant="outline" className="ml-1 text-[9px] bg-success/10 text-success">Top</Badge>}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.assigned}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.calls}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.connected}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.walkIns}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{tc.admissions}</td>
                        <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${tc.per100 >= 10 ? "bg-success/10 text-success" : tc.per100 >= 5 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{tc.per100}%</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 11: Counselor Revenue ── */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Counselor Revenue Contribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">Counselor</th><th className="pb-2 font-medium text-center">Walk-ins</th><th className="pb-2 font-medium text-center">Admissions</th><th className="pb-2 font-medium text-right">Revenue</th></tr></thead>
                <tbody>
                  {counselorPerf.map(co => (
                    <tr key={co.name} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-card-foreground">{co.name}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{co.walkIns}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{co.admissions}</td>
                      <td className="py-2.5 text-right font-semibold text-success">₹{co.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 15: Follow-up Performance ── */}
      {(activeSection === "team") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard title="Follow-ups Scheduled" value={totalFU} icon={<Calendar className="h-5 w-5" />} />
          <StatCard title="Follow-ups Completed" value={completedFU} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard title="Missed Follow-ups" value={missedFU} icon={<AlertTriangle className="h-5 w-5" />} className={missedFU > 3 ? "border-destructive/20" : ""} />
        </div>
      )}

      {/* ── SECTION 14: Objection Analytics ── */}
      {(activeSection === "overview" || activeSection === "pipeline") && objectionData.length > 0 && (
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

      {/* ── SECTION 8: Marketing Channel Performance ── */}
      {(activeSection === "marketing") && (
        <>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-card-foreground">Marketing Channel Performance</h3>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => exportReport("marketing")}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">Lead Source</th><th className="pb-2 font-medium text-center">Leads</th><th className="pb-2 font-medium text-center">Admissions</th><th className="pb-2 font-medium text-center">CPL</th><th className="pb-2 font-medium text-center">CPA</th></tr></thead>
                <tbody>
                  {channelPerf.map(ch => (
                    <tr key={ch.source} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-card-foreground">{ch.source}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{ch.leads}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{ch.admissions}</td>
                      <td className="py-2.5 text-center text-muted-foreground">₹{ch.cpl}</td>
                      <td className="py-2.5 text-center">{ch.admissions > 0 ? <Badge variant="outline" className={`text-[10px] ${ch.cpa <= BENCHMARKS.cpaMax ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>₹{ch.cpa}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform ROI */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Platform ROI Comparison</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sourceROI}>
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
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Campaign Performance</h3>
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {campaigns.map(c => (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                      <Badge variant="outline" className={`text-[10px] ${c.approvalStatus === "Active" ? "bg-success/10 text-success" : ""}`}>{c.approvalStatus}</Badge>
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>₹{(c.budget || 0).toLocaleString()}</span><span>Leads: {c.leadsGenerated || 0}</span><span>CPL: ₹{c.costPerLead || 0}</span><span>{c.platform}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION 19: Strategic Insights + SECTION 18: Export ── */}
      {(activeSection === "insights") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Strategic Insights Engine</h3>
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3 bg-primary/5">
                  <ArrowUpRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-card-foreground">{ins}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Monthly Performance Reports</h3>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Export detailed reports in CSV format.</p>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => exportReport("marketing")}><Download className="mr-2 h-3.5 w-3.5" /> Marketing Performance Report</Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => exportReport("admissions")}><Download className="mr-2 h-3.5 w-3.5" /> Admission Analytics Report</Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => exportReport("revenue")}><Download className="mr-2 h-3.5 w-3.5" /> Revenue Analytics Report</Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs" onClick={() => exportReport("telecaller")}><Download className="mr-2 h-3.5 w-3.5" /> Telecaller Performance Report</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Feed (overview only) ── */}
      {activeSection === "overview" && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live Activity Feed</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Activity className="h-3 w-3 text-primary" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-card-foreground truncate">{act.text}</p><p className="text-[10px] text-muted-foreground">{new Date(act.time).toLocaleString()}</p></div>
                <Badge variant="outline" className="text-[9px] shrink-0">{act.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 17: Drill-down Dialog ── */}
      <Dialog open={drillDown === "admissions"} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Admission Records ({admissions.length})</DialogTitle></DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">Student</th><th className="pb-2 font-medium">Course</th><th className="pb-2 font-medium text-right">Fee</th><th className="pb-2 font-medium">Source</th><th className="pb-2 font-medium">Telecaller</th><th className="pb-2 font-medium">Counselor</th><th className="pb-2 font-medium">Date</th></tr></thead>
              <tbody>
                {admissions.map(a => {
                  const lead = leads.find(l => l.id === a.leadId);
                  const tc = users.find(u => u.id === lead?.assignedTelecallerId);
                  const co = users.find(u => u.id === lead?.assignedCounselor);
                  return (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-card-foreground">{a.studentName}</td>
                      <td className="py-2 text-muted-foreground">{a.courseSelected}</td>
                      <td className="py-2 text-right text-success">₹{(a.totalFee || 0).toLocaleString()}</td>
                      <td className="py-2 text-muted-foreground">{lead?.source || "—"}</td>
                      <td className="py-2 text-muted-foreground">{tc?.name || "—"}</td>
                      <td className="py-2 text-muted-foreground">{co?.name || "—"}</td>
                      <td className="py-2 text-muted-foreground">{a.admissionDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function AdminDashboard() {
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const users = store.getUsers();
  const campaigns = store.getCampaigns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System administration and operations</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={users.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active Leads" value={leads.filter((l) => l.status !== "Lost" && l.status !== "Admission").length} icon={<Activity className="h-5 w-5" />} />
        <StatCard title="Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Campaigns" value={campaigns.length} icon={<Megaphone className="h-5 w-5" />} />
      </div>

      {/* User management */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Settings className="h-4 w-4" /> User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2.5 font-medium text-card-foreground">{u.name}</td>
                  <td className="py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="py-2.5"><Badge variant="outline" className="text-[10px]">{roleLabels[u.role]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead Pipeline</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission", "Lost"] as const).map((status) => (
            <div key={status} className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{status}</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">{leads.filter((l) => l.status === status).length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROLE DASHBOARD ROUTER
   ═══════════════════════════════════════════════════════════════ */
export default function RoleDashboard() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">User role not assigned. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  switch (currentUser.role) {
    case "telecaller": return <TelecallerDashboard />;
    case "counselor": return <CounselorDashboard />;
    case "marketing_manager": return <MarketingDashboard />;
    case "telecalling_manager": return <TelecallingManagerDashboard />;
    case "owner": return <OwnerDashboard />;
    case "admin": return <AdminDashboard />;
    case "alliance_manager": return <AllianceManagerDashboard />;
    case "alliance_executive": return <AllianceExecutiveDashboard />;
    default: return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-destructive">You do not have permission to access this dashboard.</p>
      </div>
    );
  }
}

// ── Alliance Dashboards (premium upgrade) ──
import { AllianceManagerDashboard } from "@/components/alliance/AllianceManagerDashboard";
import { AllianceExecutiveDashboard } from "@/components/alliance/AllianceExecutiveDashboard";

