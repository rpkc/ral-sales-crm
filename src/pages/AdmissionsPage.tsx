import { useState } from "react";
import { store } from "@/lib/mock-data";
import { Admission, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { GraduationCap, IndianRupee, UserCheck, Plus } from "lucide-react";

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>(store.getAdmissions());
  const [open, setOpen] = useState(false);
  const leads = store.getLeads();
  const qualifiedLeads = leads.filter((l) => l.status === "Admission" || l.status === "Qualified");

  const [form, setForm] = useState({
    leadId: "", courseSelected: "", batch: "", admissionDate: "", totalFee: "", paymentStatus: "Pending" as PaymentStatus,
  });

  const handleCreate = () => {
    const lead = leads.find((l) => l.id === form.leadId);
    if (!lead) return;
    const newAdm: Admission = {
      id: `a${Date.now()}`,
      leadId: form.leadId,
      studentName: lead.name,
      phone: lead.phone,
      email: lead.email,
      courseSelected: form.courseSelected,
      batch: form.batch,
      admissionDate: form.admissionDate,
      totalFee: parseFloat(form.totalFee) || 0,
      paymentStatus: form.paymentStatus,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...admissions, newAdm];
    setAdmissions(updated);
    store.saveAdmissions(updated);

    // Update lead status to Admission
    const updatedLeads = leads.map((l) => l.id === form.leadId ? { ...l, status: "Admission" as const } : l);
    store.saveLeads(updatedLeads);

    setForm({ leadId: "", courseSelected: "", batch: "", admissionDate: "", totalFee: "", paymentStatus: "Pending" });
    setOpen(false);
  };

  const totalRevenue = admissions.reduce((sum, a) => sum + a.totalFee, 0);
  const paidCount = admissions.filter((a) => a.paymentStatus === "Paid").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
          <p className="text-sm text-muted-foreground">Convert qualified leads into student records</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Admission</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Admission</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Select Lead</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose qualified lead" /></SelectTrigger>
                  <SelectContent>{qualifiedLeads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} — {l.interestedCourse}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Course</Label><Input value={form.courseSelected} onChange={(e) => setForm({ ...form, courseSelected: e.target.value })} /></div>
                <div><Label>Batch</Label><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="e.g. DS-2026-B" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Admission Date</Label><Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></div>
                <div><Label>Total Fee (₹)</Label><Input type="number" value={form.totalFee} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} /></div>
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v as PaymentStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Pending", "Partial", "Paid"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.leadId || !form.courseSelected}>Create Admission</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Admissions" value={admissions.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard title="Fully Paid" value={paidCount} icon={<UserCheck className="h-5 w-5" />} />
      </div>

      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Course</th>
              <th className="p-4 font-medium">Batch</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Fee</th>
              <th className="p-4 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {admissions.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-4">
                  <p className="font-medium text-card-foreground">{a.studentName}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </td>
                <td className="p-4 text-muted-foreground">{a.courseSelected}</td>
                <td className="p-4 text-muted-foreground">{a.batch}</td>
                <td className="p-4 text-muted-foreground">{a.admissionDate}</td>
                <td className="p-4 font-medium text-card-foreground">₹{a.totalFee.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.paymentStatus === "Paid" ? "bg-success/10 text-success" :
                    a.paymentStatus === "Partial" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.paymentStatus}</span>
                </td>
              </tr>
            ))}
            {admissions.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No admissions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
