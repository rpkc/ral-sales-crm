import { useState, useMemo, useCallback } from "react";
import { store } from "@/lib/mock-data";
import { CallLog, CallOutcome, Lead, Admission, NotInterestedReason, FollowUpType, ConversationInsight } from "@/lib/types";
import {
  MASTER_CALL_OUTCOMES, MASTER_OBJECTIONS, MASTER_FOLLOWUP_TYPES,
  MASTER_CAREER_GOALS, MASTER_LEAD_MOTIVATIONS, MASTER_COURSE_NAMES,
} from "@/lib/master-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Phone, PhoneCall, Clock, AlertTriangle, Users, Target, Zap, Timer, Activity,
  MessageSquare, Calendar, ChevronRight, Eye, Send, ArrowRight, CheckCircle2,
  XCircle, PhoneOff, BarChart3, TrendingUp, User, Star, Lightbulb
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const OUTCOMES: CallOutcome[] = [...MASTER_CALL_OUTCOMES] as CallOutcome[];
const NOT_INTERESTED_REASONS: NotInterestedReason[] = [...MASTER_OBJECTIONS] as NotInterestedReason[];
const FOLLOW_UP_TYPES: FollowUpType[] = [...MASTER_FOLLOWUP_TYPES] as FollowUpType[];

const CHART_COLORS = [
  "hsl(358, 78%, 51%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)",
  "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(180, 60%, 45%)",
];

