import { useState, useMemo, useRef, useEffect } from "react";
import { store } from "@/lib/mock-data";
import {
  Campaign, CampaignPlatform, CampaignObjective, CampaignApprovalStatus,
  AudienceType, RetargetingSource, AdType, AdSet, AdCreative, LandingPage, UTMTracking,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import {
  Plus, Megaphone, Target, TrendingUp, BarChart3, PieChart, DollarSign,
  AlertCircle, CheckCircle2, Users, ArrowDownRight, ArrowUpRight, Eye, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";

const PLATFORMS: CampaignPlatform[] = ["Meta", "Google", "LinkedIn", "YouTube", "Referral", "Offline Event"];
const OBJECTIVES: CampaignObjective[] = ["Lead Generation", "Brand Awareness", "Webinar", "Course Promotion"];
const APPROVAL_STATUSES: CampaignApprovalStatus[] = ["Draft", "Active", "Paused", "Completed", "Archived"];
const AUDIENCE_TYPES: AudienceType[] = ["Cold", "Retargeting", "Lookalike", "Custom Audience"];
const RETARGETING_SOURCES: RetargetingSource[] = ["Website Visitors", "Video Views", "Lead Form"];
const AD_TYPES: AdType[] = ["Image", "Video", "Carousel", "Reel"];
const PAID_PLATFORMS: CampaignPlatform[] = ["Meta", "Google", "LinkedIn", "YouTube"];
const CHART_COLORS = ["hsl(358,78%,51%)", "hsl(0,0%,10%)", "hsl(38,92%,50%)", "hsl(142,71%,45%)", "hsl(210,79%,46%)", "hsl(0,0%,60%)"];

function FieldError({ msg }: { msg?: string }) {
  return msg ? (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{msg}</p>
  ) : null;
}

function metricColor(value: number, good: number, avg: number, inverse = false) {
  if (inverse) return value <= good ? "text-success" : value <= avg ? "text-warning" : "text-destructive";
  return value >= good ? "text-success" : value >= avg ? "text-warning" : "text-destructive";
}

// ─── Campaign Creation Form ───
function CampaignForm({ onSave, onCancel }: { onSave: (c: Campaign) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: "", platform: "" as CampaignPlatform | "", objective: "" as CampaignObjective | "",
    budget: "", dailyBudget: "", startDate: "", endDate: "", targetLocation: "",
    ageGroup: "", educationLevel: "", interestCategory: "", targetCity: "",
    marketingManager: "", campaignOwner: "", campaignNotes: "", approvalStatus: "Draft" as CampaignApprovalStatus,
  });
  const [utmForm, setUtmForm] = useState<UTMTracking>({ utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isPaid = PAID_PLATFORMS.includes(form.platform as CampaignPlatform);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Campaign name is required.";
    if (!form.platform) e.platform = "Please select a platform.";
    if (!form.objective) e.objective = "Please select a campaign objective.";
    if (!form.budget || parseFloat(form.budget) <= 0) e.budget = "Campaign budget must be greater than zero.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";
    if (isPaid && !utmForm.utmSource.trim()) e.utmSource = "UTM source is required for digital campaigns.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const campaign: Campaign = {
      id: `c${Date.now()}`,
      name: form.name, platform: form.platform as CampaignPlatform, objective: form.objective as CampaignObjective,
      budget: parseFloat(form.budget) || 0, dailyBudget: parseFloat(form.dailyBudget) || 0,
      startDate: form.startDate, endDate: form.endDate, targetLocation: form.targetLocation,
      leadsGenerated: 0, costPerLead: 0, createdAt: new Date().toISOString().split("T")[0],
      ageGroup: form.ageGroup, educationLevel: form.educationLevel,
      interestCategory: form.interestCategory, targetCity: form.targetCity,
      marketingManager: form.marketingManager, campaignOwner: form.campaignOwner,
      campaignNotes: form.campaignNotes, approvalStatus: form.approvalStatus,
      adSets: [], utmTracking: utmForm, landingPages: [],
    };
    onSave(campaign);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
      {/* Base Fields */}
      <div>
        <Label>Campaign Name</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Summer Bootcamp Ads" />
        <FieldError msg={errors.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Platform</Label>
          <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
            <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
            <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError msg={errors.platform} />
        </div>
        <div>
          <Label>Objective</Label>
          <Select value={form.objective} onValueChange={(v) => set("objective", v)}>
            <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
            <SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError msg={errors.objective} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Campaign Budget (₹)</Label>
          <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 50000" />
          <FieldError msg={errors.budget} />
        </div>
        <div>
          <Label>Daily Budget (₹)</Label>
          <Input type="number" value={form.dailyBudget} onChange={(e) => set("dailyBudget", e.target.value)} placeholder="e.g. 1667" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /><FieldError msg={errors.startDate} /></div>
        <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /><FieldError msg={errors.endDate} /></div>
      </div>
      <div><Label>Target Location</Label><Input value={form.targetLocation} onChange={(e) => set("targetLocation", e.target.value)} placeholder="e.g. Mumbai, Delhi" /></div>

      {/* Targeting — paid platforms only */}
      {isPaid && (
        <div className="animate-slide-down space-y-3 rounded-lg border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audience Targeting</p>
          <p className="text-xs text-muted-foreground">Define who should see this campaign so leads are more relevant.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Age Group</Label><Input value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} placeholder="e.g. 18-30" /></div>
            <div><Label>Education Level</Label><Input value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)} placeholder="e.g. Graduate" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Interest Category</Label><Input value={form.interestCategory} onChange={(e) => set("interestCategory", e.target.value)} placeholder="e.g. Technology" /></div>
            <div><Label>Target City</Label><Input value={form.targetCity} onChange={(e) => set("targetCity", e.target.value)} placeholder="e.g. Mumbai" /></div>
          </div>
        </div>
      )}

      {/* UTM Tracking — paid platforms */}
      {isPaid && (
        <div className="animate-slide-down space-y-3 rounded-lg border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">UTM Tracking</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>utm_source</Label><Input value={utmForm.utmSource} onChange={(e) => setUtmForm({ ...utmForm, utmSource: e.target.value })} placeholder="e.g. meta" /><FieldError msg={errors.utmSource} /></div>
            <div><Label>utm_medium</Label><Input value={utmForm.utmMedium} onChange={(e) => setUtmForm({ ...utmForm, utmMedium: e.target.value })} placeholder="e.g. paid" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>utm_campaign</Label><Input value={utmForm.utmCampaign} onChange={(e) => setUtmForm({ ...utmForm, utmCampaign: e.target.value })} /></div>
            <div><Label>utm_content</Label><Input value={utmForm.utmContent} onChange={(e) => setUtmForm({ ...utmForm, utmContent: e.target.value })} /></div>
            <div><Label>utm_term</Label><Input value={utmForm.utmTerm} onChange={(e) => setUtmForm({ ...utmForm, utmTerm: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* Team & Approval */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team & Approval</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Marketing Manager</Label><Input value={form.marketingManager} onChange={(e) => set("marketingManager", e.target.value)} /></div>
          <div><Label>Campaign Owner</Label><Input value={form.campaignOwner} onChange={(e) => set("campaignOwner", e.target.value)} /></div>
        </div>
        <div><Label>Campaign Notes</Label><Input value={form.campaignNotes} onChange={(e) => set("campaignNotes", e.target.value)} /></div>
        <div>
          <Label>Approval Status</Label>
          <Select value={form.approvalStatus} onValueChange={(v) => set("approvalStatus", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full">Create Campaign</Button>
    </div>
  );
}

// ─── Ad Set / Creative Form ───
function AdSetForm({ campaignId, onSave }: { campaignId: string; onSave: (adSet: AdSet) => void }) {
  const [name, setName] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType | "">("");
  const [sourceAudience, setSourceAudience] = useState("");
  const [retargetingSource, setRetargetingSource] = useState<RetargetingSource | "">("");
  const sourceRef = useRef<HTMLInputElement>(null);

  // Ad creative
  const [adType, setAdType] = useState<AdType | "">("");
  const [creativeHook, setCreativeHook] = useState("");
  const [primaryMessage, setPrimaryMessage] = useState("");
  const [cta, setCta] = useState("");

  useEffect(() => {
    if (audienceType === "Lookalike") sourceRef.current?.focus();
  }, [audienceType]);

  const handleSave = () => {
    if (!name || !audienceType) return;
    const ads: AdCreative[] = adType ? [{
      id: `ad${Date.now()}`, adType: adType as AdType, creativeHook, primaryMessage, cta,
    }] : [];
    onSave({
      id: `as${Date.now()}`, campaignId, name, audienceType: audienceType as AudienceType,
      sourceAudience, retargetingSource, ads,
    });
  };

  return (
    <div className="space-y-4">
      <div><Label>Ad Set Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold Audience - Tech" /></div>
      <div>
        <Label>Audience Type</Label>
        <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
          <SelectTrigger><SelectValue placeholder="Select audience type" /></SelectTrigger>
          <SelectContent>{AUDIENCE_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {audienceType === "Lookalike" && (
        <div className="animate-slide-down">
          <Label>Source Audience</Label>
          <Input ref={sourceRef} value={sourceAudience} onChange={(e) => setSourceAudience(e.target.value)} placeholder="e.g. Website converters" />
        </div>
      )}

      {audienceType === "Retargeting" && (
        <div className="animate-slide-down">
          <Label>Retargeting Source</Label>
          <Select value={retargetingSource} onValueChange={(v) => setRetargetingSource(v as RetargetingSource)}>
            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>{RETARGETING_SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {/* Creative */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ad Creative (optional)</p>
        <p className="text-xs text-muted-foreground">Record the hook used in the ad creative to analyze which messaging converts best.</p>
        <div>
          <Label>Ad Type</Label>
          <Select value={adType} onValueChange={(v) => setAdType(v as AdType)}>
            <SelectTrigger><SelectValue placeholder="Select ad type" /></SelectTrigger>
            <SelectContent>{AD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {adType && (
          <div className="animate-slide-down space-y-3">
            <div><Label>Creative Hook</Label><Input value={creativeHook} onChange={(e) => setCreativeHook(e.target.value)} placeholder="e.g. Launch your tech career in 12 weeks" /></div>
            <div><Label>Primary Message</Label><Input value={primaryMessage} onChange={(e) => setPrimaryMessage(e.target.value)} /></div>
            <div><Label>CTA</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Apply Now" /></div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} className="w-full" disabled={!name || !audienceType}>Add Ad Set</Button>
    </div>
  );
}

// ─── Main Campaigns Page ───
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(store.getCampaigns());
  const [createOpen, setCreateOpen] = useState(false);
  const [adSetDialog, setAdSetDialog] = useState<string | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [view, setView] = useState<"dashboard" | "list">("dashboard");

  const leads = store.getLeads();
  const admissions = store.getAdmissions();

  // ─── Computed Analytics ───
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
  const qualifiedLeads = leads.filter((l) => ["Qualified", "Admission"].includes(l.status)).length;
  const admissionCount = admissions.length;
  const totalRevenue = admissions.reduce((s, a) => s + (a.totalFee || 0), 0);

  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const cpql = qualifiedLeads > 0 ? totalSpend / qualifiedLeads : 0;
  const cac = admissionCount > 0 ? totalSpend / admissionCount : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Funnel data
  const funnelStages = [
    { name: "Lead Generated", count: totalLeads },
    { name: "Contacted", count: leads.filter((l) => l.status !== "New").length },
    { name: "Follow-up", count: leads.filter((l) => !["New", "Contacted", "Lost"].includes(l.status)).length },
    { name: "Counseling", count: leads.filter((l) => ["Counseling", "Qualified", "Admission"].includes(l.status)).length },
    { name: "Qualified", count: leads.filter((l) => ["Qualified", "Admission"].includes(l.status)).length },
    { name: "Admission", count: admissionCount },
  ];

  // Source pie chart
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Campaign perf bar chart
  const perfData = campaigns.map((c) => ({
    name: (c.name || "").length > 18 ? c.name.slice(0, 18) + "…" : (c.name || ""),
    leads: c.leadsGenerated || 0,
    budget: (c.budget || 0) / 1000,
  }));

  const handleCreateCampaign = (c: Campaign) => {
    const updated = [...campaigns, c];
    setCampaigns(updated);
    store.saveCampaigns(updated);
    setCreateOpen(false);
    toast.success("Campaign created successfully.");
  };

  const handleAddAdSet = (adSet: AdSet) => {
    const updated = campaigns.map((c) => c.id === adSet.campaignId ? { ...c, adSets: [...(c.adSets || []), adSet] } : c);
    setCampaigns(updated);
    store.saveCampaigns(updated);
    setAdSetDialog(null);
    toast.success("Ad Set added successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Track campaign performance, lead attribution, and ROI</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" onClick={() => setView("dashboard")}>
            <BarChart3 className="mr-1 h-4 w-4" />Dashboard
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
            <Layers className="mr-1 h-4 w-4" />Campaigns
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Campaign</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
              <CampaignForm onSave={handleCreateCampaign} onCancel={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── DASHBOARD VIEW ─── */}
      {view === "dashboard" && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Spend" value={`₹${totalSpend.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="Total Leads" value={totalLeads} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Cost Per Lead" value={`₹${Math.round(cpl).toLocaleString()}`} icon={<Target className="h-5 w-5" />} />
            <StatCard title="Qualified Leads" value={qualifiedLeads} icon={<CheckCircle2 className="h-5 w-5" />} />
          </div>

          {/* ROI Cards — only when admissions exist */}
          {admissionCount > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-card shadow-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Admissions</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{admissionCount}</p>
              </div>
              <div className="rounded-xl bg-card shadow-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CAC</p>
                <p className={`text-2xl font-bold mt-1 ${metricColor(cac, 5000, 10000, true)}`}>₹{Math.round(cac).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Spend / Admissions</p>
              </div>
              <div className="rounded-xl bg-card shadow-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">ROAS</p>
                <p className={`text-2xl font-bold mt-1 ${metricColor(roas, 5, 2)}`}>{roas.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground">Revenue / Spend</p>
              </div>
              <div className="rounded-xl bg-card shadow-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-bold text-success mt-1">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lead Source Pie */}
            <div className="rounded-xl bg-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" />Lead Source Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RPieChart>
              </ResponsiveContainer>
            </div>

            {/* Campaign Performance Bar */}
            <div className="rounded-xl bg-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Campaign Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="hsl(358,78%,51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budget (₹k)" fill="hsl(0,0%,10%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="rounded-xl bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Lead Funnel</h3>
            <div className="flex items-end gap-2">
              {funnelStages.map((stage, i) => {
                const maxCount = funnelStages[0].count || 1;
                const height = Math.max(20, (stage.count / maxCount) * 180);
                const convRate = i > 0 && funnelStages[i - 1].count > 0
                  ? ((stage.count / funnelStages[i - 1].count) * 100).toFixed(0)
                  : "100";
                const dropOff = i > 0 && funnelStages[i - 1].count > 0
                  ? (((funnelStages[i - 1].count - stage.count) / funnelStages[i - 1].count) * 100).toFixed(0)
                  : "0";
                return (
                  <div key={stage.name} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-bold text-card-foreground">{stage.count}</div>
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{ height, background: `hsl(358, 78%, ${51 + i * 7}%)` }}
                    />
                    <div className="text-[10px] text-center text-muted-foreground leading-tight">{stage.name}</div>
                    {i > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px]">
                        <ArrowDownRight className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">{dropOff}%</span>
                        <span className="text-muted-foreground mx-0.5">·</span>
                        <ArrowUpRight className="h-3 w-3 text-success" />
                        <span className="text-success">{convRate}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Landing Page Comparison */}
          {campaigns.some((c) => (c.landingPages?.length ?? 0) > 1) && (
            <div className="rounded-xl bg-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Landing Page Comparison</h3>
              {campaigns.filter((c) => (c.landingPages?.length ?? 0) > 1).map((c) => (
                <div key={c.id} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{c.name}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {c.landingPages.map((lp) => (
                      <div key={lp.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-card-foreground">{lp.pageVersion}</p>
                        <p className="text-xs text-muted-foreground truncate">{lp.url}</p>
                        <p className={`text-lg font-bold mt-1 ${metricColor(lp.conversionRate, 15, 8)}`}>{lp.conversionRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── LIST VIEW ─── */}
      {view === "list" && (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Campaign</th>
                <th className="p-4 font-medium">Platform</th>
                <th className="p-4 font-medium">Objective</th>
                <th className="p-4 font-medium">Budget</th>
                <th className="p-4 font-medium">Leads</th>
                <th className="p-4 font-medium">CPL</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailCampaign(c)}>
                  <td className="p-4 font-medium text-card-foreground">{c.name}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">{c.platform}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{c.objective || "—"}</td>
                  <td className="p-4 text-muted-foreground">₹{(c.budget || 0).toLocaleString()}</td>
                  <td className="p-4 font-medium text-card-foreground">{c.leadsGenerated || 0}</td>
                  <td className="p-4 text-muted-foreground">₹{c.costPerLead}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.approvalStatus === "Active" ? "bg-success/10 text-success" :
                      c.approvalStatus === "Paused" ? "bg-warning/10 text-warning" :
                      c.approvalStatus === "Draft" ? "bg-muted text-muted-foreground" :
                      "bg-info/10 text-info"
                    }`}>{c.approvalStatus}</span>
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAdSetDialog(c.id); }}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Ad Set
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <Dialog open={!!detailCampaign} onOpenChange={(o) => !o && setDetailCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailCampaign && (
            <>
              <DialogHeader><DialogTitle>{detailCampaign.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Platform:</span> <span className="font-medium text-card-foreground">{detailCampaign.platform}</span></div>
                  <div><span className="text-muted-foreground">Objective:</span> <span className="font-medium text-card-foreground">{detailCampaign.objective}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-card-foreground">{detailCampaign.approvalStatus}</span></div>
                  <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium text-card-foreground">₹{(detailCampaign.budget || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Daily:</span> <span className="font-medium text-card-foreground">₹{(detailCampaign.dailyBudget || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Location:</span> <span className="font-medium text-card-foreground">{detailCampaign.targetLocation || "—"}</span></div>
                  <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium text-card-foreground">{detailCampaign.startDate} → {detailCampaign.endDate}</span></div>
                  <div><span className="text-muted-foreground">Leads:</span> <span className="font-bold text-card-foreground">{detailCampaign.leadsGenerated}</span></div>
                  <div><span className="text-muted-foreground">CPL:</span> <span className="font-medium text-card-foreground">₹{detailCampaign.costPerLead}</span></div>
                </div>

                {/* UTM */}
                {detailCampaign.utmTracking.utmSource && (
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">UTM Tracking</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(detailCampaign.utmTracking).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="text-card-foreground">{v}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ad Sets */}
                {(detailCampaign.adSets?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ad Sets ({detailCampaign.adSets.length})</p>
                    {detailCampaign.adSets.map((as) => (
                      <div key={as.id} className="rounded-lg border border-border p-3 mb-2">
                        <p className="text-sm font-medium text-card-foreground">{as.name}</p>
                        <p className="text-xs text-muted-foreground">Audience: {as.audienceType}{as.sourceAudience ? ` · Source: ${as.sourceAudience}` : ""}{as.retargetingSource ? ` · Retargeting: ${as.retargetingSource}` : ""}</p>
                        {as.ads.map((ad) => (
                          <div key={ad.id} className="mt-2 pl-3 border-l-2 border-primary/30">
                            <p className="text-xs"><span className="text-muted-foreground">Type:</span> {ad.adType} · <span className="text-muted-foreground">CTA:</span> {ad.cta}</p>
                            {ad.creativeHook && <p className="text-xs text-muted-foreground italic">"{ad.creativeHook}"</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Landing Pages */}
                {(detailCampaign.landingPages?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Landing Pages</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {detailCampaign.landingPages.map((lp) => (
                        <div key={lp.id} className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium text-card-foreground">{lp.pageVersion}</p>
                          <p className="text-xs text-muted-foreground truncate">{lp.url}</p>
                          <p className={`text-lg font-bold mt-1 ${metricColor(lp.conversionRate, 15, 8)}`}>{lp.conversionRate}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Ad Set Dialog */}
      <Dialog open={!!adSetDialog} onOpenChange={(o) => !o && setAdSetDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Ad Set & Creative</DialogTitle></DialogHeader>
          {adSetDialog && <AdSetForm campaignId={adSetDialog} onSave={handleAddAdSet} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
