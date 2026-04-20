/**
 * Institution Profile — tabbed deep-dive page.
 * Route: /institutional/profile/:id
 */
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Users, Calendar, FileText, DollarSign, Sparkles, Upload, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { allianceStore, allianceUsers } from "@/lib/alliance-data";
import { ActivityTimeline, StatusPill } from "@/components/alliance/AllianceUI";
import type { ActivityItem } from "@/components/alliance/AllianceUI";
import { KpiCard, todayIso, daysBetween, confetti } from "@/components/alliance/AllianceShell";
import { PIPELINE_STAGES } from "@/lib/alliance-types";
import type { AlliancePipelineStage } from "@/lib/alliance-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const userLabel = (id: string) => allianceUsers.find((u) => u.id === id)?.name ?? id;

export default function AllianceInstitutionProfile() {
  const { id } = useParams<{ id: string }>();
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const inst = useMemo(() => {
    void version;
    return allianceStore.getInstitutions().find((i) => i.id === id);
  }, [id, version]);

  const contacts = useMemo(() => allianceStore.getContacts().filter((c) => c.institutionId === id), [id, version]);
  const visits = useMemo(() => allianceStore.getVisits().filter((v) => v.institutionId === id).sort((a, b) => b.visitDate.localeCompare(a.visitDate)), [id, version]);
  const proposals = useMemo(() => allianceStore.getProposals().filter((p) => p.institutionId === id), [id, version]);
  const tasks = useMemo(() => allianceStore.getTasks().filter((t) => t.institutionId === id), [id, version]);
  const events = useMemo(() => allianceStore.getEvents().filter((e) => e.institutionId === id), [id, version]);

  const totalRevenue = proposals.filter((p) => p.status === "Approved").reduce((s, p) => s + p.amount, 0);
  const lastVisit = visits[0];
  const daysSinceVisit = lastVisit ? daysBetween(todayIso(), lastVisit.visitDate) : null;

  // Best next step nudge (always called — guards against missing inst)
  const nextStep = useMemo(() => {
    if (!inst) return "";
    if (inst.pipelineStage === "Identified") return "Schedule first contact call.";
    if (inst.pipelineStage === "Contacted") return "Book an in-person meeting.";
    if (inst.pipelineStage === "Meeting Scheduled") return "Confirm attendees and prepare collateral.";
    if (inst.pipelineStage === "Meeting Done" && proposals.length === 0) return "Send proposal within 48 hours.";
    if (inst.pipelineStage === "Proposal Shared") return "Schedule proposal review with decision-maker.";
    if (inst.pipelineStage === "Negotiation") return "Lock terms and circulate MoU draft.";
    if (inst.pipelineStage === "MoU Signed") return "Plan program kickoff and align stakeholders.";
    return "Review account health and plan next touchpoint.";
  }, [inst, proposals.length]);

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    visits.forEach((v) => items.push({ id: `v-${v.id}`, title: `Visit logged`, description: v.summary, timestamp: v.visitDate, badge: v.interestLevel }));
    proposals.forEach((p) => items.push({ id: `p-${p.id}`, title: `${p.proposalType}`, description: `₹${p.amount.toLocaleString()}`, timestamp: p.sentDate, badge: p.status }));
    tasks.forEach((t) => items.push({ id: `t-${t.id}`, title: t.title, description: `Due ${t.dueDate}`, timestamp: t.createdAt, badge: t.status }));
    events.forEach((e) => items.push({ id: `e-${e.id}`, title: e.eventName, description: `${e.attendees} attendees · ${e.leadsGenerated} leads`, timestamp: e.eventDate, badge: e.eventType }));
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [visits, proposals, tasks, events]);

  if (!inst) {
    return (
      <div className="space-y-4">
        <Link to="/institutional" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back</Link>
        <div className="rounded-xl bg-card p-12 shadow-card text-center">
          <p className="text-sm text-muted-foreground">Institution not found.</p>
        </div>
      </div>
    );
  }

  const updateStage = (newStage: AlliancePipelineStage) => {
    const all = allianceStore.getInstitutions();
    allianceStore.saveInstitutions(all.map((i) => i.id === inst.id ? { ...i, pipelineStage: newStage } : i));
    if (newStage === "MoU Signed") {
      confetti();
      toast.success("🎉 MoU signed! Great win.");
    } else {
      toast.success(`Moved to ${newStage}.`);
    }
    bump();
  };

  return (
    <div className="space-y-5">
      <Link to="/institutional" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to Institutional Sales</Link>

      {/* Header */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{inst.name}</h1>
              <StatusPill value={inst.priority} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{inst.institutionId} · {inst.type} · {inst.boardUniversity}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{inst.city}, {inst.district}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{inst.studentStrength.toLocaleString()} students</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{inst.phone}</span>
              {inst.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{inst.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={inst.pipelineStage} onValueChange={(v) => updateStage(v as AlliancePipelineStage)}>
              <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Best next step nudge */}
        <div className="mt-4 rounded-lg bg-primary/5 border-l-4 border-l-primary p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold uppercase text-primary tracking-wide">Best Next Step</p>
            <p className="text-sm text-card-foreground">{nextStep}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Visits" value={visits.length} icon={<Calendar className="h-5 w-5" />} microcopy={daysSinceVisit !== null ? `Last visit ${daysSinceVisit}d ago` : "No visits yet"} />
        <KpiCard title="Proposals" value={proposals.length} icon={<FileText className="h-5 w-5" />} microcopy="Including drafts." />
        <KpiCard title="Approved Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} accent="success" />
        <KpiCard title="Owner" value={userLabel(inst.assignedTo)} icon={<Users className="h-5 w-5" />} microcopy="Account executive." />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs">Proposals ({proposals.length})</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold mb-2">Decision Maker</h4>
            <p className="text-sm">{inst.decisionMaker || <span className="text-muted-foreground italic">Not specified</span>}</p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold mb-2">Address</h4>
            <p className="text-sm">{inst.address || <span className="text-muted-foreground italic">No address on file</span>}</p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold mb-2">Notes</h4>
            <p className="text-sm whitespace-pre-wrap">{inst.notes || <span className="text-muted-foreground italic">No notes yet.</span>}</p>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          {contacts.length === 0 ? (
            <div className="rounded-xl bg-card p-8 shadow-card text-center">
              <p className="text-sm text-muted-foreground">No contacts captured yet. Add the first key stakeholder.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="rounded-xl bg-card p-4 shadow-card flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.designation}</p>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium">{c.phone}</p>
                    <p className="text-muted-foreground">{c.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <ActivityTimeline items={activityItems} emptyMessage="No activity yet. Log a visit or send a proposal." />
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          {proposals.length === 0 ? (
            <div className="rounded-xl bg-card p-8 shadow-card text-center">
              <p className="text-sm text-muted-foreground">No proposals yet. Move to proposal once the meeting goes well.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proposals.map((p) => (
                <div key={p.id} className="rounded-xl bg-card p-4 shadow-card flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{p.proposalType}</p>
                    <p className="text-xs text-muted-foreground">Sent {p.sentDate}</p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">₹{p.amount.toLocaleString()}</p>
                    <StatusPill value={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold mb-3">Revenue Summary</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Approved</p>
                <p className="text-lg font-bold text-success">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-warning">₹{proposals.filter((p) => p.status === "Sent" || p.status === "Under Review").reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Lost</p>
                <p className="text-lg font-bold text-destructive">₹{proposals.filter((p) => p.status === "Rejected").reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="rounded-xl bg-card p-8 shadow-card text-center">
            <FileIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Document vault coming soon. Attach MoUs, proposals, and presentations.</p>
            <Button size="sm" variant="outline" disabled><Upload className="h-3.5 w-3.5 mr-1" />Upload Document</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
