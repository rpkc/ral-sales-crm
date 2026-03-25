export type UserRole = "admin" | "marketing_manager" | "telecaller" | "counselor" | "telecalling_manager" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
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
export type LeadSourceFormType = "Apply Now" | "Free Counselling" | "Free Callback" | "Register Now" | "Download Brochure" | "Walk-in" | "Referral";
export type CurrentStatus = "Student" | "Working Professional" | "Fresher" | "Career Switch";
export type CareerGoal = "Designer" | "Developer" | "Digital Marketer" | "Animator" | "Data Analyst" | "Other";
export type LeadMotivation = "Job Placement" | "Career Switch" | "Skill Upgrade" | "Portfolio Building";
export type PreferredStartTime = "Immediate" | "Within 1 Month" | "Within 3 Months" | "Not Sure";

export interface Course {
  id: string;
  name: string;
  category: string;
  duration: string;
  fee: number;
  placementSupport: boolean;
}

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
  ageGroup: string;
  educationLevel: string;
  interestCategory: string;
  targetCity: string;
  marketingManager: string;
  campaignOwner: string;
  campaignNotes: string;
  approvalStatus: CampaignApprovalStatus;
  adSets: AdSet[];
  utmTracking: UTMTracking;
  landingPages: LandingPage[];
}

export type LeadStatus =
  | "New"
  | "Contact Attempted"
  | "Connected"
  | "Interested"
  | "Application Submitted"
  | "Interview Scheduled"
  | "Interview Completed"
  | "Counseling"
  | "Qualified"
  | "Admission"
  | "Lost"
  // Keep old statuses for backward compat
  | "Contacted"
  | "Follow-up";

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
  // Enrichment
  currentEducation?: string;
  graduationYear?: string;
  currentOccupation?: string;
  collegeInstitution?: string;
  feePayer?: FeePayer;
  decisionMaker?: DecisionMaker;
  // New enrichment fields
  highestQualification?: string;
  currentStatus?: CurrentStatus;
  careerGoal?: CareerGoal;
  preferredStartTime?: PreferredStartTime;
  leadSourceFormType?: LeadSourceFormType;
  leadMotivation?: LeadMotivation;
  // Placement
  placementInterest?: boolean;
  expectedSalary?: string;
  jobLocationPreference?: string;
  // Intent
  intentScore?: number;
  intentCategory?: LeadIntentCategory;
  lastInteractionType?: string;
  lastInteractionDate?: string;
  // Temperature
  temperature?: LeadTemperature;
  // Ownership
  assignedCounselor?: string;
  leadOwner?: string;
  transferHistory?: LeadTransfer[];
  // Timeline
  activities?: LeadActivity[];
  // Qualification
  qualification?: QualificationChecklist;
  qualificationScore?: number;
  // Course Recommendation
  recommendedCourse?: string;
  alternateCourse?: string;
  recommendationReason?: string;
  // Counseling
  scholarshipDiscussion?: string;
  emiOption?: boolean;
  admissionProbability?: "High" | "Medium" | "Low";
  scholarshipApplied?: boolean;
  scholarshipPercentage?: number;
  loanRequired?: boolean;
  emiSelected?: boolean;
  // Lost
  lostReason?: LostReason;
  // SLA
  firstCallTime?: string;
  firstResponseTime?: string;
  // Priority
  priorityScore?: number;
  priorityCategory?: "High Priority" | "Medium Priority" | "Low Priority";
}

export type CallOutcome = "Connected" | "Not answered" | "Interested" | "Not interested" | "Call later" | "Wrong Number";
export type NotInterestedReason = "Too Expensive" | "Course Not Relevant" | "Joined Competitor" | "No Time";
export type FollowUpType = "Call" | "WhatsApp" | "Email" | "Counseling Meeting";

export interface ConversationInsight {
  careerGoal?: string;
  budgetRange?: string;
  preferredLearningMode?: string;
  decisionMaker?: string;
  placementExpectation?: string;
  biggestConcern?: string;
  preferredStartDate?: string;
  leadMotivation?: LeadMotivation;
  objections?: string;
}

export interface CallLog {
  id: string;
  leadId: string;
  telecallerId: string;
  outcome: CallOutcome;
  notes: string;
  nextFollowUp: string;
  nextFollowUpTime?: string;
  followUpType?: FollowUpType;
  notInterestedReason?: NotInterestedReason;
  conversationInsight?: ConversationInsight;
  callbackDate?: string;
  callbackTime?: string;
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
  followUpType?: FollowUpType;
  followUpTime?: string;
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
  scholarshipApplied?: boolean;
  scholarshipPercentage?: number;
  emiSelected?: boolean;
}
