export type UserRole = "admin" | "marketing_manager" | "telecaller" | "counselor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type CampaignPlatform = "Meta" | "Google" | "LinkedIn" | "Other";

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  budget: number;
  startDate: string;
  endDate: string;
  leadsGenerated: number;
  costPerLead: number;
  createdAt: string;
}

export type LeadStatus = "New" | "Contacted" | "Follow-up" | "Counseling" | "Qualified" | "Admission" | "Lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  campaignId: string;
  interestedCourse: string;
  assignedTelecallerId: string;
  status: LeadStatus;
  createdAt: string;
}

export type CallOutcome = "Connected" | "Not answered" | "Interested" | "Not interested" | "Call later";

export interface CallLog {
  id: string;
  leadId: string;
  telecallerId: string;
  outcome: CallOutcome;
  notes: string;
  nextFollowUp: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  assignedTo: string;
  date: string;
  notes: string;
  completed: boolean;
  createdAt: string;
}

export type PaymentStatus = "Pending" | "Partial" | "Paid";

export interface Admission {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string;
  courseSelected: string;
  batch: string;
  admissionDate: string;
  totalFee: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}
