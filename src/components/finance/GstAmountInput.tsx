import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GST_SLABS, GstInputMode, computeBreakup, detectIntraState, type GstBreakup } from "@/lib/gst-calc";
import { fmtINR } from "./FinanceKpi";

interface Props {
  amount: number;
  rate: number;
  mode: GstInputMode;
  intraState: boolean;
  intraOverridden: boolean;
  gstin?: string;
  canEditRate?: boolean;
  onAmountChange: (n: number) => void;
  onRateChange: (n: number) => void;
  onModeChange: (m: GstInputMode) => void;
  onIntraStateChange: (intra: boolean, manual: boolean) => void;
}

/** Reusable GST-inclusive / exclusive amount input with live breakup */
export function GstAmountInput({
  amount, rate, mode, intraState, intraOverridden, gstin, canEditRate = true,
  onAmountChange, onRateChange, onModeChange, onIntraStateChange,
}: Props) {
  const breakup = computeBreakup(amount, rate, mode, intraState);
  const autoIntra = detectIntraState(gstin);
  const showAutoHint = !!gstin && !intraOverridden;

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as GstInputMode)}>
        <TabsList className="grid grid-cols-2 h-8">
          <TabsTrigger value="gross_inclusive" className="text-xs">Gross (GST included)</TabsTrigger>
          <TabsTrigger value="net_exclusive" className="text-xs">Net (Add GST)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{mode === "gross_inclusive" ? "Total Fee (GST Included)" : "Course Fee (Before GST)"}</Label>
          <Input
            type="number" min={0} value={amount || ""}
            onChange={(e) => onAmountChange(+e.target.value)}
            placeholder="0"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {mode === "gross_inclusive" ? "Enter total fee inclusive of GST." : "Enter taxable value, GST will be added."}
          </p>
        </div>
        <div>
          <Label>GST %</Label>
          <Select value={String(rate)} onValueChange={(v) => onRateChange(+v)} disabled={!canEditRate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GST_SLABS.map(s => <SelectItem key={s} value={String(s)}>{s}%</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">Select applicable GST slab.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Tabs value={intraState ? "intra" : "inter"} onValueChange={(v) => onIntraStateChange(v === "intra", true)}>
          <TabsList className="h-7">
            <TabsTrigger value="intra" className="text-[11px]">Intra-state (CGST + SGST)</TabsTrigger>
            <TabsTrigger value="inter" className="text-[11px]">Inter-state (IGST)</TabsTrigger>
          </TabsList>
        </Tabs>
        {showAutoHint && (
          <Badge variant="outline" className="text-[10px]">
            Auto from GSTIN: {autoIntra ? "Intra" : "Inter"}
          </Badge>
        )}
      </div>

      <BreakupPanel breakup={breakup} />
    </div>
  );
}

export function BreakupPanel({ breakup }: { breakup: GstBreakup }) {
  return (
    <Card className="p-3 bg-muted/30 text-xs space-y-1">
      <div className="flex justify-between"><span>Course Fee (Taxable Value)</span><span className="tabular-nums">{fmtINR(breakup.taxable)}</span></div>
      {breakup.intraState ? (
        <>
          <div className="flex justify-between text-muted-foreground"><span>CGST ({(breakup.rate / 2).toFixed(1)}%)</span><span className="tabular-nums">{fmtINR(breakup.cgst)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>SGST ({(breakup.rate / 2).toFixed(1)}%)</span><span className="tabular-nums">{fmtINR(breakup.sgst)}</span></div>
        </>
      ) : (
        <div className="flex justify-between text-muted-foreground"><span>IGST ({breakup.rate}%)</span><span className="tabular-nums">{fmtINR(breakup.igst)}</span></div>
      )}
      <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border"><span>Grand Total</span><span className="tabular-nums">{fmtINR(breakup.gross)}</span></div>
    </Card>
  );
}
