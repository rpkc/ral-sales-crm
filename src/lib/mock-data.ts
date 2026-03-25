import { Campaign, Lead, CallLog, FollowUp, Admission, User, UTMTracking, LeadActivity, Course } from "./types";

const defaultUtm: UTMTracking = { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "" };

/* ═══════ COURSE CATALOG ═══════ */
export const mockCourses: Course[] = [
  { id: "cr1", name: "Graphic Design", category: "Design", duration: "3 Months", fee: 45000, placementSupport: true },
  { id: "cr2", name: "UI/UX Design", category: "Design", duration: "4 Months", fee: 90000, placementSupport: true },
  { id: "cr3", name: "Motion Graphics", category: "Design", duration: "5 Months", fee: 118000, placementSupport: true },
  { id: "cr4", name: "Web Design", category: "Design", duration: "3 Months", fee: 45000, placementSupport: true },
  { id: "cr5", name: "HTML & CSS", category: "Development", duration: "1 Month", fee: 15000, placementSupport: false },
  { id: "cr6", name: "WordPress", category: "Development", duration: "2 Months", fee: 45000, placementSupport: false },
  { id: "cr7", name: "Digital Marketing", category: "Marketing", duration: "4 Months", fee: 90000, placementSupport: true },
  { id: "cr8", name: "AI / ML", category: "Data", duration: "8 Months", fee: 260000, placementSupport: true },
  { id: "cr9", name: "Game Development", category: "Development", duration: "6 Months", fee: 190000, placementSupport: true },
  { id: "cr10", name: "Full Stack Development", category: "Development", duration: "10 Months", fee: 410000, placementSupport: true },
];

export const COURSE_FEE_TIERS = [15000, 45000, 90000, 118000, 160000, 190000, 260000, 410000];

export function getFeeBand(fee: number): string {
  if (fee <= 45000) return "Low Ticket";
  if (fee <= 118000) return "Mid Ticket";
  return "High Ticket";
}

/* ═══════ USERS ═══════ */
export const mockUsers: User[] = [
  { id: "u1", name: "Amit Sharma", email: "amit@redapple.com", password: "admin123", role: "admin" },
  { id: "u2", name: "Soumya Saha", email: "soumya@redapple.com", password: "marketing123", role: "marketing_manager" },
  { id: "u3", name: "Shreya Chakraborty", email: "shreya@redapple.com", password: "telecaller123", role: "telecaller" },
  { id: "u4", name: "Priya Das", email: "priya@redapple.com", password: "telecaller123", role: "telecaller" },
  { id: "u5", name: "Manjari Chakraborty", email: "manjari@redapple.com", password: "counselor123", role: "counselor" },
  { id: "u6", name: "Vikram Singh", email: "vikram@redapple.com", password: "manager123", role: "telecalling_manager" },
  { id: "u7", name: "Rajesh Kapoor", email: "rajesh@redapple.com", password: "owner123", role: "owner" },
];

