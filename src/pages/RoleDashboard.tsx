import { useAuth, roleLabels } from "@/lib/auth-context";
import { store } from "@/lib/mock-data";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneCall, Users, Target, Calendar, GraduationCap, Megaphone,
  TrendingUp, DollarSign, Activity, Shield, Clock, Star, Zap, BarChart3,
  UserPlus, Settings, AlertTriangle, Timer
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecaller Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser!.name}</p>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="New Leads" value={newLeads.length} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard title="Callback Requests" value={callbackLeads.length} icon={<Phone className="h-5 w-5" />} />
        <StatCard title="Counselling Requests" value={counsellingReqs.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Application Leads" value={applicationLeads.length} icon={<Target className="h-5 w-5" />} />
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
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const today = new Date().toISOString().split("T")[0];

  const pendingCounseling = leads.filter((l) => l.status === "Counseling");
  const hotLeads = leads.filter((l) => l.intentCategory === "High Intent" && l.qualification?.budgetConfirmed && l.status !== "Admission" && l.status !== "Lost");
  const admissionsToday = admissions.filter((a) => a.admissionDate === today);
  const scholarshipReqs = leads.filter((l) => l.scholarshipApplied && l.status !== "Admission" && l.status !== "Lost");
  const emiLeads = leads.filter((l) => l.emiSelected && l.status !== "Admission" && l.status !== "Lost");
  const highTicket = leads.filter((l) => {
    const course = store.getCourses().find((c) => c.name === l.interestedCourse);
    return course && course.fee >= 160000 && l.status !== "Admission" && l.status !== "Lost";
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Counselor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Convert qualified leads into admissions</p>
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
   OWNER / DIRECTOR DASHBOARD — Enterprise Analytics
   ═══════════════════════════════════════════════════════════════ */
function OwnerDashboard() {
  const campaigns = store.getCampaigns();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const callLogs = store.getCallLogs();
  const followUps = store.getFollowUps();
  const users = store.getUsers();
  const courses = store.getCourses();
  const today = new Date().toISOString().split("T")[0];

  const totalRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);
  const totalCollected = admissions.reduce((s, a) => s + (a.paymentHistory?.reduce((ps, p) => ps + (p.amountPaid || 0), 0) || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeadsGenerated = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
  const cac = admissions.length > 0 ? Math.round(totalSpend / admissions.length) : 0;
  const convRate = leads.length > 0 ? ((admissions.length / leads.length) * 100).toFixed(1) : "0";
  const avgFee = admissions.length > 0 ? Math.round(totalRevenue / admissions.length) : 0;
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : "0";
  const cpl = totalLeadsGenerated > 0 ? Math.round(totalSpend / totalLeadsGenerated) : 0;

  const conversionData = admissions.map((adm) => {
    const lead = leads.find((l) => l.id === adm.leadId);
    return lead ? daysBetween(lead.createdAt, adm.admissionDate) : 0;
  });
  const avgATT = conversionData.length > 0 ? +(conversionData.reduce((s, d) => s + d, 0) / conversionData.length).toFixed(1) : 0;

  const activeLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost");
  const hotLeads = leads.filter((l) => l.temperature === "Hot" && l.status !== "Admission" && l.status !== "Lost");

  // Revenue by course
  const revByCourse = useMemo(() => {
    const m = new Map<string, number>();
    admissions.forEach((a) => {
      m.set(a.courseSelected, (m.get(a.courseSelected) || 0) + (a.totalFee || 0));
    });
    return Array.from(m.entries()).map(([course, revenue]) => ({ course: course.length > 15 ? course.substring(0, 15) + "…" : course, revenue }));
  }, [admissions]);

  // Revenue by payment mode
  const revByPaymentMode = useMemo(() => {
    const m = new Map<string, number>();
    admissions.forEach((a) => {
      a.paymentHistory?.forEach((p) => {
        m.set(p.paymentMode || "Other", (m.get(p.paymentMode || "Other") || 0) + (p.amountPaid || 0));
      });
    });
    return Array.from(m.entries()).map(([mode, amount]) => ({ mode, amount }));
  }, [admissions]);

  // Source ROI
  const sourceROI = useMemo(() => {
    const m = new Map<string, { spend: number; revenue: number; leads: number; admissions: number }>();
    campaigns.forEach((c) => {
      const e = m.get(c.platform) || { spend: 0, revenue: 0, leads: 0, admissions: 0 };
      e.spend += c.budget || 0; e.leads += c.leadsGenerated || 0;
      m.set(c.platform, e);
    });
    admissions.forEach((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      if (lead) {
        const camp = campaigns.find((c) => c.id === lead.campaignId);
        if (camp) {
          const e = m.get(camp.platform) || { spend: 0, revenue: 0, leads: 0, admissions: 0 };
          e.revenue += a.totalFee || 0; e.admissions++;
          m.set(camp.platform, e);
        }
      }
    });
    return Array.from(m.entries()).map(([platform, d]) => ({ platform, ...d, roi: d.spend > 0 ? +(d.revenue / d.spend).toFixed(1) : 0 }));
  }, [campaigns, leads, admissions]);

  // Lead source distribution
  const leadSourceData = useMemo(() => {
    const m = new Map<string, number>();
    leads.forEach((l) => m.set(l.source, (m.get(l.source) || 0) + 1));
    return Array.from(m.entries()).map(([source, count]) => ({ source, count }));
  }, [leads]);

  // 11-stage pipeline funnel
  const pipelineStages = ["New", "Contact Attempted", "Contacted", "Interested", "Follow-up", "Application Submitted", "Counseling", "Qualified", "Admission Discussion", "Admission", "Lost"];
  const pipelineCounts = pipelineStages.map((s) => ({
    stage: s, count: leads.filter((l) => l.status === s).length,
  }));
  const activePipeline = pipelineCounts.filter((p) => p.stage !== "Lost");

  // Telecaller scoreboard
  const telecallers = users.filter((u) => u.role === "telecaller");
  const tcPerf = telecallers.map((tc) => {
    const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
    const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
    const connected = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
    const converted = admissions.filter((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      return lead?.assignedTelecallerId === tc.id;
    });
    return {
      name: tc.name, calls: calls.length, connected: connected.length,
      admissions: converted.length, assigned: assigned.length,
      connectionRate: calls.length > 0 ? +((connected.length / calls.length) * 100).toFixed(0) : 0,
    };
  });

  // Counselor scoreboard
  const counselors = users.filter((u) => u.role === "counselor");
  const counselorPerf = counselors.map((co) => {
    const assigned = leads.filter((l) => l.assignedCounselor === co.id);
    const counseled = assigned.filter((l) => l.activities?.some((a) => a.type === "Counseling Done"));
    const converted = admissions.filter((a) => {
      const lead = leads.find((l) => l.id === a.leadId);
      return lead?.assignedCounselor === co.id;
    });
    return { name: co.name, assigned: assigned.length, counseled: counseled.length, admissions: converted.length };
  });

  // Fee collection progress
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const pendingFees = totalRevenue - totalCollected;

  // Course-wise admission breakdown
  const courseAdmissions = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    admissions.forEach((a) => {
      const e = m.get(a.courseSelected) || { count: 0, revenue: 0 };
      e.count++; e.revenue += a.totalFee || 0;
      m.set(a.courseSelected, e);
    });
    return Array.from(m.entries()).map(([course, d]) => ({ course: course.length > 18 ? course.substring(0, 18) + "…" : course, ...d }));
  }, [admissions]);

  // Scholarship impact
  const scholarshipAdmissions = admissions.filter((a) => a.scholarshipApplied);
  const totalScholarshipDiscount = scholarshipAdmissions.reduce((s, a) => s + ((a.totalFee || 0) * (a.scholarshipPercentage || 0) / 100), 0);

  // Activity feed (recent across all leads)
  const recentActivities = useMemo(() => {
    const all: { text: string; time: string; type: string }[] = [];
    leads.forEach((l) => {
      l.activities?.forEach((a) => {
        all.push({ text: `${l.name} — ${a.description || a.type}`, time: a.timestamp, type: a.type });
      });
    });
    return all.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }, [leads]);

  const [activeSection, setActiveSection] = useState<string>("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Director Command Center</h1>
          <p className="text-sm text-muted-foreground">Enterprise analytics & business intelligence</p>
        </div>
        <div className="flex gap-2">
          {["overview", "revenue", "pipeline", "team", "marketing"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${activeSection === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section 1: KPI Ribbon (always visible) ─── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Active Leads" value={activeLeads.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Hot Leads" value={hotLeads.length} icon={<Zap className="h-5 w-5" />} trend={hotLeads.length > 0 ? "Ready to convert" : undefined} />
        <StatCard title="Conv Rate" value={`${convRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="CAC" value={`₹${cac.toLocaleString()}`} icon={<Target className="h-5 w-5" />} />
        <StatCard title="ROAS" value={`${roas}x`} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="Avg ATT" value={`${avgATT}d`} icon={<Timer className="h-5 w-5" />} />
      </div>

      {/* ─── Section 2: Revenue Analytics ─── */}
      {(activeSection === "overview" || activeSection === "revenue") && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue by Course */}
          <div className="rounded-xl bg-card p-5 shadow-card lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Revenue by Course</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revByCourse}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="course" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Mode Donut */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Payment Modes</h3>
            {revByPaymentMode.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={revByPaymentMode} dataKey="amount" nameKey="mode" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ mode, percent }) => `${mode}: ${(percent * 100).toFixed(0)}%`}>
                    {revByPaymentMode.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Amount"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-10">No payment data</p>}
          </div>
        </div>
      )}

      {/* Fee Collection Summary */}
      {(activeSection === "overview" || activeSection === "revenue") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Fee Collection</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invoiced</span>
                <span className="font-semibold text-card-foreground">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Collected</span>
                <span className="font-semibold text-success">₹{totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-destructive">₹{pendingFees.toLocaleString()}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${collectionRate}%` }} />
              </div>
              <p className="text-xs text-center text-muted-foreground">{collectionRate}% collected</p>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Scholarship Impact</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scholarship Students</span>
                <span className="font-semibold text-card-foreground">{scholarshipAdmissions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discount Given</span>
                <span className="font-semibold text-warning">₹{totalScholarshipDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">EMI Students</span>
                <span className="font-semibold text-card-foreground">{admissions.filter((a) => a.emiSelected).length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Avg Ticket Size</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Fee</span>
                <span className="font-semibold text-card-foreground">₹{avgFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost Per Lead</span>
                <span className="font-semibold text-card-foreground">₹{cpl.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost Per Admission</span>
                <span className="font-semibold text-card-foreground">₹{cac.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Section 3: Lead Pipeline Funnel ─── */}
      {(activeSection === "overview" || activeSection === "pipeline") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead-to-Admission Funnel (11 Stages)</h3>
            <div className="space-y-1.5">
              {pipelineCounts.map((p, i) => {
                const max = Math.max(...pipelineCounts.map((x) => x.count), 1);
                const pct = leads.length > 0 ? ((p.count / leads.length) * 100).toFixed(0) : "0";
                return (
                  <div key={p.stage} className="flex items-center gap-3">
                    <span className="w-32 text-[11px] text-muted-foreground truncate">{p.stage}</span>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div className="h-full rounded flex items-center px-2 transition-all" style={{ width: `${Math.max((p.count / max) * 100, p.count > 0 ? 8 : 0)}%`, background: p.stage === "Lost" ? "hsl(var(--destructive))" : CHART_COLORS[i % CHART_COLORS.length] }}>
                        <span className="text-[9px] font-medium text-white whitespace-nowrap">{p.count}</span>
                      </div>
                    </div>
                    <span className="w-10 text-[10px] text-muted-foreground text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead Source Pie */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Lead Source Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
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

      {/* ─── Section 4: Team Scoreboards ─── */}
      {(activeSection === "overview" || activeSection === "team") && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Telecaller Scoreboard */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><PhoneCall className="h-4 w-4 text-primary" /> Telecaller Scoreboard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium text-center">Calls</th>
                    <th className="pb-2 font-medium text-center">Conn%</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                  </tr>
                </thead>
                <tbody>
                  {tcPerf.map((tc) => (
                    <tr key={tc.name} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-card-foreground">{tc.name}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{tc.calls}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className={`text-[10px] ${tc.connectionRate >= 50 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{tc.connectionRate}%</Badge>
                      </td>
                      <td className="py-2.5 text-center text-muted-foreground">{tc.admissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Counselor Scoreboard */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Counselor Scoreboard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Counselor</th>
                    <th className="pb-2 font-medium text-center">Assigned</th>
                    <th className="pb-2 font-medium text-center">Counseled</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                  </tr>
                </thead>
                <tbody>
                  {counselorPerf.map((co) => (
                    <tr key={co.name} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-card-foreground">{co.name}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{co.assigned}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{co.counseled}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{co.admissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Section 5: Marketing / Campaign ROI ─── */}
      {(activeSection === "overview" || activeSection === "marketing") && (
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

          {/* Campaign cards */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Campaign Performance</h3>
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {campaigns.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                    <Badge variant="outline" className={`text-[10px] ${c.approvalStatus === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{c.approvalStatus}</Badge>
                  </div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span>Budget: ₹{(c.budget || 0).toLocaleString()}</span>
                    <span>Leads: {c.leadsGenerated || 0}</span>
                    <span>CPL: ₹{c.costPerLead || 0}</span>
                    <span>{c.platform}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Section 6: Course-wise Admissions ─── */}
      {(activeSection === "overview" || activeSection === "revenue") && courseAdmissions.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Course-wise Admission Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={courseAdmissions} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="course" type="category" width={130} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="count" name="Admissions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Section 7: Activity Feed ─── */}
      {activeSection === "overview" && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live Activity Feed</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground truncate">{act.text}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(act.time).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{act.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
    default: return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-destructive">You do not have permission to access this dashboard.</p>
      </div>
    );
  }
}
