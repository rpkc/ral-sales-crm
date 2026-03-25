import { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Partial<Record<LeadStatus, string>> = {
  New: "bg-info/10 text-info",
  "Contact Attempted": "bg-muted text-muted-foreground",
  Contacted: "bg-warning/10 text-warning",
  Connected: "bg-warning/10 text-warning",
  Interested: "bg-primary/10 text-primary",
  "Application Submitted": "bg-primary/10 text-primary",
  "Interview Scheduled": "bg-accent text-accent-foreground",
  "Interview Completed": "bg-accent text-accent-foreground",
  "Follow-up": "bg-accent text-accent-foreground",
  Counseling: "bg-primary/10 text-primary",
  Qualified: "bg-success/10 text-success",
  Admission: "bg-success/20 text-success",
  Lost: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}