/* ═══════ CAMPAIGNS ═══════ */
export const mockCampaigns: Campaign[] = [
  {
    id: "c1", name: "Summer Coding Bootcamp", platform: "Meta", objective: "Lead Generation",
    budget: 50000, dailyBudget: 1667, startDate: "2026-03-01", endDate: "2026-03-31",
    targetLocation: "Kolkata, Delhi", leadsGenerated: 120, costPerLead: 417, createdAt: "2026-03-01",
    ageGroup: "18-30", educationLevel: "Graduate", interestCategory: "Technology", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u2", campaignNotes: "Focus on coding bootcamp ads", approvalStatus: "Active",
    adSets: [
      { id: "as1", campaignId: "c1", name: "Cold Audience - Tech", audienceType: "Cold", sourceAudience: "", retargetingSource: "", ads: [
        { id: "ad1", adType: "Image", creativeHook: "Launch your tech career in 12 weeks", primaryMessage: "Full-stack bootcamp with placement support", cta: "Apply Now" },
      ] },
    ],
    utmTracking: { utmSource: "meta", utmMedium: "paid", utmCampaign: "summer-bootcamp", utmContent: "image-ad-1", utmTerm: "coding bootcamp" },
    landingPages: [
      { id: "lp1", campaignId: "c1", url: "https://redapple.com/bootcamp", pageVersion: "V1", conversionRate: 12.5 },
      { id: "lp2", campaignId: "c1", url: "https://redapple.com/bootcamp-v2", pageVersion: "V2", conversionRate: 18.2 },
    ],
  },
  {
    id: "c2", name: "Data Science Workshop", platform: "Google", objective: "Lead Generation",
    budget: 35000, dailyBudget: 1129, startDate: "2026-03-10", endDate: "2026-04-10",
    targetLocation: "Kolkata, Bangalore", leadsGenerated: 85, costPerLead: 412, createdAt: "2026-03-10",
    ageGroup: "22-35", educationLevel: "Post Graduate", interestCategory: "Data Science", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u2", campaignNotes: "", approvalStatus: "Active",
    adSets: [], utmTracking: { utmSource: "google", utmMedium: "paid", utmCampaign: "ds-workshop", utmContent: "", utmTerm: "data science course" },
    landingPages: [{ id: "lp3", campaignId: "c2", url: "https://redapple.com/data-science", pageVersion: "V1", conversionRate: 9.8 }],
  },
  {
    id: "c3", name: "MBA Admissions 2026", platform: "LinkedIn", objective: "Course Promotion",
    budget: 75000, dailyBudget: 1250, startDate: "2026-02-15", endDate: "2026-04-15",
    targetLocation: "Pan India", leadsGenerated: 200, costPerLead: 375, createdAt: "2026-02-15",
    ageGroup: "24-35", educationLevel: "Graduate", interestCategory: "Business", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u1", campaignNotes: "Premium MBA campaign", approvalStatus: "Active",
    adSets: [], utmTracking: { utmSource: "linkedin", utmMedium: "paid", utmCampaign: "mba-2026", utmContent: "", utmTerm: "" },
    landingPages: [],
  },
  {
    id: "c4", name: "Digital Marketing Course", platform: "Meta", objective: "Lead Generation",
    budget: 25000, dailyBudget: 833, startDate: "2026-03-20", endDate: "2026-04-20",
    targetLocation: "Kolkata", leadsGenerated: 60, costPerLead: 417, createdAt: "2026-03-20",
    ageGroup: "20-30", educationLevel: "Any", interestCategory: "Marketing", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u2", campaignNotes: "", approvalStatus: "Draft",
    adSets: [], utmTracking: { utmSource: "meta", utmMedium: "paid", utmCampaign: "dm-course", utmContent: "", utmTerm: "" },
    landingPages: [],
  },
];

