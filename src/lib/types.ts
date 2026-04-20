export type UserRole = "admin" | "marketing_manager" | "telecaller" | "counselor" | "telecalling_manager" | "owner" | "alliance_manager" | "alliance_executive";

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
export type LostReason = "Too Expensive" | "Not Interested" | "Joined Competitor" | "No Response" | "Wrong Number" | "Budget Issue";
export type TransferReason = "Language mismatch" | "Course specialization" | "Counselor unavailable";
export type LeadSourceFormType = "Apply Now" | "Free Counselling" | "Free Callback" | "Register Now" | "Download Brochure" | "Walk-in" | "Referral";
export type CurrentStatus = "Student" | "Working Professional" | "Fresher" | "Business Owner" | "Career Switch" | "Unemployed";
export type CareerGoal = "Graphic Designer" | "UI/UX Designer" | "Web Developer" | "Full Stack Developer" | "Digital Marketer" | "Animator" | "Video Editor" | "Freelancer" | "Entrepreneur" | "Content Creator";
export type LeadMotivation = "Job Placement" | "Career Switch" | "Skill Upgrade" | "Portfolio Building" | "Freelancing" | "Business Purpose";
export type PreferredStartTime = "Immediate" | "Within 1 Month" | "Within 3 Months" | "Not Sure";
export type CallOutcomeType = "Connected" | "Not Answered" | "Call Later" | "Interested" | "Not Interested" | "Wrong Number" | "Switched Off" | "Invalid Number";
export type ObjectionType = "Course Too Expensive" | "Timing Issue" | "Location Issue" | "Not Sure About Career" | "Need Parent Approval" | "Already Joined Another Institute" | "Just Researching" | "Need More Time";
export type FollowUpTypeSchema = "Phone Call" | "WhatsApp" | "Email" | "Counseling Meeting" | "Campus Visit" | "Demo Class" | "Zoom Meeting" | "In-person Meeting" | "Parent Discussion";
export type PaymentModeSchema = "Cash" | "Cheque" | "Online Transfer" | "UPI" | "Credit Card" | "Debit Card" | "Net Banking";

// Walk-in types
export type WalkInStatus = "Not Scheduled" | "Scheduled" | "Completed" | "No Show";
export type CounselingOutcome = "Strong Admission Intent" | "Interested but Needs Time" | "Fee Discussion Pending" | "Parent Approval Pending" | "Not Interested";
export type FeeCommitment = "Full Admission Fee" | "Registration Fee" | "Seat Booking Token" | "EMI Plan";
export type DocumentStatus = "Documents Submitted" | "Documents Pending" | "Verification Pending";
export type JoiningFailureReason = "Fee Arrangement Issue" | "Parents Reluctant" | "Document Issues" | "Student Not Responding" | "Joined Another Institute" | "Follow-Up Missed";
export type AdmissionProbabilityType = "Very High" | "High" | "Medium" | "Low" | "Very Low";

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
  // Program Channel (multi-vertical)
  programChannel?: "Individual Course Admission" | "Internship Program" | "College Collaboration Program" | "School Training Program";
  // Internship-specific fields
  internshipCourse?: string;
  internshipDuration?: string;
  internshipLocation?: string;
  internshipFee?: number;
  internshipEnrollmentType?: string;
  internshipPipelineStage?: string;
  createdAt: string;
  // Attribution
  adSetName?: string;
  adName?: string;
  landingPageUrl?: string;
  utm?: UTMTracking;
  // Quality
  leadScore: number;
  leadQuality: LeadQuality;
  budgetRange: string;
  urgencyLevel: string;
  otherInstitutes?: string;
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
  admissionProbability?: AdmissionProbabilityType;
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
  // Walk-in counseling
  walkInStatus?: WalkInStatus;
  walkInDate?: string;
  walkInTime?: string;
  walkInCounselor?: string;
  // Counseling outcome
  counselingOutcome?: CounselingOutcome;
  // Date of Joining
  expectedDOJ?: string;
  feeCommitment?: FeeCommitment;
  totalEmisPlanned?: number;
  firstEmiDate?: string;
  // Document tracking
  documentStatus?: DocumentStatus;
  documentsChecklist?: {
    idProof: boolean;
    addressProof: boolean;
    educationCertificate: boolean;
    photographs: boolean;
  };
  // Joining tracking
  joiningFailureReason?: JoiningFailureReason;
  joiningDelayed?: boolean;
}

export type CallOutcome = "Connected" | "Not Answered" | "Interested" | "Not Interested" | "Call Later" | "Wrong Number" | "Switched Off" | "Invalid Number" |
  // Legacy compat
  "Not answered" | "Not interested" | "Call later";
export type NotInterestedReason = "Course Too Expensive" | "Timing Issue" | "Location Issue" | "Not Sure About Career" | "Need Parent Approval" | "Already Joined Another Institute" | "Just Researching" | "Need More Time" |
  // Legacy compat
  "Too Expensive" | "Course Not Relevant" | "Joined Competitor" | "No Time";
export type FollowUpType = "Phone Call" | "WhatsApp" | "Email" | "Counseling Meeting" | "Campus Visit" | "Demo Class" | "Zoom Meeting" |
  // Legacy compat
  "Call";
export type PaymentMode = PaymentModeSchema;

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
export type PaymentType = "Admission Fee" | "Seat Booking" | "Registration" | "EMI" | "Full Payment";

export interface PaymentHistoryEntry {
  id: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  paymentType: PaymentType | "";
  emiNumber?: number | null;
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
  emiNumber?: number | null;
  totalEmis?: number | null;
  paymentHistory?: PaymentHistoryEntry[];
  parentName?: string;
  parentPhone?: string;
  studentBankName?: string;
  parentBankName?: string;
  createdAt: string;
  scholarshipApplied?: boolean;
  scholarshipPercentage?: number;
  emiSelected?: boolean;
}
