import { useState } from "react";
import { store } from "@/lib/mock-data";
import { Lead, LeadActivity } from "@/lib/types";
import {
  MASTER_LEAD_SOURCES, MASTER_COURSE_NAMES, MASTER_LOCATIONS,
} from "@/lib/master-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, Send, X } from "lucide-react";
import { toast } from "sonner";

const PURPOSE_OPTIONS = [
  "Course Enquiry", "Free Counseling", "Career Guidance", "Course Fee Inquiry",
] as const;

function FieldError({ msg }: { msg?: string }) {
  return msg ? (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3" />{msg}
    </p>
  ) : null;
}

/**
 * Round-robin assignment: picks the telecaller with the fewest assigned leads.
 */
function getNextTelecaller(): string {
  const users = store.getUsers();
  const leads = store.getLeads();
  const telecallers = users.filter((u) => u.role === "telecaller");
  if (telecallers.length === 0) return "";

  const counts = new Map<string, number>();
  telecallers.forEach((tc) => counts.set(tc.id, 0));
  leads.forEach((l) => {
    if (l.assignedTelecallerId && counts.has(l.assignedTelecallerId)) {
      counts.set(l.assignedTelecallerId, (counts.get(l.assignedTelecallerId) || 0) + 1);
    }
  });

  let minId = telecallers[0].id;
  let minCount = Infinity;
  counts.forEach((count, id) => {
    if (count < minCount) { minCount = count; minId = id; }
  });
  return minId;
}

interface MarketingLeadFormProps {
  onSave: (lead: Lead) => void;
  onCancel: () => void;
  creatorName?: string;
}

export function MarketingLeadForm({ onSave, onCancel, creatorName = "Marketing" }: MarketingLeadFormProps) {
  const campaigns = store.getCampaigns();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "", campaignId: "",
    purposeOfInquiry: "", interestedCourse: "", city: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setIsDirty(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.phone.trim()) e.phone = "Please enter the lead's phone number.";
    else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Please enter a valid 10-digit phone number.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.source) e.source = "Please select a lead source.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildLead = (status: "New" | "New Lead"): Lead => {
    const existing = store.getLeads();
    const dup = existing.find((l) => l.phone === form.phone || (form.email && l.email === form.email));
    if (dup) {
      toast.error(`Possible duplicate lead detected: ${dup.name} (${dup.phone})`);
      throw new Error("duplicate");
    }

    const assignedTelecallerId = getNextTelecaller();
    const assignedTelecallerName = store.getUsers().find((u) => u.id === assignedTelecallerId)?.name || "";
    const now = new Date();
    const leadId = `l${Date.now()}`;

    const activities: LeadActivity[] = [
      {
        id: `act${Date.now()}`, leadId, type: "Lead Created",
        description: `Lead created by ${creatorName}`,
        timestamp: now.toISOString(),
      },
    ];

    if (status !== "New") {
      activities.push({
        id: `act${Date.now() + 1}`, leadId, type: "Lead Assigned",
        description: `Lead assigned to ${assignedTelecallerName} (round-robin)`,
        timestamp: new Date(now.getTime() + 1000).toISOString(),
      });
    }

    return {
      id: leadId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      campaignId: form.campaignId,
      interestedCourse: form.interestedCourse,
      assignedTelecallerId,
      status: "New",
      createdAt: now.toISOString().split("T")[0],
      leadScore: 30,
      leadQuality: "Cold",
      budgetRange: "",
      urgencyLevel: "",
      intentScore: 30,
      intentCategory: "Low Intent",
      temperature: "Cold",
      priorityScore: 30,
      priorityCategory: "Low Priority",
      activities,
    };
  };

  const handleSaveDraft = () => {
    if (!form.name.trim() && !form.phone.trim()) {
      toast.error("Please enter at least a name or phone number to save a draft.");
      return;
    }
    try {
      const lead = buildLead("New");
      onSave(lead);
      toast.success("Lead saved as draft.");
      setIsDirty(false);
    } catch { /* duplicate handled in buildLead */ }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    try {
      const lead = buildLead("New Lead");
      onSave(lead);
      toast.success("Lead successfully created and assigned for telecalling.");
      setIsDirty(false);
    } catch { /* duplicate handled in buildLead */ }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) return;
    onCancel();
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
        {/* Basic Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter lead's full name" />
            <FieldError msg={errors.name} />
          </div>
          <div>
            <Label>Phone Number <span className="text-destructive">*</span></Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile number" />
            <FieldError msg={errors.phone} />
          </div>
        </div>

        <div>
          <Label>Email Address</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
          <FieldError msg={errors.email} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Lead Source <span className="text-destructive">*</span></Label>
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>{MASTER_LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors.source} />
          </div>
          <div>
            <Label>Campaign Name</Label>
            <Select value={form.campaignId} onValueChange={(v) => set("campaignId", v)}>
              <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
              <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Purpose of Inquiry</Label>
            <Select value={form.purposeOfInquiry} onValueChange={(v) => set("purposeOfInquiry", v)}>
              <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
              <SelectContent>{PURPOSE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Course Interested</Label>
            <Select value={form.interestedCourse} onValueChange={(v) => set("interestedCourse", v)}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>{MASTER_COURSE_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>City / Location</Label>
          <Select value={form.city} onValueChange={(v) => set("city", v)}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>{MASTER_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Lead Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional notes about this lead..." rows={2} />
        </div>
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
          <Send className="mr-1 h-4 w-4" />Submit Lead
        </Button>
      </div>
    </div>
  );
}
