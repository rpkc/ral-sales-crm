import { Campaign, Lead, CallLog, FollowUp, Admission, User } from "./types";

export const mockUsers: User[] = [
  { id: "u1", name: "Amit Sharma", email: "amit@redapple.com", role: "admin" },
  { id: "u2", name: "Priya Mehta", email: "priya@redapple.com", role: "marketing_manager" },
  { id: "u3", name: "Rahul Verma", email: "rahul@redapple.com", role: "telecaller" },
  { id: "u4", name: "Sneha Patel", email: "sneha@redapple.com", role: "telecaller" },
  { id: "u5", name: "Neha Gupta", email: "neha@redapple.com", role: "counselor" },
];

export const mockCampaigns: Campaign[] = [
  { id: "c1", name: "Summer Coding Bootcamp", platform: "Meta", budget: 50000, startDate: "2026-03-01", endDate: "2026-03-31", leadsGenerated: 120, costPerLead: 417, createdAt: "2026-03-01" },
  { id: "c2", name: "Data Science Workshop", platform: "Google", budget: 35000, startDate: "2026-03-10", endDate: "2026-04-10", leadsGenerated: 85, costPerLead: 412, createdAt: "2026-03-10" },
  { id: "c3", name: "MBA Admissions 2026", platform: "LinkedIn", budget: 75000, startDate: "2026-02-15", endDate: "2026-04-15", leadsGenerated: 200, costPerLead: 375, createdAt: "2026-02-15" },
  { id: "c4", name: "Digital Marketing Course", platform: "Meta", budget: 25000, startDate: "2026-03-20", endDate: "2026-04-20", leadsGenerated: 60, costPerLead: 417, createdAt: "2026-03-20" },
];

export const mockLeads: Lead[] = [
  { id: "l1", name: "Aarav Kumar", phone: "9876543210", email: "aarav@email.com", source: "Meta Ad", campaignId: "c1", interestedCourse: "Full Stack Development", assignedTelecallerId: "u3", status: "New", createdAt: "2026-03-24" },
  { id: "l2", name: "Diya Singh", phone: "9876543211", email: "diya@email.com", source: "Google Ad", campaignId: "c2", interestedCourse: "Data Science", assignedTelecallerId: "u3", status: "Contacted", createdAt: "2026-03-23" },
  { id: "l3", name: "Vihaan Reddy", phone: "9876543212", email: "vihaan@email.com", source: "LinkedIn", campaignId: "c3", interestedCourse: "MBA", assignedTelecallerId: "u4", status: "Follow-up", createdAt: "2026-03-22" },
  { id: "l4", name: "Ananya Joshi", phone: "9876543213", email: "ananya@email.com", source: "Meta Ad", campaignId: "c1", interestedCourse: "Full Stack Development", assignedTelecallerId: "u4", status: "Counseling", createdAt: "2026-03-21" },
  { id: "l5", name: "Arjun Nair", phone: "9876543214", email: "arjun@email.com", source: "Google Ad", campaignId: "c2", interestedCourse: "Data Science", assignedTelecallerId: "u3", status: "Qualified", createdAt: "2026-03-20" },
  { id: "l6", name: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com", source: "LinkedIn", campaignId: "c3", interestedCourse: "MBA", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-19" },
  { id: "l7", name: "Rohan Das", phone: "9876543216", email: "rohan@email.com", source: "Meta Ad", campaignId: "c4", interestedCourse: "Digital Marketing", assignedTelecallerId: "u3", status: "Lost", createdAt: "2026-03-18" },
  { id: "l8", name: "Kavya Iyer", phone: "9876543217", email: "kavya@email.com", source: "Walk-in", campaignId: "c1", interestedCourse: "Full Stack Development", assignedTelecallerId: "u4", status: "New", createdAt: "2026-03-25" },
];

export const mockCallLogs: CallLog[] = [
  { id: "cl1", leadId: "l1", telecallerId: "u3", outcome: "Connected", notes: "Interested in weekend batch", nextFollowUp: "2026-03-26", createdAt: "2026-03-24" },
  { id: "cl2", leadId: "l2", telecallerId: "u3", outcome: "Interested", notes: "Wants to know about placement support", nextFollowUp: "2026-03-27", createdAt: "2026-03-23" },
  { id: "cl3", leadId: "l3", telecallerId: "u4", outcome: "Call later", notes: "Busy, asked to call after 5 PM", nextFollowUp: "2026-03-25", createdAt: "2026-03-22" },
  { id: "cl4", leadId: "l7", telecallerId: "u3", outcome: "Not interested", notes: "Found another institute", nextFollowUp: "", createdAt: "2026-03-20" },
];

export const mockFollowUps: FollowUp[] = [
  { id: "f1", leadId: "l1", assignedTo: "u3", date: "2026-03-26", notes: "Call about weekend batch availability", completed: false, createdAt: "2026-03-24" },
  { id: "f2", leadId: "l2", assignedTo: "u3", date: "2026-03-27", notes: "Share placement brochure", completed: false, createdAt: "2026-03-23" },
  { id: "f3", leadId: "l3", assignedTo: "u4", date: "2026-03-25", notes: "Call after 5 PM", completed: false, createdAt: "2026-03-22" },
  { id: "f4", leadId: "l4", assignedTo: "u5", date: "2026-03-24", notes: "Counseling session scheduled", completed: true, createdAt: "2026-03-21" },
];

export const mockAdmissions: Admission[] = [
  { id: "a1", leadId: "l6", studentName: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com", courseSelected: "MBA", batch: "MBA-2026-A", admissionDate: "2026-03-20", totalFee: 250000, paymentStatus: "Partial", createdAt: "2026-03-20" },
];

// localStorage helpers
const STORAGE_KEYS = {
  campaigns: "crm_campaigns",
  leads: "crm_leads",
  callLogs: "crm_call_logs",
  followUps: "crm_follow_ups",
  admissions: "crm_admissions",
} as const;

function getOrInit<T>(key: string, defaults: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getCampaigns: () => getOrInit(STORAGE_KEYS.campaigns, mockCampaigns),
  saveCampaigns: (d: Campaign[]) => save(STORAGE_KEYS.campaigns, d),

  getLeads: () => getOrInit(STORAGE_KEYS.leads, mockLeads),
  saveLeads: (d: Lead[]) => save(STORAGE_KEYS.leads, d),

  getCallLogs: () => getOrInit(STORAGE_KEYS.callLogs, mockCallLogs),
  saveCallLogs: (d: CallLog[]) => save(STORAGE_KEYS.callLogs, d),

  getFollowUps: () => getOrInit(STORAGE_KEYS.followUps, mockFollowUps),
  saveFollowUps: (d: FollowUp[]) => save(STORAGE_KEYS.followUps, d),

  getAdmissions: () => getOrInit(STORAGE_KEYS.admissions, mockAdmissions),
  saveAdmissions: (d: Admission[]) => save(STORAGE_KEYS.admissions, d),

  getUsers: () => mockUsers,
};
