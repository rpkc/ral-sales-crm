import { store } from "@/lib/mock-data";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Megaphone, Users, UserPlus, TrendingUp, Activity } from "lucide-react";

export default function Dashboard() {
  const campaigns = store.getCampaigns();
  const leads = store.getLeads();
  const admissions = store.getAdmissions();

  const today = new Date().toISOString().split("T")[0];
  const leadsToday = leads.filter((l) => l.createdAt === today).length;
  const conversionRate = leads.length > 0 ? ((admissions.length / leads.length) * 100).toFixed(1) : "0";

  const recentLeads = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your CRM pipeline</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Campaigns" value={campaigns.length} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard title="Total Leads" value={leads.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Leads Today" value={leadsToday} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard title="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {/* Pipeline summary */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Lead Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(["New", "Contacted", "Follow-up", "Counseling", "Qualified", "Admission", "Lost"] as const).map((status) => {
            const count = leads.filter((l) => l.status === status).length;
            return (
              <div key={status} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">{status}</p>
                <p className="mt-1 text-xl font-bold text-card-foreground">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent leads */}
      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">Recent Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Course</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0">
                  <td className="py-3 font-medium text-card-foreground">{lead.name}</td>
                  <td className="py-3 text-muted-foreground">{lead.interestedCourse}</td>
                  <td className="py-3"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 text-muted-foreground">{lead.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
