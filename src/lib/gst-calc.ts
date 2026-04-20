/**
 * GST Inclusive / Exclusive Calculator
 * Reverse-calc: gross → taxable + GST
 * Forward-calc: taxable → gross
 * + place-of-supply detection (GSTIN state code vs Red Apple home state = WB / 19)
 */

export type GstSlab = 0 | 5 | 12 | 18 | 28;
export const GST_SLABS: GstSlab[] = [0, 5, 12, 18, 28];

export type GstInputMode = "gross_inclusive" | "net_exclusive";

export const HOME_STATE_CODE = "19"; // West Bengal — Red Apple Learning home state

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface GstBreakup {
  taxable: number;
  gstAmount: number;
  gross: number;
  cgst: number;
  sgst: number;
  igst: number;
  rate: number;
  intraState: boolean;
}

/** Reverse-calc from gross (GST inclusive) */
export function fromGross(gross: number, rate: number, intraState: boolean): GstBreakup {
  const safeGross = Number.isFinite(gross) && gross > 0 ? gross : 0;
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
  const taxable = safeRate === 0 ? safeGross : safeGross / (1 + safeRate / 100);
  const gstAmount = safeGross - taxable;
  return splitTax(round2(taxable), round2(gstAmount), safeRate, intraState, round2(safeGross));
}

/** Forward-calc from taxable (GST exclusive) */
export function fromNet(net: number, rate: number, intraState: boolean): GstBreakup {
  const safeNet = Number.isFinite(net) && net > 0 ? net : 0;
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
  const gstAmount = safeNet * safeRate / 100;
  const gross = safeNet + gstAmount;
  return splitTax(round2(safeNet), round2(gstAmount), safeRate, intraState, round2(gross));
}

function splitTax(taxable: number, gstAmount: number, rate: number, intraState: boolean, gross: number): GstBreakup {
  if (intraState) {
    const half = round2(gstAmount / 2);
    return { taxable, gstAmount, gross, cgst: half, sgst: round2(gstAmount - half), igst: 0, rate, intraState };
  }
  return { taxable, gstAmount, gross, cgst: 0, sgst: 0, igst: gstAmount, rate, intraState };
}

/** Detect intra-state from GSTIN (first 2 digits = state code). Defaults to true (intra) when GSTIN missing. */
export function detectIntraState(gstin?: string): boolean {
  if (!gstin || gstin.trim().length < 2) return true;
  const code = gstin.trim().slice(0, 2);
  return code === HOME_STATE_CODE;
}

/** Compute breakup with a single entry point covering both modes */
export function computeBreakup(
  amount: number,
  rate: number,
  mode: GstInputMode,
  intraState: boolean,
): GstBreakup {
  return mode === "gross_inclusive" ? fromGross(amount, rate, intraState) : fromNet(amount, rate, intraState);
}

/** Validation */
export interface GstValidation { ok: boolean; error?: string }
export function validateGstInput(amount: number, rate: number): GstValidation {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Please enter a valid total fee." };
  if (amount > 10000000) return { ok: false, error: "Amount exceeds ₹1 crore limit." };
  if (!Number.isFinite(rate) || rate < 0) return { ok: false, error: "Select GST percentage." };
  if (!GST_SLABS.includes(rate as GstSlab)) return { ok: false, error: "GST slab must be 0, 5, 12, 18 or 28." };
  return { ok: true };
}
