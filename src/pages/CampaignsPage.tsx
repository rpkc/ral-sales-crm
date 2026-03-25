import { useState } from "react";
import { store } from "@/lib/mock-data";
import { Campaign, CampaignPlatform } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(store.getCampaigns());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "Meta" as CampaignPlatform, budget: "", startDate: "", endDate: "" });

  const handleCreate = () => {
    const budget = parseFloat(form.budget) || 0;
    const newCampaign: Campaign = {
      id: `c${Date.now()}`,
      name: form.name,
      platform: form.platform,
      budget,
      startDate: form.startDate,
      endDate: form.endDate,
      leadsGenerated: 0,
      costPerLead: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    store.saveCampaigns(updated);
    setForm({ name: "", platform: "Meta", budget: "", startDate: "", endDate: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage ad campaigns and track performance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Bootcamp Ads" />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as CampaignPlatform })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Meta", "Google", "LinkedIn", "Other"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget (₹)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name}>Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Campaign</th>
              <th className="p-4 font-medium">Platform</th>
              <th className="p-4 font-medium">Budget</th>
              <th className="p-4 font-medium">Duration</th>
              <th className="p-4 font-medium">Leads</th>
              <th className="p-4 font-medium">CPL</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-4 font-medium text-card-foreground">{c.name}</td>
                <td className="p-4">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">{c.platform}</span>
                </td>
                <td className="p-4 text-muted-foreground">₹{c.budget.toLocaleString()}</td>
                <td className="p-4 text-muted-foreground">{c.startDate} → {c.endDate}</td>
                <td className="p-4 font-medium text-card-foreground">{c.leadsGenerated}</td>
                <td className="p-4 text-muted-foreground">₹{c.costPerLead}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
