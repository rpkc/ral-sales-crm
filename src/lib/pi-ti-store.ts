/**
 * PI ↔ TI mapping store
 * Tracks conversions between Proforma Invoices and Tax Invoices.
 */
export interface PiTiMapping {
  id: string;
  piId: string;
  piNo: string;
  tiId: string;
  tiNo: string;
  studentId: string;
  studentName: string;
  linkedAmount: number;
  conversionDate: string;
  convertedBy: string;
  convertedByName?: string;
  mode: "convert" | "link_existing";
  reason?: string;
}

const KEY = "ral_pi_ti_mappings_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function load(): PiTiMapping[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

let state: PiTiMapping[] = typeof window !== "undefined" ? load() : [];

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach(l => l());
}

export function subscribePiTi(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getPiTiMappings(): PiTiMapping[] { return state; }

export function getMappingsForPi(piId: string) {
  return state.filter(m => m.piId === piId);
}

export function getMappingsForTi(tiId: string) {
  return state.filter(m => m.tiId === tiId);
}

export function recordMapping(input: Omit<PiTiMapping, "id" | "conversionDate">): PiTiMapping {
  const m: PiTiMapping = {
    ...input,
    id: `map_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    conversionDate: new Date().toISOString(),
  };
  state = [m, ...state];
  save();
  return m;
}

export function removeMapping(id: string) {
  state = state.filter(m => m.id !== id);
  save();
}
