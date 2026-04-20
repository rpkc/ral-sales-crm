/**
 * Alliance Executive — Mobile-first Dashboard
 * Today's visits, follow-ups, route planner, quick actions, streak, progress ring.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Building2, Trophy, Receipt, MapPin, Plus, Phone, FileText, PartyPopper, Flame, Sparkles, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  KpiCard, NudgeBanner, useAllianceData, useStreak, ProgressRing, todayIso, daysBetween,
} from "./AllianceShell";
import { allianceStore } from "@/lib/alliance-data";
import { ActivityTimeline } from "./AllianceUI";
import { PendingApprovalsWidget } from "./ApprovalCenter";
import type { ActivityItem } from "./AllianceUI";

export function AllianceExecutiveDashboard() {
  const { currentUser } = useAuth();
  const executiveId = currentUser?.id;
  const [version, setVersion] = useState(0);
  const data = useAllianceData({ scope: "executive", executiveId, version });
  const { streak, bump } = useStreak(executiveId);

  const today = todayIso();
  const todaysVisits = data.visits.filter((v) => v.visitDate === today);
  const pendingFollowups = data.visits.filter((v) => v.nextFollowup && v.nextFollowup <= today && v.status === "Completed").length;
  const myInstitutions = data.institutions.length;
  const expensesPending = data.expenses.filter((e) => e.status === "Submitted").length;

  // Monthly performance
  const monthVisits = data.visits.filter((v) => v.visitDate.startsWith(today.slice(0, 7)) && v.status === "Completed").length;
  const monthClosures = data.institutions.filter((i) => i.pipelineStage === "MoU Signed" || i.pipelineStage === "Program Launched").length;
  const targetVisits = 30;

  // Smart nudges
  const nudges = useMemo(() => {
    const n: { id: string; severity: "info" | "warning" | "danger" | "success"; message: string }[] = [];
    if (todaysVisits.length > 0) n.push({ id: "route", severity: "info", message: `${todaysVisits.length} visits planned. Best route saves ~42 min travel.` });
    const hot = data.institutions.filter((i) => {
      const visits = data.visits.filter((v) => v.institutionId === i.id);
      return visits.some((v) => v.interestLevel === "Hot") && !data.proposals.some((p) => p.institutionId === i.id);
    });
    if (hot.length > 0) n.push({ id: "hot", severity: "warning", message: `${hot.length} hot account${hot.length === 1 ? "" : "s"} waiting for proposal push.` });
    if (pendingFollowups > 0) n.push({ id: "fu", severity: "warning", message: `Call your first 3 follow-ups before 11 AM for higher pickup rates.` });
    if (monthClosures > 0) n.push({ id: "rank", severity: "success", message: `1 more closure unlocks top-3 rank this month.` });
    if (expensesPending === 0) n.push({ id: "exp", severity: "info", message: `Submit bills within 48 hours for faster approval.` });
    return n;
  }, [todaysVisits.length, pendingFollowups, monthClosures, expensesPending, data]);

  // Route planner — simple ordered list of today's planned visits by city
  const routeStops = useMemo(() => todaysVisits
    .map((v) => ({ visit: v, inst: data.institutions.find((i) => i.id === v.institutionId)! }))
    .filter((x) => x.inst)
    .sort((a, b) => (a.inst.city || "").localeCompare(b.inst.city || "")),
    [todaysVisits, data.institutions]);

  // Hot accounts list
  const hotAccounts = useMemo(() => data.institutions.filter((i) => {
    const visits = data.visits.filter((v) => v.institutionId === i.id);
    return visits.some((v) => v.interestLevel === "Hot") || i.priority === "High";
  }).slice(0, 4), [data]);

  // Activity timeline
  const recent = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    data.visits.slice(0, 10).forEach((v) => {
      const inst = data.institutions.find((i) => i.id === v.institutionId);
      items.push({ id: `v-${v.id}`, title: `Visit: ${inst?.name ?? "—"}`, description: v.summary, timestamp: v.visitDate, badge: v.interestLevel });
    });
    data.proposals.slice(0, 5).forEach((p) => {
      const inst = data.institutions.find((i) => i.id === p.institutionId);
      items.push({ id: `p-${p.id}`, title: `${p.proposalType}: ${inst?.name ?? ""}`, description: `₹${p.amount.toLocaleString()}`, timestamp: p.sentDate, badge: p.status });
    });
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  }, [data]);

  const handleQuickAction = () => {
    bump();
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Alliances</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Hi {currentUser?.name?.split(" ")[0]}, here's your day.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-warning">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-bold">{streak}d streak</span>
          </div>
          <ProgressRing value={monthVisits} max={targetVisits} label="Target" size={56} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Today's Visits" value={todaysVisits.length} icon={<Calendar className="h-5 w-5" />}
          microcopy="Your planned field meetings."
          nudge={todaysVisits.length > 0 ? "Best route saves ~42 mins." : undefined}
          drawerTitle="Today's plan"
          drawerContent={
            <div className="space-y-2">
              {todaysVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No visits logged today. Start with your nearest meeting.</p>
              ) : todaysVisits.map((v) => {
                const inst = data.institutions.find((i) => i.id === v.institutionId);
                return (
                  <div key={v.id} className="rounded-md border p-2.5 text-sm">
                    <p className="font-medium">{inst?.name}</p>
                    <p className="text-xs text-muted-foreground">{v.meetingPerson} · {inst?.city}</p>
                  </div>
                );
              })}
            </div>
          }
        />
        <KpiCard
          title="Pending Followups" value={pendingFollowups} icon={<Clock className="h-5 w-5" />}
          microcopy="Calls, WhatsApp, revisits."
          accent={pendingFollowups > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="My Institutions" value={myInstitutions} icon={<Building2 className="h-5 w-5" />}
          microcopy="Assigned accounts you own."
          drawerTitle="Your accounts"
          drawerContent={
            <div className="space-y-1">
              {data.institutions.map((i) => (
                <Link key={i.id} to={`/institutional/profile/${i.id}`} className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted">
                  <span>{i.name}</span><Badge variant="outline" className="text-[10px]">{i.pipelineStage}</Badge>
                </Link>
              ))}
            </div>
          }
        />
        <KpiCard
          title="Monthly Score" value={monthVisits * 5 + monthClosures * 15} icon={<Trophy className="h-5 w-5" />}
          microcopy="Productivity index this month."
          accent="success"
        />
        <KpiCard
          title="Expense Pending" value={expensesPending} icon={<Receipt className="h-5 w-5" />}
          microcopy="Claims awaiting approval."
        />
        <PendingApprovalsWidget onOpen={() => { window.location.href = "/alliances?tab=approvals"; }} />
      </div>

      <NudgeBanner items={nudges} />

      {/* Quick Actions */}
      <div className="rounded-xl bg-card p-4 shadow-card">
        <h4 className="text-sm font-semibold text-card-foreground mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Link to="/alliances?tab=visits&action=new" onClick={handleQuickAction}>
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1"><Plus className="h-4 w-4" /><span className="text-[11px]">Log Visit</span></Button>
          </Link>
          <Link to="/alliances?tab=contacts" onClick={handleQuickAction}>
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1"><Phone className="h-4 w-4" /><span className="text-[11px]">Add Contact</span></Button>
          </Link>
          <Link to="/alliances?tab=tasks&action=new" onClick={handleQuickAction}>
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1"><Calendar className="h-4 w-4" /><span className="text-[11px]">Set Follow-up</span></Button>
          </Link>
          <Link to="/alliances?tab=expenses&action=new" onClick={handleQuickAction}>
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1"><Receipt className="h-4 w-4" /><span className="text-[11px]">Claim Expense</span></Button>
          </Link>
          <Link to="/alliances?tab=events&action=new" onClick={handleQuickAction}>
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1"><PartyPopper className="h-4 w-4" /><span className="text-[11px]">Event Leads</span></Button>
          </Link>
        </div>
      </div>

      {/* Route planner + hot accounts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-info" />Route Planner</h4>
          <p className="text-xs text-muted-foreground mb-3">Optimized sequence for today's travel.</p>
          {routeStops.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No visits scheduled. Plan your day.</p>
          ) : (
            <ol className="space-y-2">
              {routeStops.map(({ visit, inst }, idx) => (
                <li key={visit.id} className="flex items-center gap-3 rounded-md border p-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inst.name}</p>
                    <p className="text-[10px] text-muted-foreground">{inst.city} · {visit.meetingPerson}</p>
                  </div>
                  <Link to={`/institutional/profile/${inst.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]">Open</Button>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-warning" />Hot Accounts</h4>
          <p className="text-xs text-muted-foreground mb-3">Push proposals before they cool down.</p>
          {hotAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hot accounts right now.</p>
          ) : (
            <div className="space-y-2">
              {hotAccounts.map((i) => (
                <Link key={i.id} to={`/institutional/profile/${i.id}`} className="flex items-center justify-between rounded-md border p-2.5 hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-[10px] text-muted-foreground">{i.pipelineStage} · {i.studentStrength.toLocaleString()} students</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Hot</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />Recent Activity</h4>
        <p className="text-xs text-muted-foreground mb-3">Stay updated on completed actions.</p>
        <ActivityTimeline items={recent} emptyMessage="No activity yet. Log your first visit to get started." />
      </div>

      {/* Loss-aversion banner */}
      <div className="rounded-xl bg-card p-4 shadow-card border-l-4 border-l-warning flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-warning flex-shrink-0" />
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">This account may cool down if no follow-up today.</span> Top performers log notes within 15 minutes of every visit.</p>
      </div>
    </div>
  );
}
