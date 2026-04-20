/**
 * Industry Alliances Module — Types
 * Closed-ended dropdown values defined as const arrays for analytics integrity.
 */

export const INSTITUTION_TYPES = ["School", "College", "University", "Coaching Institute", "Training Center"] as const;
export const BOARD_UNIVERSITIES = ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Cambridge", "AICTE", "UGC", "Autonomous", "Deemed University"] as const;
export const PIPELINE_STAGES = ["Identified", "Contacted", "Meeting Scheduled", "Meeting Done", "Proposal Shared", "Negotiation", "MoU Signed", "Program Launched", "Lost"] as const;
export const PRIORITY_BUCKETS = ["High", "Medium", "Low"] as const;
export const VISIT_INTEREST_LEVELS = ["Hot", "Warm", "Cold", "Not Interested"] as const;
export const VISIT_STATUSES = ["Planned", "Completed", "Cancelled", "No Show"] as const;
export const TASK_STATUSES = ["Pending", "In Progress", "Done", "Overdue"] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const PROPOSAL_TYPES = ["MoU", "Workshop Proposal", "Internship Proposal", "Training Proposal", "Custom Program"] as const;
export const PROPOSAL_STATUSES = ["Draft", "Sent", "Under Review", "Approved", "Rejected"] as const;
export const EVENT_TYPES = ["Seminar", "Workshop", "Career Fair", "Open Day", "Demo Session", "Sponsorship"] as const;
export const EXPENSE_TYPES = ["Travel", "Meals", "Print Material", "Gifts", "Accommodation", "Misc"] as const;
export const EXPENSE_STATUSES = ["Submitted", "Approved", "Rejected", "Reimbursed"] as const;

export type InstitutionType = typeof INSTITUTION_TYPES[number];
export type BoardUniversity = typeof BOARD_UNIVERSITIES[number];
export type AlliancePipelineStage = typeof PIPELINE_STAGES[number];
export type PriorityBucket = typeof PRIORITY_BUCKETS[number];
export type VisitInterestLevel = typeof VISIT_INTEREST_LEVELS[number];
export type VisitStatus = typeof VISIT_STATUSES[number];
export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type ProposalType = typeof PROPOSAL_TYPES[number];
export type ProposalStatus = typeof PROPOSAL_STATUSES[number];
export type EventType = typeof EVENT_TYPES[number];
export type ExpenseType = typeof EXPENSE_TYPES[number];
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

export type AllianceRole = "alliance_manager" | "alliance_executive";

export interface AllianceUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AllianceRole;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Institution {
  id: string;
  institutionId: string; // human-readable code e.g. INS-0001
  name: string;
  type: InstitutionType;
  boardUniversity: BoardUniversity;
  district: string;
  city: string;
  address: string;
  studentStrength: number;
  decisionMaker: string;
  phone: string;
  email: string;
  priorityScore: number; // 0-100
  priority: PriorityBucket; // derived
  assignedTo: string; // executive user id
  pipelineStage: AlliancePipelineStage;
  notes: string;
  createdAt: string;
}

export interface AllianceContact {
  id: string;
  institutionId: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  notes: string;
}

export interface AllianceVisit {
  id: string;
  institutionId: string;
  executiveId: string;
  visitDate: string;
  meetingPerson: string;
  summary: string;
  interestLevel: VisitInterestLevel;
  nextFollowup: string;
  status: VisitStatus;
  photoUrl: string;
  createdAt: string;
}

export interface AllianceTask {
  id: string;
  title: string;
  institutionId: string;
  assignedTo: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
}

export interface AllianceProposal {
  id: string;
  institutionId: string;
  proposalType: ProposalType;
  amount: number;
  status: ProposalStatus;
  sentDate: string;
  approvedBy?: string;
  notes: string;
}

export interface AllianceEvent {
  id: string;
  institutionId: string;
  eventName: string;
  eventType: EventType;
  eventDate: string;
  attendees: number;
  leadsGenerated: number;
  notes: string;
}

export interface AllianceExpense {
  id: string;
  executiveId: string;
  institutionId: string;
  expenseType: ExpenseType;
  amount: number;
  billUrl: string;
  expenseDate: string;
  status: ExpenseStatus;
  notes: string;
}

// Auto-priority logic per phase 4 spec
export function computePriority(studentStrength: number): { score: number; bucket: PriorityBucket } {
  let score = 0;
  if (studentStrength > 2000) score = 95;
  else if (studentStrength > 1000) score = 80;
  else if (studentStrength > 500) score = 60;
  else if (studentStrength > 200) score = 40;
  else score = 25;
  const bucket: PriorityBucket = score >= 75 ? "High" : score >= 45 ? "Medium" : "Low";
  return { score, bucket };
}
