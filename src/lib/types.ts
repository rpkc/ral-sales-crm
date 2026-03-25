export type UserRole = "admin" | "marketing_manager" | "telecaller" | "counselor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type CampaignPlatform = "Meta" | "Google" | "LinkedIn" | "YouTube" | "Referral" | "Offline Event";
export type CampaignObjective = "Lead Generation" | "Brand Awareness" | "Webinar" | "Course Promotion";
export type CampaignApprovalStatus = "Draft" | "Active" | "Paused" | "Completed" | "Archived";
export type AudienceType = "Cold" | "Retargeting" | "Lookalike" | "Custom Audience";
export type RetargetingSource = "Website Visitors" | "Video Views" | "Lead Form";
export type AdType = "Image" | "Video" | "Carousel" | "Reel";
export type LeadQuality = "Hot" | "Warm" | "Cold";
export type LeadTemperature = "Hot" | "Warm" | "Cold" | "Dormant";
export type LeadIntentCategory = "High Intent" | "Medium Intent" | "Low Intent";
export type DecisionMaker = "Self" | "Parent" | "Joint";
export type FeePayer = "Self" | "Parent" | "Sponsor";
export type CommunicationChannel = "Phone Call" | "WhatsApp" | "Email" | "SMS" | "Instagram DM" | "Website Chat";
export type LostReason = "Too Expensive" | "Not Interested" | "Joined Competitor" | "No Response" | "Wrong Number";
export type TransferReason = "Language mismatch" | "Course specialization" | "Counselor unavailable";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  description: string;
  channel?: CommunicationChannel;
  userId?: string;
  timestamp: string;
}

export interface LeadTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  reason: TransferReason;
  timestamp: string;
}

export interface QualificationChecklist {
  budgetConfirmed: boolean;
  courseInterestConfirmed: boolean;
  locationPreference: boolean;
  startTimeline: boolean;
  placementExpectation: boolean;
}

export interface AdCreative {
  id: string;
  adType: AdType;
  creativeHook: string;
  primaryMessage: string;
  cta: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  audienceType: AudienceType;
  sourceAudience: string;
  retargetingSource: RetargetingSource | "";
  ads: AdCreative[];
}

export interface UTMTracking {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

export interface LandingPage {
  id: string;
  campaignId: string;
  url: string;
  pageVersion: string;
  conversionRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  objective: CampaignObjective;
  budget: number;
  dailyBudget: number;
  startDate: string;
  endDate: string;
  targetLocation: string;
  leadsGenerated: number;
  costPerLead: number;
  createdAt: string;
  // Targeting (paid platforms)
  ageGroup: string;
  educationLevel: string;
  interestCategory: string;
  targetCity: string;
  // Team
  marketingManager: string;
  campaignOwner: string;
  campaignNotes: string;
  approvalStatus: CampaignApprovalStatus;
  // Nested
  adSets: AdSet[];
  utmTracking: UTMTracking;
  landingPages: LandingPage[];
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
  // Attribution
  adSetName: string;
  adName: string;
  landingPageUrl: string;
  utm: UTMTracking;
  // Quality
  leadScore: number;
  leadQuality: LeadQuality;
  budgetRange: string;
  urgencyLevel: string;
  otherInstitutes: string;
  // Enrichment (Section 1)
  currentEducation?: string;
  graduationYear?: string;
  currentOccupation?: string;
  collegeInstitution?: string;
  feePayer?: FeePayer;
  decisionMaker?: DecisionMaker;
  // Intent (Section 2)
  intentScore?: number;
  intentCategory?: LeadIntentCategory;
  lastInteractionType?: string;
  lastInteractionDate?: string;
  // Temperature (Section 6)
  temperature?: LeadTemperature;
  // Ownership (Section 5)
  assignedCounselor?: string;
  leadOwner?: string;
  transferHistory?: LeadTransfer[];
  // Timeline (Section 3)
  activities?: LeadActivity[];
  // Qualification (Section 9)
  qualification?: QualificationChecklist;
  qualificationScore?: number;
  // Course Recommendation (Section 10)
  recommendedCourse?: string;
  alternateCourse?: string;
  recommendationReason?: string;
  // Lost (Section 13)
  lostReason?: LostReason;
  // SLA (Section 7)
  firstCallTime?: string;
  firstResponseTime?: string;
  // Priority (Section 14)
  priorityScore?: number;
  priorityCategory?: "High Priority" | "Medium Priority" | "Low Priority";
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
export type PaymentMode = "Cash" | "Cheque" | "Online Transfer";
export type PaymentType = "Admission Fee" | "Seat Booking" | "Registration" | "EMI";

export interface PaymentHistoryEntry {
  id: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  paymentType: PaymentType | "";
  emiNumber: number | null;
}

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
  paymentMode: PaymentMode | "";
  chequeNumber: string;
  transactionId: string;
  paymentType: PaymentType | "";
  emiNumber: number | null;
  totalEmis: number | null;
  paymentHistory: PaymentHistoryEntry[];
  parentName: string;
  parentPhone: string;
  studentBankName: string;
  parentBankName: string;
  createdAt: string;
}
