import { useState, useMemo } from "react";
import { store } from "@/lib/mock-data";
import { Lead, LeadStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission", "Lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(store.getLeads());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const users = store.getUsers();
  const telecallers = users.filter((u) => u.role === "telecaller");
  const campaigns = store.getCampaigns();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "", campaignId: "", interestedCourse: "", assignedTelecallerId: "",
  });

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search) || l.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const handleCreate = () => {
    const newLead: Lead = {
      id: `l${Date.now()}`, ...form, status: "New", createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...leads, newLead];
    setLeads(updated);
    store.saveLeads(updated);
    setForm({ name: "", phone: "", email: "", source: "", campaignId: "", interestedCourse: "", assignedTelecallerId: "" });
    setOpen(false);
  };

  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status } : l));
    setLeads(updated);
    store.saveLeads(updated);
    setEditLead(null);
  };

  const assignTelecaller = (leadId: string, telecallerId: string) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, assignedTelecallerId: telecallerId } : l));
    setLeads(updated);
    store.saveLeads(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total leads in pipeline</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Meta Ad" /></div>
                <div>
                  <Label>Campaign</Label>
                  <Select value={form.campaignId} onValueChange={(v) => setForm({ ...form, campaignId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Interested Course</Label><Input value={form.interestedCourse} onChange={(e) => setForm({ ...form, interestedCourse: e.target.value })} /></div>
              <div>
                <Label>Assign Telecaller</Label>
                <Select value={form.assignedTelecallerId} onValueChange={(v) => setForm({ ...form, assignedTelecallerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name || !form.phone}>Add Lead</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Course</th>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium">Telecaller</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const telecaller = users.find((u) => u.id === lead.assignedTelecallerId);
              return (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4">
                    <p className="font-medium text-card-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{lead.phone}</td>
                  <td className="p-4 text-muted-foreground">{lead.interestedCourse}</td>
                  <td className="p-4 text-muted-foreground">{lead.source}</td>
                  <td className="p-4">
                    <Select value={lead.assignedTelecallerId} onValueChange={(v) => assignTelecaller(lead.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-4"><StatusBadge status={lead.status} /></td>
                  <td className="p-4">
                    <Dialog open={editLead?.id === lead.id} onOpenChange={(o) => !o && setEditLead(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setEditLead(lead)}>Edit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Update Lead Status</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                          <p className="text-sm text-muted-foreground">Current: <StatusBadge status={lead.status} /></p>
                          <div className="grid grid-cols-2 gap-2">
                            {STATUSES.map((s) => (
                              <Button key={s} variant={lead.status === s ? "default" : "outline"} size="sm" onClick={() => updateLeadStatus(lead.id, s)}>{s}</Button>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">No leads found</p>}
      </div>
    </div>
  );
}
