/**
 * Alliance Manager — Premium Dashboard
 * Drilldown KPI cards, clickable funnel, leaderboard, district heatmap, at-risk accounts.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2, Calendar, FileText, Handshake, TrendingUp, Clock, Trophy, AlertTriangle, MapPin, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingApprovalsWidget } from "./ApprovalCenter";
import {
  KpiCard, NudgeBanner, GlobalFilterBar, useAllianceData, defaultFilters, todayIso, daysBetween, ProgressRing,
} from "./AllianceShell";
import { allianceUsers } from "@/lib/alliance-data";
import { PIPELINE_STAGES } from "@/lib/alliance-types";
import type { AllianceFilters } from "./AllianceShell";

const execList = allianceUsers.filter((u) => u.role === "alliance_executive").map((u) => ({ id: u.id, label: u.name }));
const userLabel = (id: string) => allianceUsers.find((u) => u.id === id)?.name ?? id;

export function AllianceManagerDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AllianceFilters>(defaultFilters);
  const data = useAllianceData({ scope: "manager", filters });

  // Previous-period comparison (for trend %)
  const prevFilters = useMemo<AllianceFilters>(() => {
    if (filters.preset === "month") return { ...filters, preset: "month" };
    return filters;
  }, [filters]);
  void prevFilters;

  // KPI calcs
  const totalInst = data.institutions.length;
  const meetings = data.visits.filter((v) => v.status === "Completed").length;
  const proposalsSent = data.proposals.filter((p) => p.status !== "Draft").length;
  const proposalsPending = data.proposals.filter((p) => p.status === "Sent" || p.status === "Under Review");
  const mous = data.institutions.filter((i) => i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched").length;
  const overdueFollowups = data.visits.filter((v) => v.nextFollowup && v.nextFollowup < todayIso() && v.status === "Completed").length;
  const revenueForecast = data.proposals
    .filter((p) => p.status === "Approved" || p.status === "Under Review" || p.status === "Sent")
    .reduce((s, p) => s + p.amount * (p.status === "Approved" ? 1 : p.status === "Under Review" ? 0.6 : 0.3), 0);

  // Pipeline funnel
  const funnelData = useMemo(() => PIPELINE_STAGES.filter((s) => s !== "Lost").map((s) => ({
    name: s,
    value: data.institutions.filter((i) => i.pipelineStage === s).length,
  })), [data.institutions]);

  // Leaderboard
  const leaderboard = useMemo(() => execList.map((e) => {
    const insts = data.institutions.filter((i) => i.assignedTo === e.id);
    const visits = data.visits.filter((v) => v.executiveId === e.id);
    const meetingsCt = visits.filter((v) => v.status === "Completed").length;
    const props = data.proposals.filter((p) => insts.some((i) => i.id === p.institutionId));
    const closures = insts.filter((i) => i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched").length;
    const revenue = props.filter((p) => p.status === "Approved").reduce((s, p) => s + p.amount, 0);
    const score = visits.length * 2 + meetingsCt * 5 + props.length * 8 + closures * 15;
    return { ...e, visits: visits.length, meetings: meetingsCt, proposals: props.length, closures, revenue, score };
  }).sort((a, b) => b.score - a.score), [data]);

  // District heatmap
  const districtData = useMemo(() => {
    const m = new Map<string, { count: number; visits: number; mous: number }>();
    data.institutions.forEach((i) => {
      const k = i.district || "Unknown";
      const e = m.get(k) ?? { count: 0, visits: 0, mous: 0 };
      e.count += 1;
      if (i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched") e.mous += 1;
      m.set(k, e);
    });
    data.visits.forEach((v) => {
      const inst = data.institutions.find((i) => i.id === v.institutionId);
      if (inst) {
        const k = inst.district || "Unknown";
        const e = m.get(k);
        if (e) e.visits += 1;
      }
    });
    return Array.from(m.entries()).map(([district, v]) => ({ district, ...v })).sort((a, b) => b.count - a.count);
  }, [data]);

  // At-risk accounts
  const atRisk = useMemo(() => {
    const risks: { inst: typeof data.institutions[number]; reason: string; severity: "warning" | "danger" }[] = [];
    data.institutions.forEach((inst) => {
      const visits = data.visits.filter((v) => v.institutionId === inst.id && v.status === "Completed");
      const props = data.proposals.filter((p) => p.institutionId === inst.id && p.status !== "Draft");
      const lastVisit = visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
      const daysSince = lastVisit ? daysBetween(todayIso(), lastVisit.visitDate) : 999;

      if (visits.length >= 3 && props.length === 0)
        risks.push({ inst, reason: `${visits.length} meetings · no proposal sent`, severity: "danger" });
      else if (daysSince > 14 && inst.pipelineStage !== "MoU Signed" && inst.pipelineStage !== "Lost")
        risks.push({ inst, reason: `No follow-up in ${daysSince} days`, severity: "warning" });

      const pendingProp = props.find((p) => p.status === "Sent" || p.status === "Under Review");
      if (pendingProp && daysBetween(todayIso(), pendingProp.sentDate) > 21)
        risks.push({ inst, reason: `Proposal pending ${daysBetween(todayIso(), pendingProp.sentDate)} days`, severity: "danger" });
    });
    return risks.slice(0, 8);
  }, [data]);

  // Smart nudges
  const nudges = useMemo(() => {
    const n: { id: string; severity: "info" | "warning" | "danger" | "success"; message: string }[] = [];
    const stale = data.institutions.filter((i) => {
      const visits = data.visits.filter((v) => v.institutionId === i.id);
      if (!visits.length) return daysBetween(todayIso(), i.createdAt) > 14;
      return daysBetween(todayIso(), visits[0].visitDate) > 14;
    }).length;
    if (stale > 0) n.push({ id: "stale", severity: "warning", message: `${stale} institutions have no touchpoint in 14+ days. Reassign or reactivate.` });
    if (proposalsPending.length > 0) n.push({ id: "pending", severity: "warning", message: `${proposalsPending.length} proposals pending reply. Nudge counterparts today.` });
    if (overdueFollowups > 0) n.push({ id: "overdue", severity: "danger", message: `${overdueFollowups} follow-ups overdue. High leakage risk.` });
    const untapped = districtData.filter((d) => d.visits === 0).reduce((s, d) => s + d.count, 0);
    if (untapped > 0) n.push({ id: "untapped", severity: "info", message: `${untapped} institutions in untouched districts. Plan a territory sweep.` });
    if (mous > 0) n.push({ id: "social", severity: "success", message: `Top managers who review pipeline weekly close 2.3× more MoUs.` });
    return n;
  }, [data, proposalsPending.length, overdueFollowups, districtData, mous]);

  // Drilldown content builders
  const instByType = useMemo(() => {
    const m = new Map<string, number>();
    data.institutions.forEach((i) => m.set(i.type, (m.get(i.type) ?? 0) + 1));
    return Array.from(m.entries());
  }, [data.institutions]);

  const meetingsByExec = useMemo(() => execList.map((e) => ({
    name: e.label,
    count: data.visits.filter((v) => v.executiveId === e.id && v.status === "Completed").length,
  })), [data.visits]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Industry Alliances — Manager</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Command center for institutional growth and pipeline health.</p>
      </div>

      <GlobalFilterBar filters={filters} onChange={setFilters} executives={execList} />

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Total Institutions" value={totalInst} icon={<Building2 className="h-5 w-5" />}
          microcopy="Active institutional opportunities."
          nudge={nudges.find((n) => n.id === "stale")?.message}
          drawerTitle="Institutions breakdown"
          drawerContent={
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">By type</p>
                {instByType.map(([t, c]) => (
                  <div key={t} className="flex justify-between py-1 text-sm border-b last:border-0">
                    <span>{t}</span><span className="font-semibold">{c}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">Recently added (last 7d)</p>
                {data.institutions.filter((i) => daysBetween(todayIso(), i.createdAt) <= 7).slice(0, 5).map((i) => (
                  <Link key={i.id} to={`/institutional/profile/${i.id}`} className="block py-1.5 text-sm hover:text-primary">
                    {i.name} <span className="text-xs text-muted-foreground">· {i.city}</span>
                  </Link>
                ))}
                {!data.institutions.filter((i) => daysBetween(todayIso(), i.createdAt) <= 7).length && <p className="text-xs text-muted-foreground italic">None added recently.</p>}
              </div>
            </div>
          }
        />
        <KpiCard
          title="Meetings (period)" value={meetings} icon={<Calendar className="h-5 w-5" />}
          microcopy="Institution meetings completed."
          drawerTitle="Meetings breakdown"
          drawerContent={
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">By executive</p>
              {meetingsByExec.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="text-sm w-32">{m.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, m.count * 10)}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{m.count}</span>
                </div>
              ))}
            </div>
          }
        />
        <KpiCard
          title="Proposals Sent" value={proposalsSent} icon={<FileText className="h-5 w-5" />}
          microcopy="Formal commercial proposals."
          nudge={proposalsPending.length > 0 ? `${proposalsPending.length} pending reply.` : undefined}
          accent={proposalsPending.length > 2 ? "warning" : "default"}
          drawerTitle="Proposals breakdown"
          drawerContent={
            <div className="space-y-2 text-sm">
              {(["Approved", "Under Review", "Sent", "Rejected"] as const).map((s) => {
                const list = data.proposals.filter((p) => p.status === s);
                return (
                  <div key={s} className="rounded-md border p-2.5">
                    <div className="flex justify-between"><span className="font-semibold">{s}</span><span>{list.length}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">Value: ₹{list.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          }
        />
        <KpiCard
          title="MoUs Signed" value={mous} icon={<Handshake className="h-5 w-5" />}
          microcopy="Confirmed institutional partnerships."
          accent="success"
          drawerTitle="MoUs by institution"
          drawerContent={
            <div className="space-y-1.5">
              {data.institutions.filter((i) => i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched").map((i) => (
                <Link key={i.id} to={`/institutional/profile/${i.id}`} className="flex justify-between rounded-md border p-2 text-sm hover:bg-muted">
                  <span>{i.name}</span><Badge variant="outline" className="text-[10px]">{i.pipelineStage}</Badge>
                </Link>
              ))}
            </div>
          }
        />
        <KpiCard
          title="Revenue Forecast" value={`₹${(revenueForecast / 1000).toFixed(0)}k`} icon={<TrendingUp className="h-5 w-5" />}
          microcopy="Weighted by proposal status."
          drawerTitle="Forecast by program"
          drawerContent={
            <div className="space-y-2">
              {Array.from(new Set(data.proposals.map((p) => p.proposalType))).map((t) => {
                const total = data.proposals.filter((p) => p.proposalType === t && (p.status === "Approved" || p.status === "Under Review")).reduce((s, p) => s + p.amount, 0);
                return (
                  <div key={t} className="flex justify-between text-sm border-b py-1.5">
                    <span>{t}</span><span className="font-semibold text-success">₹{total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          }
        />
        <KpiCard
          title="Pending Followups" value={overdueFollowups} icon={<Clock className="h-5 w-5" />}
          microcopy="Tasks requiring next action."
          accent={overdueFollowups > 0 ? "danger" : "default"}
          nudge={overdueFollowups > 0 ? `${overdueFollowups} overdue. High risk leakage.` : undefined}
          drawerTitle="Overdue follow-ups"
          drawerContent={
            <div className="space-y-1.5">
              {data.visits.filter((v) => v.nextFollowup && v.nextFollowup < todayIso() && v.status === "Completed").map((v) => {
                const inst = data.institutions.find((i) => i.id === v.institutionId);
                return (
                  <div key={v.id} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{inst?.name}</p>
                    <p className="text-xs text-muted-foreground">Due {v.nextFollowup} · {userLabel(v.executiveId)}</p>
                  </div>
                );
              })}
            </div>
          }
        />
        <PendingApprovalsWidget onOpen={() => navigate("/alliances?tab=approvals")} />
      </div>

      {/* Smart nudges */}
      <NudgeBanner items={nudges} />

      {/* Pipeline + Leaderboard */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-card-foreground">Pipeline Funnel</h4>
            <span className="text-[10px] text-muted-foreground italic">Click a stage to drill down</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">See conversion drop-offs by stage.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(d: { name?: string }) => d?.name && navigate(`/alliances?tab=institutions&stage=${encodeURIComponent(d.name)}`)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-warning" />Executive Leaderboard</h4>
          <p className="text-xs text-muted-foreground mb-3">Recognize top performers and coach laggards.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr><th className="text-left py-1.5 font-medium">Name</th><th className="text-right">Visits</th><th className="text-right">Meet</th><th className="text-right">Prop</th><th className="text-right">Close</th><th className="text-right">Revenue</th><th className="text-right">Score</th></tr>
              </thead>
              <tbody>
                {leaderboard.map((e, idx) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition"
                    onClick={() => navigate(`/alliances?tab=institutions&executive=${e.id}`)}
                  >
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5">
                        {idx === 0 && <Trophy className="h-3 w-3 text-warning" />}
                        <span className="font-medium">{e.label}</span>
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{e.visits}</td>
                    <td className="text-right tabular-nums">{e.meetings}</td>
                    <td className="text-right tabular-nums">{e.proposals}</td>
                    <td className="text-right tabular-nums">{e.closures}</td>
                    <td className="text-right tabular-nums">₹{(e.revenue/1000).toFixed(0)}k</td>
                    <td className="text-right">
                      <Badge variant="outline" className="text-[10px]">{e.score}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* District heatmap + At-risk */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4 text-info" />District Heatmap</h4>
            <span className="text-[10px] text-muted-foreground italic">Click to drill down</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Find untapped territories.</p>
          <div className="space-y-1.5">
            {districtData.map((d) => {
              const intensity = Math.min(1, d.visits / Math.max(1, d.count));
              return (
                <button
                  key={d.district}
                  type="button"
                  onClick={() => navigate(`/alliances?tab=institutions&district=${encodeURIComponent(d.district)}`)}
                  className="w-full flex items-center gap-2 hover:opacity-80 transition text-left"
                >
                  <span className="text-xs w-32 truncate">{d.district}</span>
                  <div className="flex-1 h-6 rounded bg-muted relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary/80" style={{ width: `${intensity * 100}%`, opacity: 0.3 + intensity * 0.7 }} />
                    <span className="relative z-10 px-2 text-[10px] leading-6">{d.count} inst · {d.visits} visits · {d.mous} MoUs</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-destructive" />At-Risk Accounts</h4>
          <p className="text-xs text-muted-foreground mb-3">Accounts needing urgent intervention.</p>
          {atRisk.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No risks detected. Great momentum.</p>
          ) : (
            <div className="space-y-1.5">
              {atRisk.map(({ inst, reason, severity }, idx) => (
                <Link key={`${inst.id}-${idx}`} to={`/institutional/profile/${inst.id}`} className={`flex items-center justify-between rounded-md border-l-2 p-2.5 hover:bg-muted/50 transition ${severity === "danger" ? "border-l-destructive bg-destructive/5" : "border-l-warning bg-warning/5"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inst.name}</p>
                    <p className="text-[10px] text-muted-foreground">{reason}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{userLabel(inst.assignedTo)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loss-aversion footer */}
      <div className="rounded-xl bg-card p-4 shadow-card border-l-4 border-l-warning flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-warning flex-shrink-0" />
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Renewal risk increases after 7 idle days.</span> Schedule a quick check-in with your top 5 active accounts before end of week.</p>
      </div>
    </div>
  );
}
