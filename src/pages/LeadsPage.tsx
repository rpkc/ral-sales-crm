import { useState, useMemo, useEffect } from "react";
import { store } from "@/lib/mock-data";
import {
  Lead, LeadStatus, LeadQuality, LeadTemperature, LeadIntentCategory,
  DecisionMaker, FeePayer, LostReason, TransferReason, CommunicationChannel,
  LeadActivity, QualificationChecklist, CurrentStatus, CareerGoal, LeadMotivation, PreferredStartTime,
} from "@/lib/types";
import {
  MASTER_LEAD_SOURCES, MASTER_QUALIFICATIONS, MASTER_CURRENT_STATUS,
  MASTER_CAREER_GOALS, MASTER_LEAD_MOTIVATIONS, MASTER_COURSE_NAMES,
  MASTER_SALARY_EXPECTATIONS, MASTER_LOCATIONS, MASTER_LEAD_PIPELINE_STAGES,
} from "@/lib/master-schema";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, Users, UserCheck, TrendingUp, Phone, MessageCircle,
  Mail, Clock, AlertCircle, CheckCircle2, ArrowRight, Flame, Thermometer,
  Send, Calendar, Eye, ChevronRight, BarChart3, ArrowRightLeft, Star,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { KanbanBoard } from "@/components/KanbanBoard";

const STATUSES: LeadStatus[] = ["New", "Contact Attempted", "Connected", "Interested", "Application Submitted", "Interview Scheduled", "Interview Completed", "Counseling", "Qualified", "Admission", "Lost"];
const LOST_REASONS: LostReason[] = ["Too Expensive", "Not Interested", "Joined Competitor", "No Response", "Wrong Number"];
const TRANSFER_REASONS: TransferReason[] = ["Language mismatch", "Course specialization", "Counselor unavailable"];
const CHANNELS: CommunicationChannel[] = ["Phone Call", "WhatsApp", "Email", "SMS", "Instagram DM", "Website Chat"];
const CHART_COLORS = ["hsl(358,78%,51%)", "hsl(0,0%,10%)", "hsl(38,92%,50%)", "hsl(142,71%,45%)", "hsl(210,79%,46%)", "hsl(0,0%,60%)"];

// ─── Helper Components ───

function TempBadge({ temp }: { temp?: LeadTemperature }) {
  if (!temp) return null;
  const cls = {
    Hot: "bg-destructive/10 text-destructive",
    Warm: "bg-warning/10 text-warning",
    Cold: "bg-muted text-muted-foreground",
    Dormant: "bg-muted text-muted-foreground/60",
  }[temp];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{temp}</span>;
}

function IntentBadge({ cat }: { cat?: LeadIntentCategory }) {
  if (!cat) return null;
  const cls = {
    "High Intent": "bg-success/10 text-success",
    "Medium Intent": "bg-warning/10 text-warning",
    "Low Intent": "bg-muted text-muted-foreground",
  }[cat];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{cat}</span>;
}

function PriorityBadge({ cat }: { cat?: string }) {
  if (!cat) return null;
  const cls = cat === "High Priority" ? "bg-destructive/10 text-destructive" :
    cat === "Medium Priority" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{cat}</span>;
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{msg}</p> : null;
}

function getSmartSuggestions(lead: Lead): string[] {
  const suggestions: string[] = [];
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
  if (lead.status === "New" && daysSinceCreated >= 1) suggestions.push(`Lead has not been contacted for ${daysSinceCreated} day(s).`);
  if ((lead.intentScore ?? 0) >= 80 && lead.status !== "Counseling" && lead.status !== "Qualified" && lead.status !== "Admission")
    suggestions.push("Lead shows high intent. Schedule counseling.");
  if (lead.status === "Follow-up" && daysSinceCreated >= 3) suggestions.push("Follow-up overdue. Contact the lead immediately.");
  if ((lead.qualificationScore ?? 0) >= 80 && lead.status !== "Qualified" && lead.status !== "Admission")
    suggestions.push("Lead is fully qualified. Move to Qualified status.");
  if (!lead.firstCallTime && lead.status === "New") suggestions.push("This lead has not been contacted yet.");
  return suggestions;
}

