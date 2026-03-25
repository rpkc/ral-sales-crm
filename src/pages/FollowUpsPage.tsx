import { useState } from "react";
import { store } from "@/lib/mock-data";
import { FollowUp } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>(store.getFollowUps());
  const [open, setOpen] = useState(false);
  const leads = store.getLeads();
  const users = store.getUsers();

  const [form, setForm] = useState({ leadId: "", assignedTo: "", date: "", notes: "" });

  const handleCreate = () => {
    const newFU: FollowUp = {
      id: `f${Date.now()}`,
      leadId: form.leadId,
      assignedTo: form.assignedTo,
      date: form.date,
      notes: form.notes,
      completed: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...followUps, newFU];
    setFollowUps(updated);
    store.saveFollowUps(updated);
    setForm({ leadId: "", assignedTo: "", date: "", notes: "" });
    setOpen(false);
  };

  const toggleComplete = (id: string) => {
    const updated = followUps.map((f) => (f.id === id ? { ...f, completed: !f.completed } : f));
    setFollowUps(updated);
    store.saveFollowUps(updated);
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = followUps.filter((f) => !f.completed && f.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const overdue = followUps.filter((f) => !f.completed && f.date < today);
  const completed = followUps.filter((f) => f.completed);

  const renderList = (items: FollowUp[], label: string, emptyText: string) => (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label} ({items.length})</h3>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      <div className="space-y-2">
        {items.map((f) => {
          const lead = leads.find((l) => l.id === f.leadId);
          const user = users.find((u) => u.id === f.assignedTo);
          return (
            <div key={f.id} className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors", f.completed && "opacity-60")}>
              <button onClick={() => toggleComplete(f.id)} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors", f.completed ? "border-success bg-success" : "border-input hover:border-primary")}>
                {f.completed && <Check className="h-3 w-3 text-success-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown Lead"}</p>
                <p className="text-xs text-muted-foreground">{f.notes}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{f.date}</span>
                  {user && <span>→ {user.name}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">Track and manage lead follow-ups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Schedule Follow-up</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Lead</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.leadId || !form.date}>Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-card">
          {renderList(overdue, "Overdue", "No overdue follow-ups")}
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          {renderList(upcoming, "Upcoming", "No upcoming follow-ups")}
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          {renderList(completed, "Completed", "No completed follow-ups")}
        </div>
      </div>
    </div>
  );
}