/* ═══════ LEADS ═══════ */
export const mockLeads: Lead[] = [
  {
    id: "l1", name: "Aarav Kumar", phone: "9876543210", email: "aarav@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "Full Stack Development", assignedTelecallerId: "u3", status: "New", createdAt: "2026-03-24",
    adSetName: "Cold Audience - Tech", adName: "Image Ad 1", landingPageUrl: "https://redapple.com/bootcamp",
    utm: { utmSource: "meta", utmMedium: "paid", utmCampaign: "summer-bootcamp", utmContent: "image-ad-1", utmTerm: "coding bootcamp" },
    leadScore: 72, leadQuality: "Warm", budgetRange: "₹1.6L", urgencyLevel: "Medium", otherInstitutes: "",
    currentEducation: "B.Tech", graduationYear: "2025", currentOccupation: "Student", collegeInstitution: "VIT University",
    feePayer: "Parent", decisionMaker: "Joint",
    highestQualification: "B.Tech", currentStatus: "Student", careerGoal: "Full Stack Developer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Apply Now", leadMotivation: "Job Placement",
    placementInterest: true, expectedSalary: "5 LPA", jobLocationPreference: "Kolkata",
    intentScore: 70, intentCategory: "Medium Intent", lastInteractionType: "Call Attempted", lastInteractionDate: "2026-03-24",
    temperature: "Warm", assignedCounselor: "u5", leadOwner: "u3", transferHistory: [],
    activities: [
      { id: "a1", leadId: "l1", type: "Lead Created", description: "Lead captured from Meta Ad — Apply Now form", timestamp: "2026-03-24T10:00:00" },
      { id: "a2", leadId: "l1", type: "Call Attempted", description: "First call attempt by Shreya", channel: "Phone Call", userId: "u3", timestamp: "2026-03-24T11:30:00" },
    ],
    qualification: { budgetConfirmed: false, courseInterestConfirmed: true, locationPreference: true, startTimeline: false, placementExpectation: true },
    qualificationScore: 60, recommendedCourse: "Full Stack Development", alternateCourse: "Web Development",
    recommendationReason: "Strong interest in web development", priorityScore: 72, priorityCategory: "High Priority",
  },
  {
    id: "l2", name: "Diya Singh", phone: "9876543211", email: "diya@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "Data Science", assignedTelecallerId: "u3", status: "Contacted", createdAt: "2026-03-23",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 85, leadQuality: "Hot", budgetRange: "₹1.18L", urgencyLevel: "High", otherInstitutes: "UpGrad",
    currentEducation: "M.Sc Statistics", graduationYear: "2024", currentOccupation: "Working Professional",
    feePayer: "Self", decisionMaker: "Self",
    highestQualification: "M.Sc", currentStatus: "Working Professional", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Counselling", leadMotivation: "Career Switch",
    placementInterest: true, expectedSalary: "8 LPA", jobLocationPreference: "Kolkata, Bangalore",
    intentScore: 88, intentCategory: "High Intent", lastInteractionType: "Call Connected", lastInteractionDate: "2026-03-23",
    temperature: "Hot", assignedCounselor: "u5", leadOwner: "u3", transferHistory: [],
    activities: [
      { id: "a3", leadId: "l2", type: "Lead Created", description: "Lead from Google search ad — Free Counselling", timestamp: "2026-03-23T09:00:00" },
      { id: "a4", leadId: "l2", type: "Call Connected", description: "Discussed placement support", channel: "Phone Call", userId: "u3", timestamp: "2026-03-23T10:15:00" },
      { id: "a5", leadId: "l2", type: "Follow-up Scheduled", description: "Share placement brochure via WhatsApp", timestamp: "2026-03-23T10:20:00" },
    ],
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, recommendedCourse: "Data Science", alternateCourse: "AI & Machine Learning",
    recommendationReason: "Statistics background, strong analytical skills", priorityScore: 92, priorityCategory: "High Priority",
    scholarshipDiscussion: "10%", admissionProbability: "High",
    firstCallTime: "2026-03-23T09:45:00", firstResponseTime: "2026-03-23T10:15:00",
  },
  {
    id: "l3", name: "Vihaan Reddy", phone: "9876543212", email: "vihaan@email.com", source: "LinkedIn", campaignId: "c3",
    interestedCourse: "MBA (Business Analytics)", assignedTelecallerId: "u4", status: "Follow-up", createdAt: "2026-03-22",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 60, leadQuality: "Warm", budgetRange: "₹4.1L", urgencyLevel: "Low", otherInstitutes: "ISB, IIM",
    highestQualification: "B.Com", currentStatus: "Working Professional", careerGoal: "Entrepreneur", preferredStartTime: "Within 3 Months",
    leadSourceFormType: "Register Now",
    intentScore: 55, intentCategory: "Medium Intent", lastInteractionType: "Follow-up Scheduled", lastInteractionDate: "2026-03-22",
    temperature: "Warm", transferHistory: [],
    activities: [
      { id: "a6", leadId: "l3", type: "Lead Created", description: "Lead from LinkedIn campaign", timestamp: "2026-03-22T08:00:00" },
      { id: "a7", leadId: "l3", type: "Call Connected", description: "Busy, asked to call after 5 PM", channel: "Phone Call", userId: "u4", timestamp: "2026-03-22T14:00:00" },
    ],
    qualification: { budgetConfirmed: false, courseInterestConfirmed: true, locationPreference: false, startTimeline: false, placementExpectation: true },
    qualificationScore: 40, priorityScore: 55, priorityCategory: "Medium Priority",
  },
  {
    id: "l4", name: "Ananya Joshi", phone: "9876543213", email: "ananya@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "Counseling", createdAt: "2026-03-21",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 90, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High", otherInstitutes: "",
    currentEducation: "BCA", graduationYear: "2025", currentOccupation: "Student", collegeInstitution: "Christ University",
    feePayer: "Parent", decisionMaker: "Joint",
    highestQualification: "BCA", currentStatus: "Student", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Callback", leadMotivation: "Portfolio Building",
    placementInterest: true, expectedSalary: "4 LPA", jobLocationPreference: "Kolkata",
    intentScore: 92, intentCategory: "High Intent", lastInteractionType: "Counseling Done", lastInteractionDate: "2026-03-24",
    temperature: "Hot", assignedCounselor: "u5", leadOwner: "u5", transferHistory: [
      { id: "t1", fromUserId: "u4", toUserId: "u5", reason: "Course specialization", timestamp: "2026-03-22T16:00:00" },
    ],
    activities: [
      { id: "a8", leadId: "l4", type: "Lead Created", description: "Lead from Meta Ad — Free Callback", timestamp: "2026-03-21T09:00:00" },
      { id: "a9", leadId: "l4", type: "Call Connected", description: "Very interested, wants counseling", channel: "Phone Call", userId: "u4", timestamp: "2026-03-21T11:00:00" },
      { id: "a10", leadId: "l4", type: "Counseling Done", description: "Counseling session completed by Manjari", userId: "u5", timestamp: "2026-03-24T15:00:00" },
    ],
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, recommendedCourse: "UI/UX Design", alternateCourse: "Graphic Design",
    recommendationReason: "Creative background, strong design interest", priorityScore: 95, priorityCategory: "High Priority",
    scholarshipDiscussion: "15%", emiOption: true, admissionProbability: "High",
    scholarshipApplied: true, scholarshipPercentage: 15, emiSelected: true,
    firstCallTime: "2026-03-21T10:00:00", firstResponseTime: "2026-03-21T11:00:00",
  },
  {
    id: "l5", name: "Arjun Nair", phone: "9876543214", email: "arjun@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "Data Science", assignedTelecallerId: "u3", status: "Qualified", createdAt: "2026-03-20",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 88, leadQuality: "Hot", budgetRange: "₹1.18L", urgencyLevel: "High", otherInstitutes: "",
    highestQualification: "B.Tech", currentStatus: "Fresher", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Apply Now", leadMotivation: "Job Placement",
    intentScore: 90, intentCategory: "High Intent", temperature: "Hot", priorityScore: 88, priorityCategory: "High Priority",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: false },
    qualificationScore: 80, activities: [],
  },
  {
    id: "l6", name: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com", source: "LinkedIn", campaignId: "c3",
    interestedCourse: "MBA (Business Analytics)", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-19",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 95, leadQuality: "Hot", budgetRange: "₹4.1L", urgencyLevel: "High", otherInstitutes: "",
    highestQualification: "B.Com Hons", currentStatus: "Working Professional", careerGoal: "Entrepreneur",
    leadSourceFormType: "Apply Now",
    intentScore: 98, intentCategory: "High Intent", temperature: "Hot", priorityScore: 98, priorityCategory: "High Priority",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, activities: [],
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true, admissionProbability: "High",
  },
  {
    id: "l7", name: "Rohan Das", phone: "9876543216", email: "rohan@email.com", source: "Meta Ad", campaignId: "c4",
    interestedCourse: "Digital Marketing Basics", assignedTelecallerId: "u3", status: "Lost", createdAt: "2026-03-18",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 25, leadQuality: "Cold", budgetRange: "", urgencyLevel: "Low", otherInstitutes: "Simplilearn",
    leadSourceFormType: "Download Brochure",
    intentScore: 10, intentCategory: "Low Intent", temperature: "Cold", lostReason: "Joined Competitor",
    priorityScore: 15, priorityCategory: "Low Priority", activities: [],
  },
  {
    id: "l8", name: "Kavya Iyer", phone: "9876543217", email: "kavya@email.com", source: "Walk-in", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "New", createdAt: "2026-03-25",
    adSetName: "", adName: "", landingPageUrl: "", utm: defaultUtm,
    leadScore: 50, leadQuality: "Warm", budgetRange: "₹90k", urgencyLevel: "Medium", otherInstitutes: "",
    currentEducation: "B.Com", graduationYear: "2026", currentOccupation: "Student",
    highestQualification: "B.Com", currentStatus: "Student", careerGoal: "UI/UX Designer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Walk-in", leadMotivation: "Skill Upgrade",
    intentScore: 45, intentCategory: "Medium Intent", temperature: "Warm",
    priorityScore: 50, priorityCategory: "Medium Priority", activities: [
      { id: "a11", leadId: "l8", type: "Lead Created", description: "Walk-in inquiry", timestamp: "2026-03-25T09:00:00" },
    ],
  },
];

