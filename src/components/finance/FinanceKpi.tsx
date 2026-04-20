import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: number;          // +/- percent
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  icon?: ReactNode;
  onClick?: () => void;
}

const toneClass: Record<NonNullable<KpiProps["tone"]>, string> = {
  default: "border-border",
  success: "border-l-4 border-l-emerald-500",
  warning: "border-l-4 border-l-amber-500",
  destructive: "border-l-4 border-l-destructive",
  primary: "border-l-4 border-l-primary",
};

export function FinanceKpi({ label, value, hint, trend, tone = "default", icon, onClick }: KpiProps) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 bg-card transition-all",
        toneClass[tone],
        clickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
        </div>
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
      </div>
      {typeof trend === "number" && (
        <div className={cn("flex items-center gap-1 text-xs mt-2 font-medium", trend >= 0 ? "text-emerald-600" : "text-destructive")}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </Card>
  );
}

export const fmtINR = (n: number) =>
  "₹" + (n >= 10000000
    ? (n / 10000000).toFixed(2) + " Cr"
    : n >= 100000
      ? (n / 100000).toFixed(2) + " L"
      : n.toLocaleString("en-IN"));

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

export function StatusPill({ status, tone }: { status: string; tone?: "success" | "warning" | "destructive" | "muted" | "primary" }) {
  const map = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    destructive: "bg-red-50 text-red-700 border-red-200",
    muted: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/20",
  } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", map[tone || "muted"])}>
      {status}
    </span>
  );
}

export function statusTone(status: string): "success" | "warning" | "destructive" | "muted" | "primary" {
  const s = status.toLowerCase();
  if (["paid", "approved", "received"].includes(s)) return "success";
  if (["pending", "partial", "draft", "sent", "due", "upcoming", "hold"].includes(s)) return "warning";
  if (["overdue", "rejected", "cancelled"].includes(s)) return "destructive";
  return "primary";
}
