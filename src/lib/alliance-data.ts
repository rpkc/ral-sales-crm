/**
 * Industry Alliances Module — Mock Data + Store (localStorage)
 */
import type {
  AllianceUser, Institution, AllianceContact, AllianceVisit, AllianceTask,
  AllianceProposal, AllianceEvent, AllianceExpense,
} from "./alliance-types";
import { computePriority } from "./alliance-types";

const today = new Date();
const iso = (offsetDays = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

// ── DEMO USERS (separate from main CRM users) ──
export const allianceUsers: AllianceUser[] = [
  { id: "am1", name: "Rohit Banerjee", email: "rohit@redapple.com", password: "alliance123", role: "alliance_manager", status: "active", createdAt: iso(-90) },
  { id: "ae1", name: "Sneha Roy", email: "sneha@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-60) },
  { id: "ae2", name: "Karan Mehta", email: "karan@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-45) },
  { id: "ae3", name: "Pooja Nair", email: "pooja@redapple.com", password: "alliance123", role: "alliance_executive", status: "active", createdAt: iso(-30) },
];

// ── INSTITUTIONS ──
const rawInstitutions: Omit<Institution, "priorityScore" | "priority">[] = [
  { id: "inst1", institutionId: "INS-0001", name: "Delhi Public School Kolkata", type: "School", boardUniversity: "CBSE", district: "Kolkata", city: "Kolkata", address: "Ruby Park, Kolkata", studentStrength: 2400, decisionMaker: "Mrs. Anita Sharma", phone: "9830012345", email: "principal@dpskolkata.edu.in", assignedTo: "ae1", pipelineStage: "MoU Signed", notes: "Annual workshop signed.", createdAt: iso(-50) },
  { id: "inst2", institutionId: "INS-0002", name: "St. Xavier's College", type: "College", boardUniversity: "Autonomous", district: "Kolkata", city: "Kolkata", address: "30 Park Street", studentStrength: 4500, decisionMaker: "Fr. Dominic", phone: "9830023456", email: "principal@sxccal.edu", assignedTo: "ae1", pipelineStage: "Negotiation", notes: "Discussing internship pipeline.", createdAt: iso(-40) },
  { id: "inst3", institutionId: "INS-0003", name: "Heritage Institute of Technology", type: "College", boardUniversity: "AICTE", district: "Kolkata", city: "Kolkata", address: "Anandapur", studentStrength: 3200, decisionMaker: "Dr. Basab Choudhuri", phone: "9830034567", email: "dean@heritageit.edu", assignedTo: "ae2", pipelineStage: "Proposal Shared", notes: "Proposal for AI/ML training shared.", createdAt: iso(-35) },
  { id: "inst4", institutionId: "INS-0004", name: "La Martiniere for Boys", type: "School", boardUniversity: "ICSE", district: "Kolkata", city: "Kolkata", address: "11 Loudon Street", studentStrength: 1800, decisionMaker: "Mr. Sebastian Cordeiro", phone: "9830045678", email: "principal@lamartiniere.edu", assignedTo: "ae2", pipelineStage: "Meeting Done", notes: "Interested in Future Tech Foundation.", createdAt: iso(-28) },
  { id: "inst5", institutionId: "INS-0005", name: "Techno India University", type: "University", boardUniversity: "UGC", district: "Kolkata", city: "Kolkata", address: "EM 4, Salt Lake", studentStrength: 5500, decisionMaker: "Prof. Goutam Roy Chowdhury", phone: "9830056789", email: "registrar@tiu.edu.in", assignedTo: "ae3", pipelineStage: "Meeting Scheduled", notes: "Meeting on " + iso(3), createdAt: iso(-20) },
  { id: "inst6", institutionId: "INS-0006", name: "Modern High School for Girls", type: "School", boardUniversity: "ICSE", district: "Kolkata", city: "Kolkata", address: "78 Syed Amir Ali Avenue", studentStrength: 1600, decisionMaker: "Mrs. Damayanti Mukherjee", phone: "9830067890", email: "principal@mhsg.edu.in", assignedTo: "ae1", pipelineStage: "Contacted", notes: "Awaiting callback.", createdAt: iso(-15) },
  { id: "inst7", institutionId: "INS-0007", name: "Jadavpur University", type: "University", boardUniversity: "UGC", district: "Kolkata", city: "Kolkata", address: "188 Raja S.C. Mallick Rd", studentStrength: 12000, decisionMaker: "Prof. Suranjan Das", phone: "9830078901", email: "vc@jadavpuruniversity.in", assignedTo: "ae3", pipelineStage: "Identified", notes: "Initial outreach pending.", createdAt: iso(-10) },
  { id: "inst8", institutionId: "INS-0008", name: "Birla High School", type: "School", boardUniversity: "ICSE", district: "Kolkata", city: "Kolkata", address: "Moira Street", studentStrength: 2200, decisionMaker: "Mr. Loveleen Saigal", phone: "9830089012", email: "principal@birlahighschool.com", assignedTo: "ae2", pipelineStage: "Program Launched", notes: "Creative Coding launched for Class 7-9.", createdAt: iso(-70) },
  { id: "inst9", institutionId: "INS-0009", name: "South Point High School", type: "School", boardUniversity: "ICSE", district: "Kolkata", city: "Kolkata", address: "82/7A Mandeville Gardens", studentStrength: 13500, decisionMaker: "Mrs. Krishna Damani", phone: "9830090123", email: "info@southpoint.edu.in", assignedTo: "ae1", pipelineStage: "Proposal Shared", notes: "Large school — high priority.", createdAt: iso(-22) },
  { id: "inst10", institutionId: "INS-0010", name: "Asansol Engineering College", type: "College", boardUniversity: "AICTE", district: "Paschim Bardhaman", city: "Asansol", address: "Vivekananda Sarani", studentStrength: 1400, decisionMaker: "Dr. Subir Kumar Sarkar", phone: "9831001234", email: "principal@aecwb.edu.in", assignedTo: "ae3", pipelineStage: "Lost", notes: "Budget mismatch.", createdAt: iso(-55) },
];

export const allianceInstitutions: Institution[] = rawInstitutions.map((r) => {
  const { score, bucket } = computePriority(r.studentStrength);
  return { ...r, priorityScore: score, priority: bucket };
});

// ── CONTACTS ──
export const allianceContacts: AllianceContact[] = [
  { id: "cn1", institutionId: "inst1", name: "Anita Sharma", designation: "Principal", phone: "9830012345", email: "principal@dpskolkata.edu.in", notes: "Primary decision maker." },
  { id: "cn2", institutionId: "inst1", name: "Ravi Kapoor", designation: "Vice Principal", phone: "9830012346", email: "vp@dpskolkata.edu.in", notes: "Handles co-curricular." },
  { id: "cn3", institutionId: "inst2", name: "Fr. Dominic", designation: "Principal", phone: "9830023456", email: "principal@sxccal.edu", notes: "" },
  { id: "cn4", institutionId: "inst3", name: "Dr. Basab Choudhuri", designation: "Dean Academics", phone: "9830034567", email: "dean@heritageit.edu", notes: "Tech focus." },
  { id: "cn5", institutionId: "inst5", name: "Prof. Goutam Roy Chowdhury", designation: "Chancellor", phone: "9830056789", email: "chancellor@tiu.edu.in", notes: "" },
  { id: "cn6", institutionId: "inst9", name: "Krishna Damani", designation: "Director", phone: "9830090123", email: "director@southpoint.edu.in", notes: "Final approver." },
];

// ── VISITS ──
export const allianceVisits: AllianceVisit[] = [
  { id: "v1", institutionId: "inst1", executiveId: "ae1", visitDate: iso(-12), meetingPerson: "Anita Sharma", summary: "MoU finalised; signing ceremony scheduled.", interestLevel: "Hot", nextFollowup: iso(2), status: "Completed", photoUrl: "", createdAt: iso(-12) },
  { id: "v2", institutionId: "inst2", executiveId: "ae1", visitDate: iso(-8), meetingPerson: "Fr. Dominic", summary: "Discussed internship credit framework.", interestLevel: "Warm", nextFollowup: iso(5), status: "Completed", photoUrl: "", createdAt: iso(-8) },
  { id: "v3", institutionId: "inst3", executiveId: "ae2", visitDate: iso(-6), meetingPerson: "Dr. Basab", summary: "Walked through AI/ML curriculum.", interestLevel: "Hot", nextFollowup: iso(4), status: "Completed", photoUrl: "", createdAt: iso(-6) },
  { id: "v4", institutionId: "inst4", executiveId: "ae2", visitDate: iso(-4), meetingPerson: "Mr. Cordeiro", summary: "Interested but needs board approval.", interestLevel: "Warm", nextFollowup: iso(10), status: "Completed", photoUrl: "", createdAt: iso(-4) },
  { id: "v5", institutionId: "inst5", executiveId: "ae3", visitDate: iso(3), meetingPerson: "Prof. Roy Chowdhury", summary: "Upcoming meeting.", interestLevel: "Warm", nextFollowup: iso(10), status: "Planned", photoUrl: "", createdAt: iso(-1) },
  { id: "v6", institutionId: "inst9", executiveId: "ae1", visitDate: iso(-2), meetingPerson: "Krishna Damani", summary: "Proposal walkthrough; awaiting feedback.", interestLevel: "Hot", nextFollowup: iso(3), status: "Completed", photoUrl: "", createdAt: iso(-2) },
  { id: "v7", institutionId: "inst8", executiveId: "ae2", visitDate: iso(-25), meetingPerson: "Loveleen Saigal", summary: "Program launched successfully.", interestLevel: "Hot", nextFollowup: iso(30), status: "Completed", photoUrl: "", createdAt: iso(-25) },
  { id: "v8", institutionId: "inst6", executiveId: "ae1", visitDate: iso(1), meetingPerson: "Damayanti Mukherjee", summary: "Intro meeting tomorrow.", interestLevel: "Warm", nextFollowup: iso(7), status: "Planned", photoUrl: "", createdAt: iso(-1) },
];

// ── TASKS ──
export const allianceTasks: AllianceTask[] = [
  { id: "tk1", title: "Send MoU draft to DPS", institutionId: "inst1", assignedTo: "ae1", dueDate: iso(2), status: "In Progress", priority: "High", createdAt: iso(-3) },
  { id: "tk2", title: "Follow up on internship proposal", institutionId: "inst2", assignedTo: "ae1", dueDate: iso(-1), status: "Overdue", priority: "Urgent", createdAt: iso(-7) },
  { id: "tk3", title: "Share AI/ML curriculum deck", institutionId: "inst3", assignedTo: "ae2", dueDate: iso(1), status: "Pending", priority: "High", createdAt: iso(-2) },
  { id: "tk4", title: "Coordinate board meeting slot", institutionId: "inst4", assignedTo: "ae2", dueDate: iso(5), status: "Pending", priority: "Medium", createdAt: iso(-1) },
  { id: "tk5", title: "Confirm visit logistics (TIU)", institutionId: "inst5", assignedTo: "ae3", dueDate: iso(2), status: "Pending", priority: "High", createdAt: iso(-1) },
  { id: "tk6", title: "Quarterly review with Birla", institutionId: "inst8", assignedTo: "ae2", dueDate: iso(15), status: "Pending", priority: "Low", createdAt: iso(-1) },
  { id: "tk7", title: "Cold call Modern High", institutionId: "inst6", assignedTo: "ae1", dueDate: iso(-2), status: "Overdue", priority: "Medium", createdAt: iso(-9) },
  { id: "tk8", title: "Prepare proposal — South Point", institutionId: "inst9", assignedTo: "ae1", dueDate: iso(0), status: "In Progress", priority: "Urgent", createdAt: iso(-3) },
];

// ── PROPOSALS ──
export const allianceProposals: AllianceProposal[] = [
  { id: "pr1", institutionId: "inst1", proposalType: "MoU", amount: 250000, status: "Approved", sentDate: iso(-20), approvedBy: "am1", notes: "Annual workshop programme." },
  { id: "pr2", institutionId: "inst2", proposalType: "Internship Proposal", amount: 180000, status: "Under Review", sentDate: iso(-10), notes: "200-student batch." },
  { id: "pr3", institutionId: "inst3", proposalType: "Training Proposal", amount: 320000, status: "Sent", sentDate: iso(-7), notes: "AI/ML 6-month programme." },
  { id: "pr4", institutionId: "inst9", proposalType: "Workshop Proposal", amount: 95000, status: "Sent", sentDate: iso(-3), notes: "Creative Coding workshop." },
  { id: "pr5", institutionId: "inst8", proposalType: "MoU", amount: 200000, status: "Approved", sentDate: iso(-65), approvedBy: "am1", notes: "Launched successfully." },
  { id: "pr6", institutionId: "inst10", proposalType: "Training Proposal", amount: 150000, status: "Rejected", sentDate: iso(-50), notes: "Budget mismatch." },
];

// ── EVENTS ──
export const allianceEvents: AllianceEvent[] = [
  { id: "ev1", institutionId: "inst1", eventName: "Tech Career Day 2026", eventType: "Career Fair", eventDate: iso(-15), attendees: 320, leadsGenerated: 48, notes: "Strong engagement." },
  { id: "ev2", institutionId: "inst3", eventName: "AI Workshop", eventType: "Workshop", eventDate: iso(-8), attendees: 120, leadsGenerated: 22, notes: "" },
  { id: "ev3", institutionId: "inst8", eventName: "Creative Coding Demo", eventType: "Demo Session", eventDate: iso(-30), attendees: 90, leadsGenerated: 18, notes: "" },
  { id: "ev4", institutionId: "inst5", eventName: "Open Day TIU", eventType: "Open Day", eventDate: iso(7), attendees: 0, leadsGenerated: 0, notes: "Upcoming." },
];

// ── EXPENSES ──
export const allianceExpenses: AllianceExpense[] = [
  { id: "ex1", executiveId: "ae1", institutionId: "inst1", expenseType: "Travel", amount: 850, billUrl: "", expenseDate: iso(-12), status: "Approved", notes: "Cab to DPS." },
  { id: "ex2", executiveId: "ae1", institutionId: "inst2", expenseType: "Meals", amount: 420, billUrl: "", expenseDate: iso(-8), status: "Reimbursed", notes: "" },
  { id: "ex3", executiveId: "ae2", institutionId: "inst3", expenseType: "Print Material", amount: 1200, billUrl: "", expenseDate: iso(-6), status: "Submitted", notes: "Brochures." },
  { id: "ex4", executiveId: "ae3", institutionId: "inst5", expenseType: "Travel", amount: 1500, billUrl: "", expenseDate: iso(-1), status: "Submitted", notes: "Long-distance fuel." },
  { id: "ex5", executiveId: "ae2", institutionId: "inst8", expenseType: "Gifts", amount: 2200, billUrl: "", expenseDate: iso(-25), status: "Approved", notes: "Token of appreciation." },
];

// ── STORAGE ──
const KEYS = {
  institutions: "alliance_institutions",
  contacts: "alliance_contacts",
  visits: "alliance_visits",
  tasks: "alliance_tasks",
  proposals: "alliance_proposals",
  events: "alliance_events",
  expenses: "alliance_expenses",
} as const;

function load<T>(key: string, defaults: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallthrough */ }
  }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}
function persist<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const allianceStore = {
  // Institutions
  getInstitutions: () => load(KEYS.institutions, allianceInstitutions),
  saveInstitutions: (d: Institution[]) => persist(KEYS.institutions, d),
  // Contacts
  getContacts: () => load(KEYS.contacts, allianceContacts),
  saveContacts: (d: AllianceContact[]) => persist(KEYS.contacts, d),
  // Visits
  getVisits: () => load(KEYS.visits, allianceVisits),
  saveVisits: (d: AllianceVisit[]) => persist(KEYS.visits, d),
  // Tasks (recompute Overdue on read)
  getTasks: (): AllianceTask[] => {
    const data = load(KEYS.tasks, allianceTasks);
    const todayStr = new Date().toISOString().split("T")[0];
    return data.map((t) => (t.status !== "Done" && t.dueDate < todayStr ? { ...t, status: "Overdue" as const } : t));
  },
  saveTasks: (d: AllianceTask[]) => persist(KEYS.tasks, d),
  // Proposals
  getProposals: () => load(KEYS.proposals, allianceProposals),
  saveProposals: (d: AllianceProposal[]) => persist(KEYS.proposals, d),
  // Events
  getEvents: () => load(KEYS.events, allianceEvents),
  saveEvents: (d: AllianceEvent[]) => persist(KEYS.events, d),
  // Expenses
  getExpenses: () => load(KEYS.expenses, allianceExpenses),
  saveExpenses: (d: AllianceExpense[]) => persist(KEYS.expenses, d),
  // Users
  getUsers: () => allianceUsers,
  // Reset
  resetAll: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};

// CSV export utility
export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
