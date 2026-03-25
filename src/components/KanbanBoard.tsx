import { useState, useRef, useCallback } from "react";
import { Lead, LeadStatus, LeadTemperature } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { GripVertical, User, BookOpen, Flame, Zap } from "lucide-react";

/* ─── Stage config ─── */
interface StageConfig {
  status: LeadStatus;
  color: string;
  icon?: React.ReactNode;
}

const DEFAULT_STAGES: StageConfig[] = [
  { status: "New", color: "border-t-info bg-info/5" },
  { status: "Contact Attempted", color: "border-t-muted-foreground bg-muted/30" },
  { status: "Connected", color: "border-t-primary bg-primary/5" },
  { status: "Interested", color: "border-t-warning bg-warning/5" },
  { status: "Application Submitted", color: "border-t-info bg-info/5" },
  { status: "Interview Scheduled", color: "border-t-primary bg-primary/5" },
  { status: "Interview Completed", color: "border-t-primary bg-primary/5" },
  { status: "Counseling", color: "border-t-warning bg-warning/5" },
  { status: "Qualified", color: "border-t-success bg-success/5" },
  { status: "Admission", color: "border-t-success bg-success/5" },
  { status: "Lost", color: "border-t-destructive bg-destructive/5" },
];

/* ─── Temp badge ─── */
function TempIndicator({ temp }: { temp?: LeadTemperature }) {
  if (!temp) return null;
  const cls: Record<string, string> = {
    Hot: "bg-destructive/15 text-destructive",
    Warm: "bg-warning/15 text-warning",
    Cold: "bg-muted text-muted-foreground",
    Dormant: "bg-muted text-muted-foreground/60",
  };
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", cls[temp])}>{temp}</span>;
}

/* ─── Lead Card ─── */
function KanbanCard({
  lead,
  onSelect,
  onDragStart,
}: {
  lead: Lead;
  onSelect: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onSelect(lead)}
      className="group rounded-lg border border-border bg-card p-2.5 cursor-grab active:cursor-grabbing
        hover:shadow-md hover:border-primary/30 transition-all duration-150 select-none"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-card-foreground truncate">{lead.name}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
            <BookOpen className="h-2.5 w-2.5 shrink-0" />
            {lead.interestedCourse || "—"}
          </p>
        </div>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <TempIndicator temp={lead.temperature} />
        {lead.priorityCategory === "High Priority" && (
          <span className="rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />High
          </span>
        )}
        {lead.leadScore > 0 && (
          <span className="text-[9px] text-muted-foreground ml-auto font-medium">{lead.leadScore}pt</span>
        )}
      </div>

      {lead.leadScore > 0 && (
        <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(lead.leadScore, 100)}%`,
              backgroundColor: lead.leadScore >= 80 ? "hsl(var(--success))" : lead.leadScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--primary))",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumn({
  stage,
  leads,
  onSelect,
  onDragStart,
  onDrop,
  isOver,
  onDragOver,
  onDragLeave,
}: {
  stage: StageConfig;
  leads: Lead[];
  onSelect: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (e: React.DragEvent, status: LeadStatus) => void;
  isOver: boolean;
  onDragOver: (e: React.DragEvent, status: LeadStatus) => void;
  onDragLeave: () => void;
}) {
  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[260px] flex-shrink-0 rounded-xl border-t-4 transition-all duration-200",
        stage.color,
        isOver && "ring-2 ring-primary/40 scale-[1.01]"
      )}
      onDragOver={(e) => onDragOver(e, stage.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.status)}
    >
      {/* Column header */}
      <div className="p-3 flex items-center justify-between">
        <span className="text-xs font-bold text-card-foreground uppercase tracking-wider">{stage.status}</span>
        <span className={cn(
          "text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[24px] text-center",
          leads.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onSelect={onSelect} onDragStart={onDragStart} />
        ))}
        {leads.length === 0 && (
          <div className={cn(
            "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
            isOver ? "border-primary/40 bg-primary/5" : "border-border"
          )}>
            <p className="text-[10px] text-muted-foreground">Drop leads here</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Board ─── */
interface KanbanBoardProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onLeadStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  stages?: StageConfig[];
}

export function KanbanBoard({
  leads,
  onLeadSelect,
  onLeadStatusChange,
  stages = DEFAULT_STAGES,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<LeadStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverStatus(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setOverStatus(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId && draggedLeadId) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        onLeadStatusChange(leadId, newStatus);
      }
    }
    setDraggedLeadId(null);
    setOverStatus(null);
  }, [draggedLeadId, leads, onLeadStatusChange]);

  // Restore opacity on drag end (fires on source element)
  const handleGlobalDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setOverStatus(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Summary ribbon */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((stage) => {
          const count = leads.filter((l) => l.status === stage.status).length;
          return (
            <button
              key={stage.status}
              onClick={() => {
                const el = document.getElementById(`kanban-col-${stage.status}`);
                el?.scrollIntoView({ behavior: "smooth", inline: "center" });
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors border",
                count > 0 ? "bg-card border-border text-card-foreground hover:border-primary/30" : "bg-muted/50 border-transparent text-muted-foreground"
              )}
            >
              {stage.status} <span className="ml-1 text-primary">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Board */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 snap-x"
        onDragEnd={handleGlobalDragEnd}
      >
        {stages.map((stage) => {
          const stageLeads = leads
            .filter((l) => l.status === stage.status)
            .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));

          return (
            <div key={stage.status} id={`kanban-col-${stage.status}`} className="snap-start">
              <KanbanColumn
                stage={stage}
                leads={stageLeads}
                onSelect={onLeadSelect}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                isOver={overStatus === stage.status}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