// ─── Activity Timeline ───
function ActivityTimeline({ activities }: { activities?: LeadActivity[] }) {
  const sorted = [...(activities || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (sorted.length === 0) return <p className="text-xs text-muted-foreground p-4">No activity recorded yet.</p>;
  return (
    <div className="space-y-3 p-1">
      {sorted.map((a) => (
        <div key={a.id} className="flex gap-3 items-start">
          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-card-foreground">{a.type}</p>
            <p className="text-xs text-muted-foreground">{a.description}</p>
            {a.channel && <p className="text-[10px] text-muted-foreground mt-0.5">via {a.channel}</p>}
            <p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Qualification Checklist ───
function QualChecklist({ qual, onChange }: { qual?: QualificationChecklist; onChange: (q: QualificationChecklist) => void }) {
  const q = qual || { budgetConfirmed: false, courseInterestConfirmed: false, locationPreference: false, startTimeline: false, placementExpectation: false };
  const items: { key: keyof QualificationChecklist; label: string }[] = [
    { key: "budgetConfirmed", label: "Budget confirmed" },
    { key: "courseInterestConfirmed", label: "Course interest confirmed" },
    { key: "locationPreference", label: "Location preference" },
    { key: "startTimeline", label: "Start timeline" },
    { key: "placementExpectation", label: "Placement expectation" },
  ];
  const score = items.filter((i) => q[i.key]).length * 20;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qualification Checklist</p>
        <span className={`text-xs font-bold ${score >= 80 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"}`}>{score}%</span>
      </div>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <Checkbox
            checked={q[item.key]}
            onCheckedChange={(checked) => onChange({ ...q, [item.key]: !!checked })}
          />
          <span className="text-sm text-card-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Lead Detail Panel ───
function LeadDetailPanel({
  lead, users, onUpdate, onClose,
}: { lead: Lead; users: ReturnType<typeof store.getUsers>; onUpdate: (l: Lead) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [lostReason, setLostReason] = useState<LostReason | "">(lead.lostReason || "");
  const [lostError, setLostError] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferReason, setTransferReason] = useState<TransferReason | "">("");
  const [commChannel, setCommChannel] = useState<CommunicationChannel | "">("");
  const [commSummary, setCommSummary] = useState("");

  const suggestions = getSmartSuggestions(lead);
  const counselors = users.filter((u) => u.role === "counselor");
  const telecallers = users.filter((u) => u.role === "telecaller");

  const handleStatusChange = (status: LeadStatus) => {
    if (status === "Lost" && !lostReason) {
      setLostError("Please select a reason for marking this lead as lost.");
      return;
    }
    const activity: LeadActivity = {
      id: `act${Date.now()}`, leadId: lead.id, type: `Status → ${status}`,
      description: `Status changed to ${status}${status === "Lost" && lostReason ? ` (${lostReason})` : ""}`,
      timestamp: new Date().toISOString(),
    };
    onUpdate({
      ...lead, status,
      lostReason: status === "Lost" ? lostReason as LostReason : lead.lostReason,
      activities: [...(lead.activities || []), activity],
    });
    toast.success("Lead updated successfully.");
  };

  const handleTransfer = () => {
    if (!transferTo || !transferReason) return;
    const fromName = users.find((u) => u.id === (lead.assignedCounselor || lead.assignedTelecallerId))?.name || "Unknown";
    const toName = users.find((u) => u.id === transferTo)?.name || "Unknown";
    const transfer = { id: `tr${Date.now()}`, fromUserId: lead.assignedCounselor || lead.assignedTelecallerId, toUserId: transferTo, reason: transferReason as TransferReason, timestamp: new Date().toISOString() };
    const activity: LeadActivity = {
      id: `act${Date.now()}`, leadId: lead.id, type: "Lead Transferred",
      description: `Transferred from ${fromName} to ${toName} — ${transferReason}`,
      timestamp: new Date().toISOString(),
    };
    onUpdate({
      ...lead, assignedCounselor: transferTo,
      transferHistory: [...(lead.transferHistory || []), transfer],
      activities: [...(lead.activities || []), activity],
    });
    setTransferTo("");
    setTransferReason("");
    toast.success("Lead transferred successfully.");
  };

  const handleLogComm = () => {
    if (!commChannel || !commSummary.trim()) return;
    const activity: LeadActivity = {
      id: `act${Date.now()}`, leadId: lead.id, type: "Communication",
      description: commSummary, channel: commChannel as CommunicationChannel,
      userId: lead.assignedTelecallerId, timestamp: new Date().toISOString(),
    };
    onUpdate({ ...lead, activities: [...(lead.activities || []), activity], lastInteractionType: commChannel, lastInteractionDate: new Date().toISOString().split("T")[0] });
    setCommChannel("");
    setCommSummary("");
    toast.success("Communication logged.");
  };

  const handleQualUpdate = (q: QualificationChecklist) => {
    const score = Object.values(q).filter(Boolean).length * 20;
    onUpdate({ ...lead, qualification: q, qualificationScore: score });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{lead.name}</h2>
          <p className="text-sm text-muted-foreground">{lead.email} · {lead.phone}</p>
          <div className="flex gap-2 mt-1">
            <StatusBadge status={lead.status} />
            <TempBadge temp={lead.temperature} />
            <IntentBadge cat={lead.intentCategory} />
            <PriorityBadge cat={lead.priorityCategory} />
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Score: <span className="font-bold text-card-foreground">{lead.leadScore}</span></p>
          <p>Intent: <span className="font-bold text-card-foreground">{lead.intentScore ?? 0}</span></p>
        </div>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg bg-accent/60 p-2.5 text-xs text-accent-foreground flex items-start gap-2">
              <Star className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              {s}
            </div>
          ))}
        </div>
      )}

      {/* SLA Alert */}
      {!lead.firstCallTime && lead.status === "New" && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          This lead has not been contacted yet. Respond within 30 minutes for best conversion.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1 text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="qualify" className="flex-1 text-xs">Qualify</TabsTrigger>
          <TabsTrigger value="actions" className="flex-1 text-xs">Actions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Course:</span> <span className="font-medium text-card-foreground">{lead.interestedCourse}</span></div>
            <div><span className="text-muted-foreground">Source:</span> <span className="font-medium text-card-foreground">{lead.source}</span></div>
            <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium text-card-foreground">{lead.budgetRange || "—"}</span></div>
            <div><span className="text-muted-foreground">Urgency:</span> <span className="font-medium text-card-foreground">{lead.urgencyLevel || "—"}</span></div>
          </div>

          {/* Enrichment */}
          {(lead.currentEducation || lead.collegeInstitution) && (
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Profile</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {lead.currentEducation && <div><span className="text-muted-foreground">Education:</span> <span className="text-card-foreground">{lead.currentEducation}</span></div>}
                {lead.graduationYear && <div><span className="text-muted-foreground">Grad Year:</span> <span className="text-card-foreground">{lead.graduationYear}</span></div>}
                {lead.currentOccupation && <div><span className="text-muted-foreground">Occupation:</span> <span className="text-card-foreground">{lead.currentOccupation}</span></div>}
                {lead.collegeInstitution && <div><span className="text-muted-foreground">College:</span> <span className="text-card-foreground">{lead.collegeInstitution}</span></div>}
                {lead.feePayer && <div><span className="text-muted-foreground">Fee Payer:</span> <span className="text-card-foreground">{lead.feePayer}</span></div>}
                {lead.decisionMaker && <div><span className="text-muted-foreground">Decision:</span> <span className="text-card-foreground">{lead.decisionMaker}</span></div>}
              </div>
            </div>
          )}

          {/* Course Recommendation */}
          {lead.recommendedCourse && (
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course Recommendation</p>
              <p className="text-sm"><span className="text-muted-foreground">Recommended:</span> <span className="font-medium text-card-foreground">{lead.recommendedCourse}</span></p>
              {lead.alternateCourse && <p className="text-sm"><span className="text-muted-foreground">Alternate:</span> <span className="text-card-foreground">{lead.alternateCourse}</span></p>}
              {lead.recommendationReason && <p className="text-xs text-muted-foreground italic mt-1">{lead.recommendationReason}</p>}
            </div>
          )}

          {/* Ownership */}
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ownership</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Telecaller:</span> <span className="text-card-foreground">{users.find((u) => u.id === lead.assignedTelecallerId)?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Counselor:</span> <span className="text-card-foreground">{users.find((u) => u.id === lead.assignedCounselor)?.name || "—"}</span></div>
            </div>
            {(lead.transferHistory?.length ?? 0) > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Transfer History</p>
                {lead.transferHistory!.map((t) => (
                  <p key={t.id} className="text-[10px] text-muted-foreground">
                    {users.find((u) => u.id === t.fromUserId)?.name} → {users.find((u) => u.id === t.toUserId)?.name} ({t.reason})
                  </p>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline" className="mt-3">
          <div className="space-y-4">
            {/* Log Communication */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log Communication</p>
              <Select value={commChannel} onValueChange={(v) => setCommChannel(v as CommunicationChannel)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>{CHANNELS.map((ch) => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-8 text-xs" value={commSummary} onChange={(e) => setCommSummary(e.target.value)} placeholder="Message summary..." />
              <Button size="sm" className="w-full" onClick={handleLogComm} disabled={!commChannel || !commSummary.trim()}>
                <Send className="mr-1 h-3.5 w-3.5" />Log
              </Button>
            </div>
            <ActivityTimeline activities={lead.activities} />
          </div>
        </TabsContent>

        {/* QUALIFY TAB */}
        <TabsContent value="qualify" className="mt-3 space-y-4">
          <QualChecklist qual={lead.qualification} onChange={handleQualUpdate} />
        </TabsContent>

        {/* ACTIONS TAB */}
        <TabsContent value="actions" className="mt-3 space-y-4">
          {/* Status Change */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Update Status</p>
            {lead.status !== "Lost" && (
              <div className="mb-2">
                <Select value={lostReason} onValueChange={(v) => { setLostReason(v as LostReason); setLostError(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lost reason (if marking Lost)" /></SelectTrigger>
                  <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError msg={lostError} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {STATUSES.map((s) => (
                <Button key={s} variant={lead.status === s ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => handleStatusChange(s)}>{s}</Button>
              ))}
            </div>
          </div>

          {/* Transfer */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transfer Lead</p>
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Transfer to..." /></SelectTrigger>
              <SelectContent>
                {[...counselors, ...telecallers].map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={transferReason} onValueChange={(v) => setTransferReason(v as TransferReason)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Reason" /></SelectTrigger>
              <SelectContent>{TRANSFER_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Understanding the decision maker helps counselors tailor discussions.</p>
            <Button size="sm" variant="outline" className="w-full" onClick={handleTransfer} disabled={!transferTo || !transferReason}>
              <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />Transfer
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="text-xs"><Phone className="mr-1 h-3.5 w-3.5" />Call</Button>
            <Button size="sm" variant="outline" className="text-xs"><MessageCircle className="mr-1 h-3.5 w-3.5" />WhatsApp</Button>
            <Button size="sm" variant="outline" className="text-xs"><Calendar className="mr-1 h-3.5 w-3.5" />Follow-up</Button>
            <Button size="sm" variant="outline" className="text-xs"><Mail className="mr-1 h-3.5 w-3.5" />Email</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Lead Creation Form ───
function LeadCreateForm({ onSave }: { onSave: (lead: Lead) => void }) {
  const users = store.getUsers();
  const telecallers = users.filter((u) => u.role === "telecaller");
  const campaigns = store.getCampaigns();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "", campaignId: "", interestedCourse: "", assignedTelecallerId: "",
    currentEducation: "", graduationYear: "", currentOccupation: "", collegeInstitution: "",
    feePayer: "" as FeePayer | "", decisionMaker: "" as DecisionMaker | "", budgetRange: "",
    highestQualification: "", currentStatus: "" as CurrentStatus | "", careerGoal: "" as CareerGoal | "",
    leadMotivation: "" as LeadMotivation | "", preferredStartTime: "" as PreferredStartTime | "",
    expectedSalary: "", jobLocationPreference: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.phone.trim()) e.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Please enter a valid 10-digit phone number.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.interestedCourse) e.interestedCourse = "Please select a course of interest.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!validate()) return;

    // Duplicate detection
    const existing = store.getLeads();
    const dup = existing.find((l) => l.phone === form.phone || (form.email && l.email === form.email));
    if (dup) {
      toast.error(`Possible duplicate lead detected: ${dup.name} (${dup.phone})`);
      return;
    }

    const newLead: Lead = {
      id: `l${Date.now()}`, name: form.name, phone: form.phone, email: form.email,
      source: form.source, campaignId: form.campaignId, interestedCourse: form.interestedCourse,
      assignedTelecallerId: form.assignedTelecallerId, status: "New",
      createdAt: new Date().toISOString().split("T")[0],
      adSetName: "", adName: "", landingPageUrl: "",
      utm: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "" },
      leadScore: 30, leadQuality: "Cold", budgetRange: form.budgetRange, urgencyLevel: "", otherInstitutes: "",
      currentEducation: form.currentEducation, graduationYear: form.graduationYear,
      currentOccupation: form.currentOccupation, collegeInstitution: form.collegeInstitution,
      feePayer: form.feePayer as FeePayer || undefined, decisionMaker: form.decisionMaker as DecisionMaker || undefined,
      highestQualification: form.highestQualification || undefined,
      currentStatus: form.currentStatus as CurrentStatus || undefined,
      careerGoal: form.careerGoal as CareerGoal || undefined,
      leadMotivation: form.leadMotivation as LeadMotivation || undefined,
      preferredStartTime: form.preferredStartTime as PreferredStartTime || undefined,
      expectedSalary: form.expectedSalary || undefined,
      jobLocationPreference: form.jobLocationPreference || undefined,
      intentScore: 30, intentCategory: "Low Intent", temperature: "Cold",
      priorityScore: 30, priorityCategory: "Low Priority",
      activities: [{ id: `act${Date.now()}`, leadId: `l${Date.now()}`, type: "Lead Created", description: `New lead: ${form.name}`, timestamp: new Date().toISOString() }],
    };
    onSave(newLead);
    toast.success("Lead created successfully.");
  };

  return (
    <div className="space-y-3 pt-2 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /><FieldError msg={errors.name} /></div>
        <div><Label>Phone <span className="text-destructive">*</span></Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit number" /><FieldError msg={errors.phone} /></div>
      </div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /><FieldError msg={errors.email} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Lead Source</Label>
          <Select value={form.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>{MASTER_LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Campaign</Label>
          <Select value={form.campaignId} onValueChange={(v) => set("campaignId", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Interested Course <span className="text-destructive">*</span></Label>
        <Select value={form.interestedCourse} onValueChange={(v) => set("interestedCourse", v)}>
          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
          <SelectContent>{MASTER_COURSE_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <FieldError msg={errors.interestedCourse} />
      </div>
      <div>
        <Label>Assign Telecaller</Label>
        <Select value={form.assignedTelecallerId} onValueChange={(v) => set("assignedTelecallerId", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Progressive disclosure — student profile */}
      {form.interestedCourse && (
        <div className="animate-slide-down space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Profile</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Highest Qualification</Label>
              <Select value={form.highestQualification} onValueChange={(v) => set("highestQualification", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Status</Label>
              <Select value={form.currentStatus} onValueChange={(v) => set("currentStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_CURRENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Career Goal</Label>
              <Select value={form.careerGoal} onValueChange={(v) => set("careerGoal", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_CAREER_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lead Motivation</Label>
              <Select value={form.leadMotivation} onValueChange={(v) => set("leadMotivation", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_LEAD_MOTIVATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Current Education</Label><Input value={form.currentEducation} onChange={(e) => set("currentEducation", e.target.value)} placeholder="e.g. B.Com" /></div>
            <div><Label>Graduation Year</Label><Input value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} placeholder="e.g. 2024" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Current Occupation</Label><Input value={form.currentOccupation} onChange={(e) => set("currentOccupation", e.target.value)} placeholder="e.g. Student" /></div>
            <div><Label>College / Institution</Label><Input value={form.collegeInstitution} onChange={(e) => set("collegeInstitution", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Who Pays Fees</Label>
              <Select value={form.feePayer} onValueChange={(v) => set("feePayer", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(["Self", "Parent", "Sponsor"] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Decision Maker</Label>
              <Select value={form.decisionMaker} onValueChange={(v) => set("decisionMaker", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(["Self", "Parent", "Joint"] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Understanding the decision maker helps counselors tailor discussions.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preferred Start Time</Label>
              <Select value={form.preferredStartTime} onValueChange={(v) => set("preferredStartTime", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(["Immediate", "Within 1 Month", "Within 3 Months", "Not Sure"] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget Range</Label><Input value={form.budgetRange} onChange={(e) => set("budgetRange", e.target.value)} placeholder="e.g. ₹30k-50k" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expected Salary</Label>
              <Select value={form.expectedSalary} onValueChange={(v) => set("expectedSalary", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_SALARY_EXPECTATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Location</Label>
              <Select value={form.jobLocationPreference} onValueChange={(v) => set("jobLocationPreference", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{MASTER_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} className="w-full" disabled={!form.name || !form.phone}>Add Lead</Button>
    </div>
  );
}

// PipelineBoard replaced by KanbanBoard component

// ─── Main Page ───
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(store.getLeads());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView] = useState<"dashboard" | "pipeline" | "table">("dashboard");

  const users = store.getUsers();

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search) || l.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }, [leads, search, statusFilter]);

  // Dashboard metrics
  const newToday = leads.filter((l) => l.status === "New" && l.createdAt === new Date().toISOString().split("T")[0]).length;
  const contacted = leads.filter((l) => l.status === "Contacted").length;
  const qualified = leads.filter((l) => l.status === "Qualified").length;
  const admissions = leads.filter((l) => l.status === "Admission").length;
  const convRate = leads.length > 0 ? ((admissions / leads.length) * 100).toFixed(1) : "0";

  // Source chart
  const sourceData = useMemo(() => {
    const counts: Record<string, { leads: number; admissions: number }> = {};
    leads.forEach((l) => {
      if (!counts[l.source]) counts[l.source] = { leads: 0, admissions: 0 };
      counts[l.source].leads++;
      if (l.status === "Admission") counts[l.source].admissions++;
    });
    return Object.entries(counts).map(([name, v]) => ({
      name, leads: v.leads, admissions: v.admissions,
      convRate: v.leads > 0 ? ((v.admissions / v.leads) * 100).toFixed(1) : "0",
    }));
  }, [leads]);

  // Pipeline chart
  const pipelineData = STATUSES.map((s) => ({ name: s, count: leads.filter((l) => l.status === s).length }));

  const handleCreateLead = (lead: Lead) => {
    const updated = [...leads, lead];
    setLeads(updated);
    store.saveLeads(updated);
    setCreateOpen(false);
  };

  const handleUpdateLead = (updated: Lead) => {
    const all = leads.map((l) => l.id === updated.id ? updated : l);
    setLeads(all);
    store.saveLeads(all);
    setSelectedLead(updated);
  };

  const handleKanbanStatusChange = (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const activity = {
      id: `act${Date.now()}`, leadId, type: `Status → ${newStatus}`,
      description: `Moved to ${newStatus} via pipeline board`,
      timestamp: new Date().toISOString(),
    };
    const updated: Lead = {
      ...lead, status: newStatus,
      activities: [...(lead.activities || []), activity],
    };
    const all = leads.map((l) => l.id === leadId ? updated : l);
    setLeads(all);
    store.saveLeads(all);
    toast.success(`${lead.name} moved to ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total leads in pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" onClick={() => setView("dashboard")}>
            <BarChart3 className="mr-1 h-4 w-4" />Dashboard
          </Button>
          <Button variant={view === "pipeline" ? "default" : "outline"} size="sm" onClick={() => setView("pipeline")}>
            <ArrowRight className="mr-1 h-4 w-4" />Pipeline
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            <Eye className="mr-1 h-4 w-4" />Table
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
              <LeadCreateForm onSave={handleCreateLead} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── DASHBOARD VIEW ─── */}
      {view === "dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="New Today" value={newToday} icon={<Plus className="h-5 w-5" />} />
            <StatCard title="Contacted" value={contacted} icon={<Phone className="h-5 w-5" />} />
            <StatCard title="Qualified" value={qualified} icon={<CheckCircle2 className="h-5 w-5" />} />
            <StatCard title="Admissions" value={admissions} icon={<UserCheck className="h-5 w-5" />} />
            <StatCard title="Conversion" value={`${convRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Source Performance */}
            <div className="rounded-xl bg-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Lead Source Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill="hsl(358,78%,51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="admissions" name="Admissions" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Source table */}
              <div className="mt-3 space-y-1">
                {sourceData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="text-card-foreground">Leads: {s.leads} · Admissions: {s.admissions} · Conv: {s.convRate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Chart */}
            <div className="rounded-xl bg-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pipelineData.filter((d) => d.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pipelineData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ─── PIPELINE VIEW ─── */}
      {view === "pipeline" && (
        <KanbanBoard leads={leads} onLeadSelect={setSelectedLead} onLeadStatusChange={handleKanbanStatusChange} />
      )}

      {/* ─── TABLE VIEW ─── */}
      {view === "table" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Lead</th>
                  <th className="p-4 font-medium">Course</th>
                  <th className="p-4 font-medium">Source</th>
                  <th className="p-4 font-medium">Score</th>
                  <th className="p-4 font-medium">Temp</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Priority</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td className="p-4">
                      <p className="font-medium text-card-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{lead.interestedCourse}</td>
                    <td className="p-4 text-muted-foreground text-xs">{lead.source}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${lead.leadScore}%` }} />
                        </div>
                        <span className="text-xs text-card-foreground">{lead.leadScore}</span>
                      </div>
                    </td>
                    <td className="p-4"><TempBadge temp={lead.temperature} /></td>
                    <td className="p-4"><StatusBadge status={lead.status} /></td>
                    <td className="p-4"><PriorityBadge cat={lead.priorityCategory} /></td>
                    <td className="p-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">No leads found</p>}
          </div>
        </>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <LeadDetailPanel lead={selectedLead} users={users} onUpdate={handleUpdateLead} onClose={() => setSelectedLead(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