/* ═══════ CALL LOGS ═══════ */
export const mockCallLogs: CallLog[] = [
  { id: "cl1", leadId: "l1", telecallerId: "u3", outcome: "Connected", notes: "Interested in weekend batch", nextFollowUp: "2026-03-26", createdAt: "2026-03-24" },
  { id: "cl2", leadId: "l2", telecallerId: "u3", outcome: "Interested", notes: "Wants to know about placement support", nextFollowUp: "2026-03-27", createdAt: "2026-03-23",
    conversationInsight: { careerGoal: "Data Analyst", budgetRange: "₹1.18L", leadMotivation: "Career Switch", placementExpectation: "Within 6 months" } },
  { id: "cl3", leadId: "l3", telecallerId: "u4", outcome: "Call later", notes: "Busy, asked to call after 5 PM", nextFollowUp: "2026-03-25", createdAt: "2026-03-22" },
  { id: "cl4", leadId: "l7", telecallerId: "u3", outcome: "Not interested", notes: "Found another institute", nextFollowUp: "", createdAt: "2026-03-20", notInterestedReason: "Joined Competitor" },
];

/* ═══════ FOLLOW-UPS ═══════ */
export const mockFollowUps: FollowUp[] = [
  { id: "f1", leadId: "l1", assignedTo: "u3", date: "2026-03-26", notes: "Call about weekend batch availability", completed: false, createdAt: "2026-03-24", followUpType: "Call" },
  { id: "f2", leadId: "l2", assignedTo: "u3", date: "2026-03-27", notes: "Share placement brochure", completed: false, createdAt: "2026-03-23", followUpType: "WhatsApp" },
  { id: "f3", leadId: "l3", assignedTo: "u4", date: "2026-03-25", notes: "Call after 5 PM", completed: false, createdAt: "2026-03-22", followUpType: "Call" },
  { id: "f4", leadId: "l4", assignedTo: "u5", date: "2026-03-24", notes: "Counseling session scheduled", completed: true, createdAt: "2026-03-21", followUpType: "Counseling Meeting" },
];

