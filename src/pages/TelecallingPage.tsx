import { useState } from "react";
import { store } from "@/lib/mock-data";
import { CallLog, CallOutcome } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { Phone, PhoneCall, PhoneOff, Clock } from "lucide-react";

const OUTCOMES: CallOutcome[] = ["Connected", "Not answered", "Interested", "Not interested", "Call later"];

export default function TelecallingPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>(store.getCallLogs());
  const leads = store.getLeads();
  const users = store.getUsers();

  // Simulate logged-in telecaller
  const currentUser = users.find((u) => u.id === "u3")!;
  const assignedLeads = leads.filter((l) => l.assignedTelecallerId === currentUser.id);

  const [form, setForm] = useState({ leadId: "", outcome: "" as CallOutcome, notes: "", nextFollowUp: "" });

  const handleLogCall = () => {
    const newLog: CallLog = {
      id: `cl${Date.now()}`,
      leadId: form.leadId,
      telecallerId: currentUser.id,
      outcome: form.outcome,
      notes: form.notes,
      nextFollowUp: form.nextFollowUp,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...callLogs, newLog];
    setCallLogs(updated);
    store.saveCallLogs(updated);
    setForm({ leadId: "", outcome: "" as CallOutcome, notes: "", nextFollowUp: "" });
  };

  const myLogs = callLogs.filter((cl) => cl.telecallerId === currentUser.id);
  const todayLogs = myLogs.filter((cl) => cl.createdAt === new Date().toISOString().split("T")[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telecalling</h1>
        <p className="text-sm text-muted-foreground">Welcome, {currentUser.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Assigned Leads" value={assignedLeads.length} icon={<Phone className="h-5 w-5" />} />
        <StatCard title="Calls Today" value={todayLogs.length} icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard title="Total Calls" value={myLogs.length} icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call logging form */}
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Log a Call</h2>
          <div className="space-y-4">
            <div>
              <Label>Select Lead</Label>
              <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose lead" /></SelectTrigger>
                <SelectContent>
                  {assignedLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {l.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Call Outcome</Label>
              <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v as CallOutcome })}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Call notes..." rows={3} />
            </div>
            <div>
              <Label>Next Follow-up</Label>
              <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
            </div>
            <Button onClick={handleLogCall} className="w-full" disabled={!form.leadId || !form.outcome}>Log Call</Button>
          </div>
        </div>

        {/* Call history */}
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Call History</h2>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto">
            {myLogs.length === 0 && <p className="text-sm text-muted-foreground">No calls logged yet</p>}
            {[...myLogs].reverse().map((log) => {
              const lead = leads.find((l) => l.id === log.leadId);
              return (
                <div key={log.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{lead?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{lead?.phone}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.outcome === "Interested" ? "bg-success/10 text-success" :
                      log.outcome === "Not interested" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{log.outcome}</span>
                  </div>
                  {log.notes && <p className="mt-2 text-xs text-muted-foreground">{log.notes}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{log.createdAt}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