const PIPELINE_STAGES = ["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission"] as const;

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function daysBetween(dateA: string, dateB: string): number {
  return Math.max(0, Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000));
}
function getLeadAge(createdAt: string): number {
  return daysBetween(createdAt, new Date().toISOString().split("T")[0]);
}
function getAgeBadge(days: number) {
  if (days <= 2) return { label: "Fresh", color: "bg-success/15 text-success border-success/20" };
  if (days <= 7) return { label: "Active", color: "bg-primary/15 text-primary border-primary/20" };
  if (days <= 15) return { label: "Aging", color: "bg-warning/15 text-warning border-warning/20" };
  return { label: "Critical", color: "bg-destructive/15 text-destructive border-destructive/20" };
}
function getATTBg(days: number) {
  if (days <= 5) return "bg-success/15 text-success border-success/20";
  if (days <= 10) return "bg-warning/15 text-warning border-warning/20";
  return "bg-destructive/15 text-destructive border-destructive/20";
}
function getPriorityBg(cat?: string) {
  if (cat === "High Priority") return "bg-destructive/10 text-destructive border-destructive/20";
  if (cat === "Medium Priority") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
}
function getTempBg(t?: string) {
  if (t === "Hot") return "bg-destructive/10 text-destructive border-destructive/20";
  if (t === "Warm") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
}
function outcomeBg(o: CallOutcome) {
  if (o === "Interested" || o === "Connected") return "bg-success/10 text-success";
  if (o === "Not interested" || o === "Wrong Number") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TelecallingPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>(store.getCallLogs());
  const [followUps, setFollowUps] = useState(store.getFollowUps());
  const leads = store.getLeads();
  const admissions = store.getAdmissions();
  const users = store.getUsers();

  const currentUser = users.find((u) => u.id === "u3")!;
  const allLeads = leads.filter((l) => l.status !== "Admission" && l.status !== "Lost");
  const assignedLeads = leads.filter((l) => l.assignedTelecallerId === currentUser.id);
  const activeAssigned = assignedLeads.filter((l) => l.status !== "Admission" && l.status !== "Lost");

  const [activeTab, setActiveTab] = useState("queue");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Call outcome form state
  const [outcomeForm, setOutcomeForm] = useState<{
    outcome: CallOutcome | "";
    notes: string;
    notInterestedReason: NotInterestedReason | "";
    followUpDate: string;
    followUpTime: string;
    followUpType: FollowUpType | "";
    callbackDate: string;
    callbackTime: string;
    insight: ConversationInsight;
  }>({
    outcome: "", notes: "", notInterestedReason: "", followUpDate: "", followUpTime: "",
    followUpType: "", callbackDate: "", callbackTime: "",
    insight: {},
  });
  const [outcomeError, setOutcomeError] = useState("");

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /* ─── Derived data ─── */
  const today = new Date().toISOString().split("T")[0];
  const myLogs = callLogs.filter((cl) => cl.telecallerId === currentUser.id);
  const todayLogs = myLogs.filter((cl) => cl.createdAt === today);
  const connectedToday = todayLogs.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested").length;

  // Call attempts per lead
  const callAttemptsMap = useMemo(() => {
    const map = new Map<string, number>();
    callLogs.forEach((cl) => map.set(cl.leadId, (map.get(cl.leadId) || 0) + 1));
    return map;
  }, [callLogs]);

  // Follow-ups due today
  const followUpsDueToday = useMemo(() => {
    return followUps.filter((f) => f.assignedTo === currentUser.id && f.date <= today && !f.completed);
  }, [followUps, currentUser.id, today]);

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

  const telecallerPerf = useMemo(() => {
    return users.filter((u) => u.role === "telecaller").map((tc) => {
      const assigned = leads.filter((l) => l.assignedTelecallerId === tc.id);
      const converted = conversionData.filter((c) => c.telecallerId === tc.id);
      const avgATT = converted.length > 0 ? +(converted.reduce((s, c) => s + c.att, 0) / converted.length).toFixed(1) : 0;
      const calls = callLogs.filter((cl) => cl.telecallerId === tc.id);
      const connCalls = calls.filter((cl) => cl.outcome === "Connected" || cl.outcome === "Interested");
      const todayC = calls.filter((cl) => cl.createdAt === today);
      return {
        id: tc.id, name: tc.name, leadsAssigned: assigned.length,
        admissions: converted.length, avgATT, totalCalls: calls.length,
        todayCalls: todayC.length, connectedCalls: connCalls.length,
        conversionRate: assigned.length > 0 ? +((converted.length / assigned.length) * 100).toFixed(1) : 0,
        qualifiedLeads: assigned.filter((l) => l.status === "Qualified" || l.status === "Counseling" || l.status === "Admission").length,
        followUpsScheduled: calls.filter((cl) => cl.nextFollowUp).length,
      };
    });
  }, [leads, conversionData, callLogs, users, today]);

  const sourcePerf = useMemo(() => {
    const m = new Map<string, { leads: number; admissions: number; totalATT: number }>();
    leads.forEach((l) => { const e = m.get(l.source) || { leads: 0, admissions: 0, totalATT: 0 }; e.leads++; m.set(l.source, e); });
    conversionData.forEach((c) => { const e = m.get(c.source) || { leads: 0, admissions: 0, totalATT: 0 }; e.admissions++; e.totalATT += c.att; m.set(c.source, e); });
    return Array.from(m.entries()).map(([source, d]) => ({ source, ...d, avgATT: d.admissions > 0 ? +(d.totalATT / d.admissions).toFixed(1) : 0 }));
  }, [leads, conversionData]);

  const coursePerf = useMemo(() => {
    const m = new Map<string, { leads: number; admissions: number; totalATT: number }>();
    leads.forEach((l) => { const e = m.get(l.interestedCourse) || { leads: 0, admissions: 0, totalATT: 0 }; e.leads++; m.set(l.interestedCourse, e); });
    conversionData.forEach((c) => { const e = m.get(c.course) || { leads: 0, admissions: 0, totalATT: 0 }; e.admissions++; e.totalATT += c.att; m.set(c.course, e); });
    return Array.from(m.entries()).map(([course, d]) => ({ course, ...d, avgATT: d.admissions > 0 ? +(d.totalATT / d.admissions).toFixed(1) : 0 }));
  }, [leads, conversionData]);

  const pipelineCounts = useMemo(() => PIPELINE_STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.status === s).length })), [leads]);

  /* ─── Smart queue (sorted by priority, grouped) ─── */
  const smartQueue = useMemo(() => {
    const sorted = [...activeAssigned].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    const highPriority = sorted.filter((l) => l.priorityCategory === "High Priority");
    const followUpDue = sorted.filter((l) => {
      const fu = followUps.find((f) => f.leadId === l.id && f.date <= today && !f.completed);
      return fu && l.priorityCategory !== "High Priority";
    });
    const fresh = sorted.filter((l) => getLeadAge(l.createdAt) <= 1 && l.priorityCategory !== "High Priority" && !followUpDue.includes(l));
    const dormant = sorted.filter((l) => getLeadAge(l.createdAt) > 15 && !highPriority.includes(l) && !followUpDue.includes(l) && !fresh.includes(l));
    const rest = sorted.filter((l) => !highPriority.includes(l) && !followUpDue.includes(l) && !fresh.includes(l) && !dormant.includes(l));
    return { highPriority, followUpDue, fresh, dormant, rest };
  }, [activeAssigned, followUps, today]);

  /* ─── Smart suggestions for a lead ─── */
  const getSmartSuggestions = (lead: Lead) => {
    const suggestions: { icon: typeof Lightbulb; msg: string }[] = [];
    const age = getLeadAge(lead.createdAt);
    const attempts = callAttemptsMap.get(lead.id) || 0;
    const hasCalls = attempts > 0;

    if (!hasCalls && age > 0) suggestions.push({ icon: AlertTriangle, msg: `Lead has not been contacted for ${age} day${age > 1 ? "s" : ""}.` });
    if (attempts >= 3 && lead.status === "New") suggestions.push({ icon: Lightbulb, msg: "Lead unreachable after multiple attempts. Consider moving to nurture sequence." });
    if (lead.intentCategory === "High Intent" && lead.status !== "Counseling") suggestions.push({ icon: Star, msg: "High intent lead detected. Schedule counseling." });
    if (lead.temperature === "Hot" && lead.status === "Follow-up") suggestions.push({ icon: Zap, msg: "Hot lead in follow-up. Prioritize conversion." });
    if (lead.qualification?.budgetConfirmed && !lead.qualification?.startTimeline) suggestions.push({ icon: Lightbulb, msg: "Budget confirmed but no start timeline. Clarify preferred start date." });
    return suggestions;
  };

  /* ─── Lead stage timeline ─── */
  const getStageTimeline = (lead: Lead) => {
    const acts = lead.activities || [];
    if (acts.length === 0) return [];
    const stages = [
      { type: "Lead Created", label: "New Lead" }, { type: "Call Attempted", label: "Contact Attempted" },
      { type: "Call Connected", label: "Connected" }, { type: "Follow-up Scheduled", label: "Follow-up" },
      { type: "Counseling Done", label: "Counseling" }, { type: "Admission Discussion", label: "Admission Discussion" },
    ];
    const result: { label: string; days: number }[] = [];
    for (let i = 0; i < stages.length; i++) {
      const act = acts.find((a) => a.type === stages[i].type);
      if (!act) continue;
      const next = acts.find((a) => stages.slice(i + 1).map((s) => s.type).includes(a.type));
      result.push({ label: stages[i].label, days: next ? daysBetween(act.timestamp.split("T")[0], next.timestamp.split("T")[0]) || 1 : 1 });
    }
    return result;
  };

  /* ─── Smart alerts ─── */
  const alerts = useMemo(() => {
    const items: { type: "warning" | "info"; message: string }[] = [];
    activeAssigned.forEach((l) => {
      const age = getLeadAge(l.createdAt);
      if (l.status === "Counseling" && age > 7) items.push({ type: "warning", message: `${l.name} has been in admission discussion for ${age} days. Consider escalation.` });
      const attempts = callAttemptsMap.get(l.id) || 0;
      if (attempts === 0 && age > 0) items.push({ type: "warning", message: `${l.name} has not been contacted yet (${age} days old).` });
    });
    if (overallATT > 10) items.push({ type: "info", message: "Conversion cycle is increasing. Review counseling workflow." });
    return items.slice(0, 5);
  }, [activeAssigned, callAttemptsMap, overallATT]);

  /* ═══════════════════════════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════════════════════════ */
  const openWorkspace = (lead: Lead) => {
    setSelectedLead(lead);
    setShowOutcomeForm(false);
    setOutcomeForm({ outcome: "", notes: "", notInterestedReason: "", followUpDate: "", followUpTime: "", followUpType: "", callbackDate: "", callbackTime: "", insight: {} });
    setOutcomeError("");
  };

  const startCall = () => {
    setShowOutcomeForm(true);
  };

  const saveCallOutcome = () => {
    if (!selectedLead) return;
    if (!outcomeForm.outcome) { setOutcomeError("Please select a call outcome before saving."); return; }
    if (outcomeForm.outcome === "Not interested" && !outcomeForm.notInterestedReason) {
      setOutcomeError("Please select a reason for marking this lead as not interested."); return;
    }
    if (outcomeForm.outcome === "Call later" && !outcomeForm.callbackDate) {
      setOutcomeError("Follow-up date is required."); return;
    }

    const newLog: CallLog = {
      id: `cl${Date.now()}`, leadId: selectedLead.id, telecallerId: currentUser.id,
      outcome: outcomeForm.outcome as CallOutcome, notes: outcomeForm.notes,
      nextFollowUp: outcomeForm.followUpDate || outcomeForm.callbackDate,
      nextFollowUpTime: outcomeForm.followUpTime || outcomeForm.callbackTime,
      followUpType: (outcomeForm.followUpType as FollowUpType) || undefined,
      notInterestedReason: (outcomeForm.notInterestedReason as NotInterestedReason) || undefined,
      conversationInsight: Object.values(outcomeForm.insight).some(Boolean) ? outcomeForm.insight : undefined,
      callbackDate: outcomeForm.callbackDate || undefined,
      callbackTime: outcomeForm.callbackTime || undefined,
      createdAt: today,
    };
    const updated = [...callLogs, newLog];
    setCallLogs(updated);
    store.saveCallLogs(updated);

    // If follow-up scheduled, add to follow-ups
    if (outcomeForm.followUpDate) {
      const newFU = {
        id: `f${Date.now()}`, leadId: selectedLead.id, assignedTo: currentUser.id,
        date: outcomeForm.followUpDate, notes: outcomeForm.notes, completed: false, createdAt: today,
      };
      const updatedFU = [...followUps, newFU];
      setFollowUps(updatedFU);
      store.saveFollowUps(updatedFU);
      showToast("Call outcome recorded. Follow-up added to your task queue.");
    } else {
      showToast("Call outcome recorded successfully.");
    }

    // Auto-load next lead
    const currentIdx = activeAssigned.findIndex((l) => l.id === selectedLead.id);
    const sortedQueue = [...activeAssigned].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    const nextLead = sortedQueue.find((l) => l.id !== selectedLead.id);
    if (nextLead) {
      setSelectedLead(nextLead);
    } else {
      setSelectedLead(null);
    }
    setShowOutcomeForm(false);
    setOutcomeForm({ outcome: "", notes: "", notInterestedReason: "", followUpDate: "", followUpTime: "", followUpType: "", callbackDate: "", callbackTime: "", insight: {} });
    setOutcomeError("");
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER HELPERS
     ═══════════════════════════════════════════════════════════════ */
  const renderLeadCard = (lead: Lead, compact = false) => {
    const age = getLeadAge(lead.createdAt);
    const ageBadge = getAgeBadge(age);
    const attempts = callAttemptsMap.get(lead.id) || 0;
    const suggestions = getSmartSuggestions(lead);

    return (
      <div
        key={lead.id}
        className={`rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer ${selectedLead?.id === lead.id ? "ring-2 ring-primary" : ""}`}
        onClick={() => openWorkspace(lead)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-card-foreground truncate">{lead.name}</p>
              {attempts > 0 && (
                <span className="text-[10px] text-muted-foreground">({attempts} attempt{attempts > 1 ? "s" : ""})</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{lead.phone} · {lead.interestedCourse}</p>
            {!compact && <p className="text-xs text-muted-foreground mt-0.5">{lead.source} · Intent: {lead.intentScore || 0}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 ${getPriorityBg(lead.priorityCategory)}`}>
              {lead.priorityScore || 0}pts
            </Badge>
            {lead.temperature && (
              <Badge variant="outline" className={`text-[10px] px-1.5 ${getTempBg(lead.temperature)}`}>
                {lead.temperature}
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 ${ageBadge.color}`}>{ageBadge.label}</Badge>
          </div>
        </div>

        {!compact && suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {suggestions.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-warning">
                <Zap className="h-3 w-3 shrink-0" />{s.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQueueSection = (title: string, items: Lead[], icon: React.ReactNode, emptyMsg: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          {icon}
          {title}
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
        <div className="space-y-2">
          {items.map((l) => renderLeadCard(l))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 rounded-lg bg-success px-4 py-3 text-success-foreground shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecalling</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser.name}</p>
      </div>

      {/* Top stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Calls Pending" value={activeAssigned.filter((l) => !(callAttemptsMap.get(l.id))).length} icon={<Phone className="h-5 w-5" />} />
        <StatCard title="Follow-ups Today" value={followUpsDueToday.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard title="Connected" value={connectedToday} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="High Priority" value={smartQueue.highPriority.length} icon={<Star className="h-5 w-5" />} />
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${a.type === "warning" ? "border-warning/30 bg-warning/5 text-warning" : "border-primary/30 bg-primary/5 text-primary"}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />{a.message}
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="queue">Smart Queue</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>

        {/* ═══════ TAB 1: SMART CALL QUEUE ═══════ */}
        <TabsContent value="queue" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {renderQueueSection("High Priority Leads", smartQueue.highPriority, <Target className="h-4 w-4 text-destructive" />, "No high priority leads")}
              {renderQueueSection("Follow-ups Due Today", smartQueue.followUpDue, <Calendar className="h-4 w-4 text-warning" />, "")}
              {renderQueueSection("New Leads (Fresh)", smartQueue.fresh, <Zap className="h-4 w-4 text-success" />, "")}
              {renderQueueSection("Other Active", smartQueue.rest, <Users className="h-4 w-4 text-muted-foreground" />, "")}
              {renderQueueSection("Dormant Leads", smartQueue.dormant, <Clock className="h-4 w-4 text-muted-foreground" />, "")}
              {activeAssigned.length === 0 && (
                <div className="rounded-xl bg-card p-8 text-center shadow-card">
                  <PhoneOff className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No leads assigned to you yet.</p>
                </div>
              )}
            </div>

            {/* Quick lead preview panel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              {selectedLead ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-card-foreground">Lead Preview</h3>
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => { openWorkspace(selectedLead); setActiveTab("workspace"); }}>
                      Open Workspace <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-card-foreground">{selectedLead.name}</span></div>
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-card-foreground">{selectedLead.phone}</span></div>
                    <div><span className="text-muted-foreground">Course:</span> <span className="font-medium text-card-foreground">{selectedLead.interestedCourse}</span></div>
                    <div><span className="text-muted-foreground">Source:</span> <span className="font-medium text-card-foreground">{selectedLead.source}</span></div>
                    <div><span className="text-muted-foreground">Intent:</span> <Badge variant="outline" className={`text-[10px] ml-1 ${selectedLead.intentCategory === "High Intent" ? "bg-success/10 text-success" : selectedLead.intentCategory === "Medium Intent" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{selectedLead.intentScore || 0} — {selectedLead.intentCategory || "N/A"}</Badge></div>
                    <div><span className="text-muted-foreground">Last Interaction:</span> <span className="text-card-foreground text-xs">{selectedLead.lastInteractionType || "None"}</span></div>
                    <div><span className="text-muted-foreground">Call Attempts:</span> <span className="text-card-foreground">{callAttemptsMap.get(selectedLead.id) || 0}</span></div>
                  </div>
                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={() => { setActiveTab("workspace"); startCall(); }} className="h-8 text-xs">
                      <Phone className="h-3 w-3 mr-1" /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <Calendar className="h-3 w-3 mr-1" /> Follow-up
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click a lead card to preview details</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 2: CLICK-TO-CALL WORKSPACE ═══════ */}
        <TabsContent value="workspace" className="mt-4">
          {selectedLead ? (
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left: Lead details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl bg-card p-5 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-card-foreground">{selectedLead.name}</h3>
                    <Badge variant="outline" className={getTempBg(selectedLead.temperature)}>{selectedLead.temperature || "N/A"}</Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium text-card-foreground">{selectedLead.phone}</p></div>
                    <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-card-foreground text-xs">{selectedLead.email}</p></div>
                    <div><p className="text-muted-foreground text-xs">Course</p><p className="font-medium text-card-foreground">{selectedLead.interestedCourse}</p></div>
                    <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium text-card-foreground">{selectedLead.source}</p></div>
                    <div><p className="text-muted-foreground text-xs">Intent Score</p><p className="font-medium text-card-foreground">{selectedLead.intentScore || 0}</p></div>
                    <div><p className="text-muted-foreground text-xs">Lead Age</p><p className="font-medium text-card-foreground">{getLeadAge(selectedLead.createdAt)} days</p></div>
                    <div><p className="text-muted-foreground text-xs">Budget</p><p className="font-medium text-card-foreground">{selectedLead.budgetRange || "—"}</p></div>
                    <div><p className="text-muted-foreground text-xs">Decision Maker</p><p className="font-medium text-card-foreground">{selectedLead.decisionMaker || "—"}</p></div>
                    <div><p className="text-muted-foreground text-xs">Education</p><p className="font-medium text-card-foreground">{selectedLead.currentEducation || "—"}</p></div>
                    <div><p className="text-muted-foreground text-xs">Last Interaction</p><p className="font-medium text-card-foreground text-xs">{selectedLead.lastInteractionType || "None"}</p></div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={startCall} className="h-8 text-xs"><Phone className="h-3 w-3 mr-1" /> Call</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs"><Send className="h-3 w-3 mr-1" /> WhatsApp</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs"><Calendar className="h-3 w-3 mr-1" /> Follow-up</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs"><Eye className="h-3 w-3 mr-1" /> Timeline</Button>
                  </div>
                </div>

                {/* Smart Suggestions */}
                {getSmartSuggestions(selectedLead).length > 0 && (
                  <div className="rounded-xl bg-card p-4 shadow-card space-y-2">
                    <p className="text-xs font-semibold text-card-foreground flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-warning" /> Smart Suggestions</p>
                    {getSmartSuggestions(selectedLead).map((s, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-warning">
                        <Zap className="h-3 w-3 shrink-0 mt-0.5" />{s.msg}
                      </div>
                    ))}
                  </div>
                )}

                {/* Call attempt tracker */}
                <div className="rounded-xl bg-card p-4 shadow-card">
                  <p className="text-xs font-semibold text-card-foreground mb-2">Call Attempts</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((n) => {
                      const attempts = callAttemptsMap.get(selectedLead.id) || 0;
                      const done = n <= attempts;
                      return (
                        <div key={n} className={`flex-1 rounded-lg border p-2 text-center text-xs ${done ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                          <p className="font-medium">Attempt {n}</p>
                          {done ? <CheckCircle2 className="mx-auto h-4 w-4 mt-1" /> : <XCircle className="mx-auto h-4 w-4 mt-1 opacity-30" />}
                        </div>
                      );
                    })}
                  </div>
                  {(callAttemptsMap.get(selectedLead.id) || 0) >= 3 && (
                    <div className="mt-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-warning flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 shrink-0" />Lead unreachable after multiple attempts. Consider moving to nurture sequence.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Call actions + timeline */}
              <div className="lg:col-span-3 space-y-4">
                {/* Call Outcome Form (progressive disclosure) */}
                {showOutcomeForm ? (
                  <div className="rounded-xl bg-card p-5 shadow-card space-y-4">
                    <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-primary" /> Record Call Outcome
                    </h3>

                    {/* Outcome selector */}
                    <div>
                      <Label>Call Outcome <span className="text-destructive">*</span></Label>
                      <Select value={outcomeForm.outcome} onValueChange={(v) => { setOutcomeForm({ ...outcomeForm, outcome: v as CallOutcome }); setOutcomeError(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                        <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* === CONDITIONAL: Connected / Interested → Conversation Insights === */}
                    {(outcomeForm.outcome === "Connected" || outcomeForm.outcome === "Interested") && (
                      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <p className="text-xs font-semibold text-primary">Conversation Insights</p>
                        <p className="text-[11px] text-muted-foreground">Capture structured insights to improve follow-up quality</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Career Goal</Label>
                            <Select value={outcomeForm.insight.careerGoal || ""} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, careerGoal: v } })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{MASTER_CAREER_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Budget Expectation</Label>
                            <Input placeholder="e.g. ₹30k-50k" value={outcomeForm.insight.budgetRange || ""}
                              onChange={(e) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, budgetRange: e.target.value } })} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Lead Motivation</Label>
                            <Select value={outcomeForm.insight.leadMotivation || ""} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, leadMotivation: v as any } })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{MASTER_LEAD_MOTIVATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Preferred Learning Mode</Label>
                            <Select value={outcomeForm.insight.preferredLearningMode || ""} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, preferredLearningMode: v } })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Online">Online</SelectItem>
                                <SelectItem value="Offline">Offline</SelectItem>
                                <SelectItem value="Hybrid">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Decision Maker</Label>
                            <Select value={outcomeForm.insight.decisionMaker || ""} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, decisionMaker: v } })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Self">Self</SelectItem>
                                <SelectItem value="Parent">Parent</SelectItem>
                                <SelectItem value="Joint">Joint</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Placement Expectation</Label>
                            <Input placeholder="e.g. Within 6 months" value={outcomeForm.insight.placementExpectation || ""}
                              onChange={(e) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, placementExpectation: e.target.value } })} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Objections</Label>
                            <Select value={outcomeForm.insight.objections || ""} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, objections: v } })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{MASTER_OBJECTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Preferred Start Date</Label>
                            <Input type="date" value={outcomeForm.insight.preferredStartDate || ""}
                              onChange={(e) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, preferredStartDate: e.target.value } })} className="h-8 text-sm" />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Biggest Concern</Label>
                            <Input placeholder="e.g. Course duration, fees" value={outcomeForm.insight.biggestConcern || ""}
                              onChange={(e) => setOutcomeForm({ ...outcomeForm, insight: { ...outcomeForm.insight, biggestConcern: e.target.value } })} className="h-8 text-sm" />
                          </div>
                        </div>

                        {/* Schedule follow-up */}
                        <Separator />
                        <p className="text-xs font-semibold text-primary">Schedule Follow-up</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input type="date" value={outcomeForm.followUpDate} onChange={(e) => setOutcomeForm({ ...outcomeForm, followUpDate: e.target.value })} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Time</Label>
                            <Input type="time" value={outcomeForm.followUpTime} onChange={(e) => setOutcomeForm({ ...outcomeForm, followUpTime: e.target.value })} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select value={outcomeForm.followUpType} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, followUpType: v as FollowUpType })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{FOLLOW_UP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === CONDITIONAL: Call Later → callback fields === */}
                    {outcomeForm.outcome === "Call later" && (
                      <div className="space-y-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
                        <p className="text-xs font-semibold text-warning">Schedule Callback</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Callback Date <span className="text-destructive">*</span></Label>
                            <Input type="date" value={outcomeForm.callbackDate} onChange={(e) => { setOutcomeForm({ ...outcomeForm, callbackDate: e.target.value }); setOutcomeError(""); }} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Callback Time</Label>
                            <Input type="time" value={outcomeForm.callbackTime} onChange={(e) => setOutcomeForm({ ...outcomeForm, callbackTime: e.target.value })} className="h-8 text-sm" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === CONDITIONAL: Not Interested → reason dropdown === */}
                    {outcomeForm.outcome === "Not interested" && (
                      <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <p className="text-xs font-semibold text-destructive">Reason for Disinterest</p>
                        <Select value={outcomeForm.notInterestedReason} onValueChange={(v) => { setOutcomeForm({ ...outcomeForm, notInterestedReason: v as NotInterestedReason }); setOutcomeError(""); }}>
                          <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                          <SelectContent>{NOT_INTERESTED_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">Please select a reason for marking this lead as not interested.</p>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <Label>Conversation Summary</Label>
                      <Textarea value={outcomeForm.notes} onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })} placeholder="Key points from the conversation..." rows={3} />
                    </div>

                    {/* Error */}
                    {outcomeError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                        <XCircle className="h-3 w-3" />{outcomeError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={saveCallOutcome} className="flex-1">Save Call Outcome</Button>
                      <Button variant="outline" onClick={() => setShowOutcomeForm(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-card p-8 shadow-card text-center">
                    <Phone className="mx-auto h-10 w-10 text-primary mb-3" />
                    <p className="text-sm font-medium text-card-foreground mb-1">Ready to call {selectedLead.name}?</p>
                    <p className="text-xs text-muted-foreground mb-4">Click the button below to start recording the call outcome</p>
                    <Button onClick={startCall} size="lg"><Phone className="h-4 w-4 mr-2" /> Start Call</Button>
                  </div>
                )}

                {/* Lead Activity Timeline */}
                <div className="rounded-xl bg-card p-5 shadow-card">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Activity Timeline
                  </h3>
                  <ScrollArea className="max-h-64">
                    {(selectedLead.activities || []).length === 0 && <p className="text-xs text-muted-foreground">No activity recorded yet</p>}
                    <div className="space-y-0">
                      {[...(selectedLead.activities || [])].reverse().map((act, i) => (
                        <div key={act.id} className="flex gap-3 pb-4">
                          <div className="flex flex-col items-center">
                            <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                            {i < (selectedLead.activities || []).length - 1 && <div className="w-px flex-1 bg-border" />}
                          </div>
                          <div className="pb-1">
                            <p className="text-xs font-medium text-card-foreground">{act.type}</p>
                            <p className="text-[11px] text-muted-foreground">{act.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(act.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Stage duration bars */}
                {getStageTimeline(selectedLead).length > 0 && (
                  <div className="rounded-xl bg-card p-5 shadow-card">
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Stage Duration</h3>
                    {getStageTimeline(selectedLead).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs mb-1.5">
                        <span className="w-28 text-muted-foreground truncate">{s.label}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(s.days * 15, 100)}%` }} />
                        </div>
                        <span className="w-10 text-right text-muted-foreground">{s.days}d</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Previous call logs for this lead */}
                {myLogs.filter((cl) => cl.leadId === selectedLead.id).length > 0 && (
                  <div className="rounded-xl bg-card p-5 shadow-card">
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Previous Calls</h3>
                    <div className="space-y-2">
                      {myLogs.filter((cl) => cl.leadId === selectedLead.id).reverse().map((log) => (
                        <div key={log.id} className="rounded-lg border p-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className={`rounded-full px-2 py-0.5 font-medium ${outcomeBg(log.outcome)}`}>{log.outcome}</span>
                            <span className="text-muted-foreground">{log.createdAt}</span>
                          </div>
                          {log.notes && <p className="mt-1.5 text-muted-foreground">{log.notes}</p>}
                          {log.conversationInsight?.careerGoal && <p className="mt-1 text-card-foreground">Goal: {log.conversationInsight.careerGoal}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-card p-12 text-center shadow-card">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium text-card-foreground">No Lead Selected</p>
              <p className="text-sm text-muted-foreground mt-1">Go to Smart Queue and click on a lead to open the workspace</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveTab("queue")}>
                <ArrowRight className="h-4 w-4 mr-2" /> Open Smart Queue
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══════ TAB 3: ANALYTICS (ATT Dashboard) ═══════ */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Overall ATT" value={`${overallATT} Days`} icon={<Timer className="h-5 w-5" />} />
            <StatCard title="Total Admissions" value={admissions.length} icon={<Target className="h-5 w-5" />} />
            <StatCard title="Active Leads" value={allLeads.length} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Lead Contact Rate" value={`${leads.length > 0 ? ((callLogs.length / leads.length) * 100).toFixed(0) : 0}%`} icon={<Activity className="h-5 w-5" />} />
          </div>

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
              <p className="mb-3 text-[11px] text-muted-foreground">Courses with longer ATT may need stronger counseling support</p>
              <ResponsiveContainer width="100%" height={240}>
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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pipeline distribution */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Pipeline Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pipelineCounts} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={90} label={({ stage, count }) => `${stage}: ${count}`}>
                    {pipelineCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Conversion funnel */}
            <div className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">Conversion Funnel</h3>
              <div className="space-y-2">
                {pipelineCounts.map((p, i) => {
                  const maxCount = Math.max(...pipelineCounts.map((x) => x.count), 1);
                  const pct = (p.count / maxCount) * 100;
                  return (
                    <div key={p.stage} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-muted-foreground">{p.stage}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div className="h-full rounded flex items-center px-2 transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}>
                          <span className="text-[10px] font-medium text-white">{p.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
                        {s.avgATT > 0 ? <Badge variant="outline" className={getATTBg(s.avgATT)}>{s.avgATT} Days</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 4: TELECALLER PERFORMANCE ═══════ */}
        <TabsContent value="performance" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
            <StatCard title="My Connected" value={connectedToday} icon={<Zap className="h-5 w-5" />} />
            <StatCard title="My Follow-ups" value={myLogs.filter((cl) => cl.nextFollowUp).length} icon={<Calendar className="h-5 w-5" />} />
            <StatCard title="Overall ATT" value={`${overallATT} Days`} icon={<Timer className="h-5 w-5" />} />
          </div>

          {/* Telecaller comparison table */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Telecaller Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium text-center">Calls Made</th>
                    <th className="pb-2 font-medium text-center">Connected</th>
                    <th className="pb-2 font-medium text-center">Follow-ups</th>
                    <th className="pb-2 font-medium text-center">Qualified</th>
                    <th className="pb-2 font-medium text-center">Admissions</th>
                    <th className="pb-2 font-medium text-center">Conv %</th>
                    <th className="pb-2 font-medium text-center">Avg ATT</th>
                  </tr>
                </thead>
                <tbody>
                  {telecallerPerf.map((tc) => (
                    <tr key={tc.id} className={`border-b last:border-0 ${tc.id === currentUser.id ? "bg-primary/5" : ""}`}>
                      <td className="py-3 font-medium text-card-foreground">{tc.name} {tc.id === currentUser.id && <span className="text-[10px] text-primary">(You)</span>}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.totalCalls}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.connectedCalls}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.followUpsScheduled}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.qualifiedLeads}</td>
                      <td className="py-3 text-center text-muted-foreground">{tc.admissions}</td>
                      <td className="py-3 text-center font-medium text-card-foreground">{tc.conversionRate}%</td>
                      <td className="py-3 text-center">
                        {tc.avgATT > 0 ? <Badge variant="outline" className={getATTBg(tc.avgATT)}>{tc.avgATT}d</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Course conversion speed */}
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">Conversion Speed by Course</h3>
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
                        {c.avgATT > 0 ? <Badge variant="outline" className={getATTBg(c.avgATT)}>{c.avgATT}d</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 5: CALL HISTORY ═══════ */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-card-foreground">My Call History</h3>
            <div className="space-y-2 max-h-[36rem] overflow-y-auto">
              {myLogs.length === 0 && <p className="text-sm text-muted-foreground">No calls logged yet</p>}
              {[...myLogs].reverse().map((log) => {
                const lead = leads.find((l) => l.id === log.leadId);
                return (
                  <div key={log.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/30 cursor-pointer" onClick={() => lead && openWorkspace(lead)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{lead?.phone} · {lead?.interestedCourse}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeBg(log.outcome)}`}>{log.outcome}</span>
                        <span className="text-[10px] text-muted-foreground">{log.createdAt}</span>
                      </div>
                    </div>
                    {log.notes && <p className="mt-1.5 text-xs text-muted-foreground">{log.notes}</p>}
                    {log.conversationInsight?.careerGoal && (
                      <div className="mt-1.5 flex gap-3 text-[11px]">
                        <span className="text-muted-foreground">Goal: <span className="text-card-foreground">{log.conversationInsight.careerGoal}</span></span>
                        {log.conversationInsight.budgetRange && <span className="text-muted-foreground">Budget: <span className="text-card-foreground">{log.conversationInsight.budgetRange}</span></span>}
                      </div>
                    )}
                    {log.notInterestedReason && <p className="mt-1 text-[11px] text-destructive">Reason: {log.notInterestedReason}</p>}
                    {log.nextFollowUp && <p className="mt-1 text-[11px] text-primary">Follow-up: {log.nextFollowUp} {log.followUpType ? `(${log.followUpType})` : ""}</p>}
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