/* ═══════ ADMISSIONS ═══════ */
export const mockAdmissions: Admission[] = [
  {
    id: "a1", leadId: "l6", studentName: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com",
    courseSelected: "MBA (Business Analytics)", batch: "MBA-2026-A", admissionDate: "2026-03-20", totalFee: 410000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260320001",
    paymentType: "EMI", emiNumber: 1, totalEmis: 6,
    paymentHistory: [
      { id: "ph1", paymentDate: "2026-03-20", amountPaid: 75000, paymentMode: "Online Transfer", referenceNumber: "TXN20260320001", paymentType: "EMI", emiNumber: 1 },
    ],
    parentName: "Rajesh Chopra", parentPhone: "9876500001", studentBankName: "HDFC Bank", parentBankName: "SBI",
    createdAt: "2026-03-20",
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true,
  },
];

/* ═══════ LOCAL STORAGE HELPERS ═══════ */
const STORAGE_KEYS = {
  campaigns: "crm_campaigns",
  leads: "crm_leads",
  callLogs: "crm_call_logs",
  followUps: "crm_follow_ups",
  admissions: "crm_admissions",
  courses: "crm_courses",
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

  getCourses: () => getOrInit(STORAGE_KEYS.courses, mockCourses),
  saveCourses: (d: Course[]) => save(STORAGE_KEYS.courses, d),

  getUsers: () => mockUsers,

  resetAll: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
