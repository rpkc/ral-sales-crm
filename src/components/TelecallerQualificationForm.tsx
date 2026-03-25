import { useState } from "react";
import { Lead, LeadStatus, LeadActivity, CurrentStatus, CareerGoal, LeadMotivation, PreferredStartTime, CallOutcome, FollowUpType } from "@/lib/types";
import {
  MASTER_QUALIFICATIONS, MASTER_STREAMS, MASTER_CURRENT_STATUS,
  MASTER_CAREER_GOALS, MASTER_LEAD_MOTIVATIONS, MASTER_CALL_OUTCOMES,
  MASTER_OBJECTIONS, MASTER_FOLLOWUP_TYPES, MASTER_BATCH_TIMINGS,
  MASTER_LOCATIONS, MASTER_SALARY_EXPECTATIONS,
} from "@/lib/master-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Send, X, Phone, User, GraduationCap, Target, Calendar, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const BUDGET_RANGES = ["₹15,000 – ₹45,000", "₹90,000 – ₹1,18,000", "₹1,60,000 – ₹4,10,000"] as const;

const LEAD_STAGES: LeadStatus[] = [
  "New", "Contact Attempted", "Connected", "Interested",
  "Counseling", "Qualified", "Admission", "Lost",
];

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{msg}</p> : null;
}

interface TelecallerQualificationFormProps {
  lead: Lead;
  onSave: (lead: Lead, isDraft: boolean) => void;
  onCancel: () => void;
}

export function TelecallerQualificationForm({ lead, onSave, onCancel }: TelecallerQualificationFormProps) {
  // Qualification fields state
  const [qual, setQual] = useState({
    highestQualification: lead.highestQualification || "",
    stream: "",
    currentStatus: (lead.currentStatus as string) || "",
    careerGoal: (lead.careerGoal as string) || "",
    leadMotivation: (lead.leadMotivation as string) || "",
    budgetRange: lead.budgetRange || "",
    preferredStartTime: (lead.preferredStartTime as string) || "",
    batchTiming: "",
    city: lead.jobLocationPreference || "",
    willingToRelocate: "",
    placementInterest: lead.placementInterest ? "Yes" : "",
    expectedSalary: lead.expectedSalary || "",
  });

  // Call outcome state
  const [callOutcome, setCallOutcome] = useState<CallOutcome | "">("");
  const [callNotes, setCallNotes] = useState("");
  const [showCallFields, setShowCallFields] = useState(false);

  // Conditional fields for Connected/Interested
  const [objection, setObjection] = useState("");
  const [objectionNotes, setObjectionNotes] = useState("");

  // Follow-up scheduling
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpType, setFollowUpType] = useState<FollowUpType | "">("");

  // Status update
  const [newStatus, setNewStatus] = useState<LeadStatus>(lead.status);

  // Section visibility
  const [showQualification, setShowQualification] = useState(true);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setQualField = (k: string, v: string) => { setQual((p) => ({ ...p, [k]: v })); setIsDirty(true); };

  const isConnectedOutcome = callOutcome === "Connected" || callOutcome === "Interested";

  const buildUpdatedLead = (): Lead => {
    const now = new Date();
    const activities: LeadActivity[] = [...(lead.activities || [])];

    // Add call activity
    if (callOutcome) {
      activities.push({
        id: `act${Date.now()}`, leadId: lead.id, type: callOutcome === "Connected" || callOutcome === "Interested" ? "Call Connected" : "Call Attempted",
        description: `Call outcome: ${callOutcome}${callNotes ? ` — ${callNotes}` : ""}`,
        channel: "Phone Call", timestamp: now.toISOString(),
      });
    }

    // Add status change activity
    if (newStatus !== lead.status) {
      activities.push({
        id: `act${Date.now() + 1}`, leadId: lead.id, type: `Status → ${newStatus}`,
        description: `Status changed to ${newStatus}`,
        timestamp: new Date(now.getTime() + 1000).toISOString(),
      });
    }

    // Add follow-up activity
    if (followUpDate) {
      activities.push({
        id: `act${Date.now() + 2}`, leadId: lead.id, type: "Follow-up Scheduled",
        description: `Follow-up scheduled: ${followUpType || "Call"} on ${followUpDate}${followUpTime ? ` at ${followUpTime}` : ""}`,
        timestamp: new Date(now.getTime() + 2000).toISOString(),
      });
    }

    // Calculate intent score based on qualification
    let intentScore = lead.intentScore || 30;
    if (qual.budgetRange) intentScore += 10;
    if (qual.careerGoal) intentScore += 5;
    if (qual.placementInterest === "Yes") intentScore += 5;
    if (qual.preferredStartTime === "Immediate") intentScore += 10;
    intentScore = Math.min(intentScore, 100);

    const intentCategory = intentScore >= 75 ? "High Intent" as const : intentScore >= 45 ? "Medium Intent" as const : "Low Intent" as const;
    const temperature = intentScore >= 75 ? "Hot" as const : intentScore >= 45 ? "Warm" as const : "Cold" as const;

    return {
      ...lead,
      status: newStatus,
      highestQualification: qual.highestQualification || lead.highestQualification,
      currentStatus: (qual.currentStatus as CurrentStatus) || lead.currentStatus,
      careerGoal: (qual.careerGoal as CareerGoal) || lead.careerGoal,
      leadMotivation: (qual.leadMotivation as LeadMotivation) || lead.leadMotivation,
      budgetRange: qual.budgetRange || lead.budgetRange,
      preferredStartTime: (qual.preferredStartTime as PreferredStartTime) || lead.preferredStartTime,
      jobLocationPreference: qual.city || lead.jobLocationPreference,
      placementInterest: qual.placementInterest === "Yes" ? true : lead.placementInterest,
      expectedSalary: qual.expectedSalary || lead.expectedSalary,
      intentScore, intentCategory, temperature,
      lastInteractionType: callOutcome ? "Call" : lead.lastInteractionType,
      lastInteractionDate: callOutcome ? now.toISOString().split("T")[0] : lead.lastInteractionDate,
      activities,
    };
  };

  const handleSaveDraft = () => {
    const updated = buildUpdatedLead();
    onSave(updated, true);
    toast.success("Lead qualification saved as draft.");
    setIsDirty(false);
  };

  const handleSubmit = () => {
    const updated = buildUpdatedLead();
    onSave(updated, false);
    toast.success("Lead qualification submitted.");
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Save before leaving?")) return;
    onCancel();
  };

  return (
    <div className="space-y-4">
      <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-1">
        {/* Read-only basic info from marketing */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Info (from Marketing)</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-card-foreground">{lead.name}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-card-foreground">{lead.phone}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-card-foreground">{lead.email || "—"}</span></div>
            <div><span className="text-muted-foreground">Source:</span> <span className="font-medium text-card-foreground">{lead.source || "—"}</span></div>
            <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium text-card-foreground">{lead.campaignId || "—"}</span></div>
            <div><span className="text-muted-foreground">Course:</span> <span className="font-medium text-card-foreground">{lead.interestedCourse || "—"}</span></div>
          </div>
        </div>

        {/* ─── Call Outcome Section ─── */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <button onClick={() => setShowCallFields(!showCallFields)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call Outcome</p>
            </div>
            {showCallFields ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showCallFields && (
            <div className="space-y-3 animate-in slide-in-from-top-1">
              <div>
                <Label>Call Outcome</Label>
                <Select value={callOutcome} onValueChange={(v) => { setCallOutcome(v as CallOutcome); setIsDirty(true); }}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>{MASTER_CALL_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Call Notes</Label>
                <Textarea value={callNotes} onChange={(e) => { setCallNotes(e.target.value); setIsDirty(true); }} placeholder="Summary of the call..." rows={2} />
              </div>

              {/* Conditional: Connected/Interested → extra fields */}
              {isConnectedOutcome && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in slide-in-from-top-1">
                  <p className="text-xs font-semibold text-primary">Connected — Additional Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Lead Motivation</Label>
                      <Select value={qual.leadMotivation} onValueChange={(v) => setQualField("leadMotivation", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{MASTER_LEAD_MOTIVATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Budget Discussion</Label>
                      <Select value={qual.budgetRange} onValueChange={(v) => setQualField("budgetRange", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{BUDGET_RANGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Objections */}
                  <div>
                    <Label className="text-xs">Objections</Label>
                    <Select value={objection} onValueChange={(v) => { setObjection(v); setIsDirty(true); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any objections?" /></SelectTrigger>
                      <SelectContent>{MASTER_OBJECTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {objection && (
                    <div>
                      <Label className="text-xs">Objection Details</Label>
                      <Input value={objectionNotes} onChange={(e) => { setObjectionNotes(e.target.value); setIsDirty(true); }} placeholder="Details about the objection..." className="h-8 text-sm" />
                    </div>
                  )}

                  {/* Follow-up from connected call */}
                  <Separator />
                  <p className="text-xs font-semibold text-primary">Next Follow-up</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={followUpDate} onChange={(e) => { setFollowUpDate(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Time</Label>
                      <Input type="time" value={followUpTime} onChange={(e) => { setFollowUpTime(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={followUpType} onValueChange={(v) => { setFollowUpType(v as FollowUpType); setIsDirty(true); }}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{MASTER_FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Call Later → callback */}
              {callOutcome === "Call Later" && (
                <div className="space-y-3 rounded-lg border border-warning/20 bg-warning/5 p-3 animate-in slide-in-from-top-1">
                  <p className="text-xs font-semibold text-warning">Schedule Callback</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Callback Date</Label>
                      <Input type="date" value={followUpDate} onChange={(e) => { setFollowUpDate(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Time</Label>
                      <Input type="time" value={followUpTime} onChange={(e) => { setFollowUpTime(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={followUpType} onValueChange={(v) => { setFollowUpType(v as FollowUpType); setIsDirty(true); }}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{MASTER_FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Not Interested → reason */}
              {callOutcome === "Not Interested" && (
                <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 animate-in slide-in-from-top-1">
                  <p className="text-xs font-semibold text-destructive">Reason for Disinterest</p>
                  <Select value={objection} onValueChange={(v) => { setObjection(v); setIsDirty(true); }}>
                    <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>{MASTER_OBJECTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Lead Qualification Section ─── */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <button onClick={() => setShowQualification(!showQualification)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead Qualification</p>
            </div>
            {showQualification ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showQualification && (
            <div className="space-y-3 animate-in slide-in-from-top-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Highest Qualification</Label>
                  <Select value={qual.highestQualification} onValueChange={(v) => setQualField("highestQualification", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Stream</Label>
                  <Select value={qual.stream} onValueChange={(v) => setQualField("stream", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Current Status</Label>
                  <Select value={qual.currentStatus} onValueChange={(v) => setQualField("currentStatus", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_CURRENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Career Goal</Label>
                  <Select value={qual.careerGoal} onValueChange={(v) => setQualField("careerGoal", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_CAREER_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Lead Motivation</Label>
                  <Select value={qual.leadMotivation} onValueChange={(v) => setQualField("leadMotivation", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_LEAD_MOTIVATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Budget Range</Label>
                  <Select value={qual.budgetRange} onValueChange={(v) => setQualField("budgetRange", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{BUDGET_RANGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Preferred Start Time</Label>
                  <Select value={qual.preferredStartTime} onValueChange={(v) => setQualField("preferredStartTime", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{(["Immediate", "Within 1 Month", "Within 3 Months", "Not Sure"] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Batch Timing</Label>
                  <Select value={qual.batchTiming} onValueChange={(v) => setQualField("batchTiming", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_BATCH_TIMINGS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Select value={qual.city} onValueChange={(v) => setQualField("city", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Willing to Relocate</Label>
                  <Select value={qual.willingToRelocate} onValueChange={(v) => setQualField("willingToRelocate", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Maybe">Maybe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Placement Interest</Label>
                  <Select value={qual.placementInterest} onValueChange={(v) => setQualField("placementInterest", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {qual.placementInterest === "Yes" && (
                <div>
                  <Label className="text-xs">Expected Salary</Label>
                  <Select value={qual.expectedSalary} onValueChange={(v) => setQualField("expectedSalary", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_SALARY_EXPECTATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Lead Status Update ─── */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <button onClick={() => setShowStatus(!showStatus)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update Lead Status</p>
            </div>
            {showStatus ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showStatus && (
            <div className="flex flex-wrap gap-1.5 animate-in slide-in-from-top-1">
              {LEAD_STAGES.map((s) => (
                <Button key={s} variant={newStatus === s ? "default" : "outline"} size="sm" className="text-xs h-7"
                  onClick={() => { setNewStatus(s); setIsDirty(true); }}>
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Follow-up (standalone) ─── */}
        {!isConnectedOutcome && callOutcome !== "Call Later" && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <button onClick={() => setShowFollowUp(!showFollowUp)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule Follow-up</p>
              </div>
              {showFollowUp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showFollowUp && (
              <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-1">
                <div>
                  <Label className="text-xs">Follow-up Date</Label>
                  <Input type="date" value={followUpDate} onChange={(e) => { setFollowUpDate(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Follow-up Time</Label>
                  <Input type="time" value={followUpTime} onChange={(e) => { setFollowUpTime(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Follow-up Type</Label>
                  <Select value={followUpType} onValueChange={(v) => { setFollowUpType(v as FollowUpType); setIsDirty(true); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{MASTER_FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="mr-1 h-4 w-4" />Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveDraft}>
          <Save className="mr-1 h-4 w-4" />Save Draft
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          <Send className="mr-1 h-4 w-4" />Submit
        </Button>
      </div>
    </div>
  );
}
