import { Campaign, Lead, CallLog, FollowUp, Admission, User, UTMTracking, LeadActivity, Course } from "./types";
import {
  CollegeAccount, CollegeProgram, CollegeStudent,
  SchoolAccount, SchoolProgram, SchoolStudent,
  InternshipAdmission,
} from "./vertical-types";
import {
  mockInternshipAdmissions, mockCollegeAccounts, mockCollegePrograms, mockCollegeStudents,
  mockSchoolAccounts, mockSchoolPrograms, mockSchoolStudents, internshipLeadEntries,
} from "./vertical-data";

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

/* ═══════ BUSINESS BENCHMARKS ═══════ */
export const BENCHMARKS = {
  monthlyMarketingSpend: 40000,
  monthlyBilling: 600000,
  cpaMin: 5500,
  cpaMax: 6500,
  marketingSpendRatioMax: 10,
  minROAS: 10,
};

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
    budget: 15000, dailyBudget: 500, startDate: "2026-03-01", endDate: "2026-03-31",
    targetLocation: "Kolkata, Delhi", leadsGenerated: 95, costPerLead: 158, createdAt: "2026-03-01",
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
    id: "c2", name: "AI & Data Science Push", platform: "Google", objective: "Lead Generation",
    budget: 12000, dailyBudget: 400, startDate: "2026-03-10", endDate: "2026-04-10",
    targetLocation: "Kolkata, Bangalore", leadsGenerated: 70, costPerLead: 171, createdAt: "2026-03-10",
    ageGroup: "22-35", educationLevel: "Post Graduate", interestCategory: "Data Science", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u2", campaignNotes: "", approvalStatus: "Active",
    adSets: [], utmTracking: { utmSource: "google", utmMedium: "paid", utmCampaign: "ai-ml-push", utmContent: "", utmTerm: "data science course" },
    landingPages: [{ id: "lp3", campaignId: "c2", url: "https://redapple.com/data-science", pageVersion: "V1", conversionRate: 9.8 }],
  },
  {
    id: "c3", name: "Creative Design Sprint", platform: "LinkedIn", objective: "Course Promotion",
    budget: 8000, dailyBudget: 267, startDate: "2026-02-15", endDate: "2026-04-15",
    targetLocation: "Pan India", leadsGenerated: 55, costPerLead: 145, createdAt: "2026-02-15",
    ageGroup: "18-28", educationLevel: "Graduate", interestCategory: "Design", targetCity: "Kolkata",
    marketingManager: "u2", campaignOwner: "u1", campaignNotes: "Promote Graphic Design, UI/UX, Motion Graphics", approvalStatus: "Active",
    adSets: [], utmTracking: { utmSource: "linkedin", utmMedium: "paid", utmCampaign: "design-sprint", utmContent: "", utmTerm: "" },
    landingPages: [],
  },
  {
    id: "c4", name: "Digital Marketing Course", platform: "Meta", objective: "Lead Generation",
    budget: 5000, dailyBudget: 167, startDate: "2026-03-20", endDate: "2026-04-20",
    targetLocation: "Kolkata", leadsGenerated: 35, costPerLead: 143, createdAt: "2026-03-20",
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
    leadScore: 72, leadQuality: "Warm", budgetRange: "₹4.1L", urgencyLevel: "Medium", otherInstitutes: "",
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
    qualificationScore: 60, recommendedCourse: "Full Stack Development", alternateCourse: "Web Design",
    recommendationReason: "Strong interest in web development", priorityScore: 72, priorityCategory: "High Priority",
  },
  {
    id: "l2", name: "Diya Singh", phone: "9876543211", email: "diya@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "AI / ML", assignedTelecallerId: "u3", status: "Contacted", createdAt: "2026-03-23",
    leadScore: 85, leadQuality: "Hot", budgetRange: "₹2.6L", urgencyLevel: "High", otherInstitutes: "UpGrad",
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
    qualificationScore: 100, recommendedCourse: "AI / ML", alternateCourse: "Full Stack Development",
    recommendationReason: "Statistics background, strong analytical skills", priorityScore: 92, priorityCategory: "High Priority",
    scholarshipDiscussion: "10%", admissionProbability: "High",
    firstCallTime: "2026-03-23T09:45:00", firstResponseTime: "2026-03-23T10:15:00",
  },
  {
    id: "l3", name: "Vihaan Reddy", phone: "9876543212", email: "vihaan@email.com", source: "LinkedIn", campaignId: "c3",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "Follow-up", createdAt: "2026-03-22",
    leadScore: 60, leadQuality: "Warm", budgetRange: "₹90k", urgencyLevel: "Low", otherInstitutes: "",
    highestQualification: "B.Com", currentStatus: "Working Professional", careerGoal: "UI/UX Designer", preferredStartTime: "Within 3 Months",
    leadSourceFormType: "Register Now",
    intentScore: 55, intentCategory: "Medium Intent", lastInteractionType: "Follow-up Scheduled", lastInteractionDate: "2026-03-22",
    temperature: "Warm", transferHistory: [],
    activities: [
      { id: "a6", leadId: "l3", type: "Lead Created", description: "Lead from LinkedIn campaign", timestamp: "2026-03-22T08:00:00" },
      { id: "a7", leadId: "l3", type: "Call Connected", description: "Busy, asked to call after 5 PM", channel: "Phone Call", userId: "u4", timestamp: "2026-03-22T14:00:00" },
    ],
    qualification: { budgetConfirmed: false, courseInterestConfirmed: true, locationPreference: true, startTimeline: false, placementExpectation: true },
    qualificationScore: 40, priorityScore: 55, priorityCategory: "Medium Priority",
  },
  {
    id: "l4", name: "Ananya Joshi", phone: "9876543213", email: "ananya@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "Counseling", createdAt: "2026-03-21",
    leadScore: 90, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High", otherInstitutes: "",
    currentEducation: "BCA", graduationYear: "2025", currentOccupation: "Student", collegeInstitution: "Christ University",
    feePayer: "Parent", decisionMaker: "Joint",
    highestQualification: "BCA", currentStatus: "Student", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Callback", leadMotivation: "Portfolio Building",
    placementInterest: true, expectedSalary: "4 LPA", jobLocationPreference: "Kolkata",
    intentScore: 92, intentCategory: "High Intent", lastInteractionType: "Counseling Done", lastInteractionDate: "2026-03-24",
    temperature: "Hot", assignedCounselor: "u5", leadOwner: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-24", walkInTime: "14:00", walkInCounselor: "u5",
    counselingOutcome: "Strong Admission Intent",
    expectedDOJ: "2026-03-28", feeCommitment: "Full Admission Fee",
    documentStatus: "Documents Pending",
    documentsChecklist: { idProof: true, addressProof: false, educationCertificate: true, photographs: false },
    transferHistory: [
      { id: "t1", fromUserId: "u4", toUserId: "u5", reason: "Course specialization", timestamp: "2026-03-22T16:00:00" },
    ],
    activities: [
      { id: "a8", leadId: "l4", type: "Lead Created", description: "Lead from Meta Ad — Free Callback", timestamp: "2026-03-21T09:00:00" },
      { id: "a9", leadId: "l4", type: "Call Connected", description: "Very interested, wants counseling", channel: "Phone Call", userId: "u4", timestamp: "2026-03-21T11:00:00" },
      { id: "a9b", leadId: "l4", type: "Walk-in Scheduled", description: "Walk-in scheduled by telecaller Priya", timestamp: "2026-03-22T11:30:00" },
      { id: "a10", leadId: "l4", type: "Walk-in Completed", description: "Walk-in counseling session completed", userId: "u5", timestamp: "2026-03-24T14:00:00" },
      { id: "a10b", leadId: "l4", type: "Ownership Transfer", description: "Ownership transferred to Manjari Chakraborty", timestamp: "2026-03-24T14:01:00" },
      { id: "a10c", leadId: "l4", type: "Counseling Outcome", description: "Strong Admission Intent", timestamp: "2026-03-24T15:00:00" },
      { id: "a10d", leadId: "l4", type: "DoJ Set", description: "Expected joining date: 2026-03-28 · Fee: Full Admission Fee", timestamp: "2026-03-24T15:30:00" },
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
    interestedCourse: "AI / ML", assignedTelecallerId: "u3", status: "Qualified", createdAt: "2026-03-20",
    leadScore: 88, leadQuality: "Hot", budgetRange: "₹2.6L", urgencyLevel: "High", otherInstitutes: "",
    highestQualification: "B.Tech", currentStatus: "Fresher", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Apply Now", leadMotivation: "Job Placement",
    intentScore: 90, intentCategory: "High Intent", temperature: "Hot", priorityScore: 88, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: false },
    qualificationScore: 80,
    activities: [
      { id: "a12", leadId: "l5", type: "Lead Created", description: "Lead from Google Ad — Apply Now", timestamp: "2026-03-20T08:30:00" },
      { id: "a13", leadId: "l5", type: "Call Connected", description: "Very interested, budget confirmed", channel: "Phone Call", userId: "u3", timestamp: "2026-03-20T10:00:00" },
    ],
  },
  {
    id: "l6", name: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com", source: "LinkedIn", campaignId: "c3",
    interestedCourse: "Digital Marketing", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-19",
    leadScore: 95, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High", otherInstitutes: "",
    highestQualification: "B.Com Hons", currentStatus: "Working Professional", careerGoal: "Digital Marketer",
    leadSourceFormType: "Apply Now",
    intentScore: 98, intentCategory: "High Intent", temperature: "Hot", priorityScore: 98, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100,
    activities: [
      { id: "a14", leadId: "l6", type: "Admission Completed", description: "Admission completed for Digital Marketing", timestamp: "2026-03-20T14:00:00" },
    ],
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true, admissionProbability: "High",
  },
  {
    id: "l7", name: "Rohan Das", phone: "9876543216", email: "rohan@email.com", source: "Meta Ad", campaignId: "c4",
    interestedCourse: "Digital Marketing", assignedTelecallerId: "u3", status: "Lost", createdAt: "2026-03-18",
    leadScore: 25, leadQuality: "Cold", budgetRange: "", urgencyLevel: "Low", otherInstitutes: "Simplilearn",
    leadSourceFormType: "Download Brochure",
    intentScore: 10, intentCategory: "Low Intent", temperature: "Cold", lostReason: "Joined Competitor",
    priorityScore: 15, priorityCategory: "Low Priority",
    activities: [
      { id: "a15", leadId: "l7", type: "Lead Created", description: "Lead from Meta Ad — Brochure Download", timestamp: "2026-03-18T12:00:00" },
      { id: "a16", leadId: "l7", type: "Call Connected", description: "Not interested, joined Simplilearn", channel: "Phone Call", userId: "u3", timestamp: "2026-03-19T09:00:00" },
    ],
  },
  {
    id: "l8", name: "Kavya Iyer", phone: "9876543217", email: "kavya@email.com", source: "Walk-in", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-10",
    leadScore: 90, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High", otherInstitutes: "",
    currentEducation: "B.Com", graduationYear: "2026", currentOccupation: "Student",
    highestQualification: "B.Com", currentStatus: "Student", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Walk-in", leadMotivation: "Skill Upgrade",
    intentScore: 92, intentCategory: "High Intent", temperature: "Hot",
    priorityScore: 90, priorityCategory: "High Priority", assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-12", walkInTime: "11:00", walkInCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 10,
    activities: [
      { id: "a11", leadId: "l8", type: "Lead Created", description: "Walk-in inquiry", timestamp: "2026-03-10T09:00:00" },
      { id: "a11b", leadId: "l8", type: "Admission Completed", description: "Admission for UI/UX Design", timestamp: "2026-03-14T11:00:00" },
    ],
  },
  // ── Additional leads for Shreya (u3) across all pipeline stages ──
  {
    id: "l9", name: "Sneha Mukherjee", phone: "9876543218", email: "sneha@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "Graphic Design", assignedTelecallerId: "u3", status: "New", createdAt: "2026-03-25",
    leadScore: 55, leadQuality: "Warm", budgetRange: "₹45k", urgencyLevel: "Medium",
    highestQualification: "Class 12", currentStatus: "Student", careerGoal: "Graphic Designer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Free Callback", leadMotivation: "Skill Upgrade",
    intentScore: 50, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 55, priorityCategory: "Medium Priority",
    activities: [{ id: "a17", leadId: "l9", type: "Lead Created", description: "Google Ad lead — callback request", timestamp: "2026-03-25T08:30:00" }],
  },
  {
    id: "l10", name: "Rahul Chatterjee", phone: "9876543219", email: "rahul.c@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "Web Design", assignedTelecallerId: "u3", status: "Contacted", createdAt: "2026-03-22",
    leadScore: 65, leadQuality: "Warm", budgetRange: "₹45k", urgencyLevel: "Medium",
    highestQualification: "B.Sc", currentStatus: "Fresher", careerGoal: "Web Developer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Apply Now", leadMotivation: "Job Placement",
    intentScore: 62, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 65, priorityCategory: "Medium Priority",
    activities: [
      { id: "a18", leadId: "l10", type: "Lead Created", description: "Meta Ad lead", timestamp: "2026-03-22T09:00:00" },
      { id: "a19", leadId: "l10", type: "Call Connected", description: "Interested in Web Design, wants demo", channel: "Phone Call", userId: "u3", timestamp: "2026-03-22T11:00:00" },
    ],
  },
  {
    id: "l11", name: "Priyanka Basu", phone: "9876543220", email: "priyanka.b@email.com", source: "Referral", campaignId: "c1",
    interestedCourse: "Motion Graphics", assignedTelecallerId: "u3", status: "Follow-up", createdAt: "2026-03-21",
    leadScore: 70, leadQuality: "Warm", budgetRange: "₹1.18L", urgencyLevel: "Medium",
    highestQualification: "B.A", currentStatus: "Fresher", careerGoal: "Animator", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Free Counselling", leadMotivation: "Portfolio Building",
    intentScore: 68, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 70, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    activities: [
      { id: "a20", leadId: "l11", type: "Lead Created", description: "Referral from alumni", timestamp: "2026-03-21T10:00:00" },
      { id: "a21", leadId: "l11", type: "Call Connected", description: "Wants to see portfolio samples", channel: "Phone Call", userId: "u3", timestamp: "2026-03-21T14:00:00" },
      { id: "a22", leadId: "l11", type: "Follow-up Scheduled", description: "Send portfolio samples via email", timestamp: "2026-03-21T14:10:00" },
    ],
  },
  {
    id: "l12", name: "Tanmay Sen", phone: "9876543221", email: "tanmay@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "Full Stack Development", assignedTelecallerId: "u3", status: "Counseling", createdAt: "2026-03-19",
    leadScore: 82, leadQuality: "Hot", budgetRange: "₹4.1L", urgencyLevel: "High",
    highestQualification: "B.Tech", currentStatus: "Working Professional", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Apply Now", leadMotivation: "Career Switch",
    intentScore: 85, intentCategory: "High Intent", temperature: "Hot", priorityScore: 82, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Scheduled", walkInDate: "2026-03-26", walkInTime: "11:00", walkInCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, admissionProbability: "High",
    activities: [
      { id: "a23", leadId: "l12", type: "Lead Created", description: "Google Ad — Apply Now", timestamp: "2026-03-19T08:00:00" },
      { id: "a24", leadId: "l12", type: "Call Connected", description: "Budget confirmed, wants counseling", channel: "Phone Call", userId: "u3", timestamp: "2026-03-19T10:30:00" },
      { id: "a25", leadId: "l12", type: "Walk-in Scheduled", description: "Walk-in counseling scheduled for 2026-03-26 at 11:00", timestamp: "2026-03-22T16:00:00" },
    ],
  },
  {
    id: "l13", name: "Megha Saha", phone: "9876543222", email: "megha@email.com", source: "Instagram Organic", campaignId: "c4",
    interestedCourse: "Graphic Design", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-10",
    leadScore: 90, leadQuality: "Hot", budgetRange: "₹45k", urgencyLevel: "High",
    highestQualification: "Diploma", currentStatus: "Fresher", careerGoal: "Graphic Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Counselling", leadMotivation: "Job Placement",
    intentScore: 80, intentCategory: "High Intent", temperature: "Hot", priorityScore: 78, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100,
    activities: [
      { id: "a26", leadId: "l13", type: "Lead Created", description: "Instagram DM inquiry", timestamp: "2026-03-10T11:00:00" },
      { id: "a27", leadId: "l13", type: "Admission Completed", description: "Admission for Graphic Design", timestamp: "2026-03-14T15:00:00" },
    ],
  },
  {
    id: "l14", name: "Saurabh Mondal", phone: "9876543223", email: "saurabh@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "Game Development", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-15",
    leadScore: 95, leadQuality: "Hot", budgetRange: "₹1.9L", urgencyLevel: "High",
    highestQualification: "B.Tech", currentStatus: "Fresher", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Apply Now", leadMotivation: "Job Placement",
    intentScore: 96, intentCategory: "High Intent", temperature: "Hot", priorityScore: 95, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, admissionProbability: "High",
    activities: [
      { id: "a28", leadId: "l14", type: "Lead Created", description: "Meta Ad lead", timestamp: "2026-03-15T09:00:00" },
      { id: "a29", leadId: "l14", type: "Admission Completed", description: "Admission for Game Development", timestamp: "2026-03-18T12:00:00" },
    ],
  },
  {
    id: "l15", name: "Nisha Ghosh", phone: "9876543224", email: "nisha@email.com", source: "Walk-in", campaignId: "c1",
    interestedCourse: "WordPress", assignedTelecallerId: "u3", status: "Lost", createdAt: "2026-03-16",
    leadScore: 20, leadQuality: "Cold", budgetRange: "₹45k", urgencyLevel: "Low",
    highestQualification: "Class 12", currentStatus: "Student", leadSourceFormType: "Walk-in",
    intentScore: 15, intentCategory: "Low Intent", temperature: "Cold", lostReason: "Budget Issue",
    priorityScore: 20, priorityCategory: "Low Priority",
    activities: [
      { id: "a30", leadId: "l15", type: "Lead Created", description: "Walk-in inquiry", timestamp: "2026-03-16T10:00:00" },
      { id: "a31", leadId: "l15", type: "Call Connected", description: "Cannot afford right now", channel: "Phone Call", userId: "u3", timestamp: "2026-03-17T09:00:00" },
    ],
  },
  // ── Additional leads for Priya (u4) across stages ──
  {
    id: "l16", name: "Aditya Roy", phone: "9876543225", email: "aditya.r@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "AI / ML", assignedTelecallerId: "u4", status: "New", createdAt: "2026-03-25",
    leadScore: 60, leadQuality: "Warm", budgetRange: "₹2.6L", urgencyLevel: "Medium",
    highestQualification: "B.Tech", currentStatus: "Working Professional", careerGoal: "Full Stack Developer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Apply Now", leadMotivation: "Career Switch",
    intentScore: 58, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 60, priorityCategory: "Medium Priority",
    activities: [{ id: "a32", leadId: "l16", type: "Lead Created", description: "Google Ad — Apply Now", timestamp: "2026-03-25T07:30:00" }],
  },
  {
    id: "l17", name: "Riya Banerjee", phone: "9876543226", email: "riya.b@email.com", source: "Referral", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u4", status: "Contacted", createdAt: "2026-03-23",
    leadScore: 75, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High",
    highestQualification: "BCA", currentStatus: "Fresher", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Counselling", leadMotivation: "Portfolio Building",
    intentScore: 78, intentCategory: "High Intent", temperature: "Hot", priorityScore: 75, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    activities: [
      { id: "a33", leadId: "l17", type: "Lead Created", description: "Referral from current student", timestamp: "2026-03-23T08:00:00" },
      { id: "a34", leadId: "l17", type: "Call Connected", description: "Excited about UI/UX program", channel: "Phone Call", userId: "u4", timestamp: "2026-03-23T11:30:00" },
    ],
  },
  {
    id: "l18", name: "Sourav Kar", phone: "9876543227", email: "sourav.k@email.com", source: "Education Fair", campaignId: "c3",
    interestedCourse: "Full Stack Development", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-08",
    leadScore: 92, leadQuality: "Hot", budgetRange: "₹4.1L", urgencyLevel: "High",
    highestQualification: "BBA", currentStatus: "Fresher", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Register Now", leadMotivation: "Job Placement",
    intentScore: 90, intentCategory: "High Intent", temperature: "Hot", priorityScore: 92, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, admissionProbability: "High",
    activities: [
      { id: "a35", leadId: "l18", type: "Lead Created", description: "Education Fair signup", timestamp: "2026-03-08T10:00:00" },
      { id: "a36", leadId: "l18", type: "Admission Completed", description: "Admission for Full Stack Development", timestamp: "2026-03-12T14:00:00" },
    ],
  },
  {
    id: "l19", name: "Pooja Sharma", phone: "9876543228", email: "pooja.s@email.com", source: "Meta Ad", campaignId: "c4",
    interestedCourse: "Digital Marketing", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-14",
    leadScore: 92, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High",
    highestQualification: "B.Com Hons", currentStatus: "Working Professional", careerGoal: "Digital Marketer",
    leadSourceFormType: "Apply Now", leadMotivation: "Skill Upgrade",
    intentScore: 94, intentCategory: "High Intent", temperature: "Hot", priorityScore: 92, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: false },
    qualificationScore: 80,
    activities: [
      { id: "a37", leadId: "l19", type: "Admission Completed", description: "Admission for Digital Marketing", timestamp: "2026-03-17T11:00:00" },
    ],
    scholarshipApplied: true, scholarshipPercentage: 15,
  },
  {
    id: "l20", name: "Vikash Tiwari", phone: "9876543229", email: "vikash@email.com", source: "YouTube", campaignId: "c2",
    interestedCourse: "AI / ML", assignedTelecallerId: "u4", status: "Lost", createdAt: "2026-03-12",
    leadScore: 30, leadQuality: "Cold", budgetRange: "", urgencyLevel: "Low",
    highestQualification: "B.Sc", currentStatus: "Unemployed", leadSourceFormType: "Download Brochure",
    intentScore: 18, intentCategory: "Low Intent", temperature: "Cold", lostReason: "No Response",
    priorityScore: 18, priorityCategory: "Low Priority",
    activities: [{ id: "a38", leadId: "l20", type: "Lead Created", description: "YouTube ad lead", timestamp: "2026-03-12T09:00:00" }],
  },
  // ── Extra leads to fill Counseling and more stages ──
  {
    id: "l21", name: "Ankita Dey", phone: "9876543230", email: "ankita.d@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u3", status: "Counseling", createdAt: "2026-03-20",
    leadScore: 85, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High",
    highestQualification: "B.Sc", currentStatus: "Fresher", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Counselling", leadMotivation: "Job Placement",
    intentScore: 86, intentCategory: "High Intent", temperature: "Hot", priorityScore: 85, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100, admissionProbability: "High", scholarshipApplied: true, scholarshipPercentage: 10,
    activities: [
      { id: "a39", leadId: "l21", type: "Lead Created", description: "Google Ad lead", timestamp: "2026-03-20T09:00:00" },
      { id: "a40", leadId: "l21", type: "Counseling Done", description: "Counseling completed, ready for admission", userId: "u5", timestamp: "2026-03-23T14:00:00" },
    ],
  },
  {
    id: "l22", name: "Debashis Paul", phone: "9876543231", email: "debashis@email.com", source: "Walk-in", campaignId: "c1",
    interestedCourse: "HTML & CSS", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-08",
    leadScore: 70, leadQuality: "Warm", budgetRange: "₹15k", urgencyLevel: "Medium",
    highestQualification: "Class 12", currentStatus: "Student", careerGoal: "Web Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Walk-in", leadMotivation: "Skill Upgrade",
    intentScore: 65, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 70, priorityCategory: "Medium Priority",
    activities: [
      { id: "a41", leadId: "l22", type: "Lead Created", description: "Walk-in inquiry — basic web course", timestamp: "2026-03-08T11:00:00" },
      { id: "a41b", leadId: "l22", type: "Admission Completed", description: "Admission for HTML & CSS", timestamp: "2026-03-10T10:00:00" },
    ],
  },
  {
    id: "l23", name: "Shreya Mitra", phone: "9876543232", email: "shreya.m@email.com", source: "Alumni Referral", campaignId: "c1",
    interestedCourse: "Motion Graphics", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-05",
    leadScore: 88, leadQuality: "Hot", budgetRange: "₹1.18L", urgencyLevel: "High",
    highestQualification: "B.A", currentStatus: "Fresher", careerGoal: "Animator", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Callback", leadMotivation: "Portfolio Building",
    intentScore: 85, intentCategory: "High Intent", temperature: "Hot", priorityScore: 88, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-08", walkInTime: "15:00", walkInCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 10,
    activities: [
      { id: "a42", leadId: "l23", type: "Lead Created", description: "Alumni referral", timestamp: "2026-03-05T08:00:00" },
      { id: "a43", leadId: "l23", type: "Admission Completed", description: "Admission for Motion Graphics", timestamp: "2026-03-10T12:00:00" },
    ],
  },
  {
    id: "l24", name: "Kunal Ghosh", phone: "9876543233", email: "kunal.g@email.com", source: "Partner Institute", campaignId: "c3",
    interestedCourse: "Full Stack Development", assignedTelecallerId: "u3", status: "Follow-up", createdAt: "2026-03-19",
    leadScore: 74, leadQuality: "Warm", budgetRange: "₹4.1L", urgencyLevel: "Medium",
    highestQualification: "BCA", currentStatus: "Working Professional", careerGoal: "Full Stack Developer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Register Now", leadMotivation: "Career Switch",
    intentScore: 72, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 74, priorityCategory: "High Priority",
    activities: [
      { id: "a44", leadId: "l24", type: "Lead Created", description: "Partner institute referral", timestamp: "2026-03-19T10:00:00" },
      { id: "a45", leadId: "l24", type: "Call Connected", description: "Needs EMI option details", channel: "Phone Call", userId: "u3", timestamp: "2026-03-19T15:00:00" },
    ],
  },
  {
    id: "l25", name: "Ritika Sarkar", phone: "9876543234", email: "ritika.s@email.com", source: "Instagram Organic", campaignId: "c4",
    interestedCourse: "Graphic Design", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-06",
    leadScore: 85, leadQuality: "Hot", budgetRange: "₹45k", urgencyLevel: "High",
    highestQualification: "Diploma", currentStatus: "Fresher", careerGoal: "Graphic Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Counselling", leadMotivation: "Job Placement",
    intentScore: 82, intentCategory: "High Intent", temperature: "Hot", priorityScore: 85, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-09", walkInTime: "14:00", walkInCounselor: "u5",
    qualification: { budgetConfirmed: true, courseInterestConfirmed: true, locationPreference: true, startTimeline: true, placementExpectation: true },
    qualificationScore: 100,
    activities: [
      { id: "a46", leadId: "l25", type: "Lead Created", description: "Instagram DM inquiry", timestamp: "2026-03-06T09:00:00" },
      { id: "a47", leadId: "l25", type: "Admission Completed", description: "Admission for Graphic Design", timestamp: "2026-03-11T14:00:00" },
    ],
  },
  // Walk-in scheduled for today (l26)
  {
    id: "l26", name: "Soumya Ray", phone: "9876543235", email: "soumya.r@email.com", source: "Walk-in", campaignId: "c1",
    interestedCourse: "Digital Marketing", assignedTelecallerId: "u3", status: "Interested", createdAt: "2026-03-23",
    leadScore: 72, leadQuality: "Warm", budgetRange: "₹90k", urgencyLevel: "Medium",
    highestQualification: "B.Com", currentStatus: "Working Professional", careerGoal: "Digital Marketer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Free Counselling", leadMotivation: "Skill Upgrade",
    intentScore: 70, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 72, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Scheduled", walkInDate: "2026-03-25", walkInTime: "10:30", walkInCounselor: "u5",
    activities: [
      { id: "a48", leadId: "l26", type: "Lead Created", description: "Walk-in inquiry via telecaller", timestamp: "2026-03-23T09:00:00" },
      { id: "a49", leadId: "l26", type: "Call Connected", description: "Interested in Digital Marketing", channel: "Phone Call", userId: "u3", timestamp: "2026-03-23T10:00:00" },
      { id: "a50", leadId: "l26", type: "Walk-in Scheduled", description: "Walk-in scheduled for 2026-03-25 at 10:30", timestamp: "2026-03-23T10:15:00" },
    ],
  },
  // Walk-in No Show (l27)
  {
    id: "l27", name: "Arnab Bhattacharya", phone: "9876543236", email: "arnab.b@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "AI / ML", assignedTelecallerId: "u4", status: "Interested", createdAt: "2026-03-20",
    leadScore: 65, leadQuality: "Warm", budgetRange: "₹2.6L", urgencyLevel: "Medium",
    highestQualification: "B.Tech", currentStatus: "Working Professional", careerGoal: "Full Stack Developer",
    intentScore: 60, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 65, priorityCategory: "Medium Priority",
    assignedCounselor: "u5",
    walkInStatus: "No Show", walkInDate: "2026-03-24", walkInTime: "11:00", walkInCounselor: "u5",
    activities: [
      { id: "a51", leadId: "l27", type: "Lead Created", description: "Google Ad lead", timestamp: "2026-03-20T09:00:00" },
      { id: "a52", leadId: "l27", type: "Walk-in Scheduled", description: "Walk-in scheduled for 2026-03-24", timestamp: "2026-03-21T11:00:00" },
      { id: "a53", leadId: "l27", type: "Walk-in No Show", description: "Student did not show up", timestamp: "2026-03-24T12:00:00" },
    ],
  },
  // Additional admitted leads (l28-l31) for 12 total admissions
  {
    id: "l28", name: "Amit Bansal", phone: "9876543237", email: "amit.b@email.com", source: "Meta Ad", campaignId: "c1",
    interestedCourse: "Web Design", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-03",
    leadScore: 88, leadQuality: "Hot", budgetRange: "₹45k", urgencyLevel: "High",
    highestQualification: "B.Com", currentStatus: "Working Professional", careerGoal: "Web Developer",
    leadSourceFormType: "Apply Now", leadMotivation: "Freelancing",
    intentScore: 85, intentCategory: "High Intent", temperature: "Hot", priorityScore: 88, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    activities: [
      { id: "a54", leadId: "l28", type: "Lead Created", description: "Meta Ad lead", timestamp: "2026-03-03T09:00:00" },
      { id: "a55", leadId: "l28", type: "Admission Completed", description: "Admission for Web Design", timestamp: "2026-03-07T11:00:00" },
    ],
  },
  {
    id: "l29", name: "Tanya Gupta", phone: "9876543238", email: "tanya.g@email.com", source: "Google Ad", campaignId: "c2",
    interestedCourse: "AI / ML", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-01",
    leadScore: 92, leadQuality: "Hot", budgetRange: "₹2.6L", urgencyLevel: "High",
    highestQualification: "M.Tech", currentStatus: "Working Professional", careerGoal: "Full Stack Developer",
    leadSourceFormType: "Apply Now", leadMotivation: "Career Switch",
    intentScore: 94, intentCategory: "High Intent", temperature: "Hot", priorityScore: 92, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-04", walkInTime: "10:00", walkInCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 5,
    activities: [
      { id: "a56", leadId: "l29", type: "Lead Created", description: "Google Ad lead", timestamp: "2026-03-01T08:00:00" },
      { id: "a57", leadId: "l29", type: "Admission Completed", description: "Admission for AI / ML", timestamp: "2026-03-06T14:00:00" },
    ],
  },
  {
    id: "l30", name: "Nikhil Pal", phone: "9876543239", email: "nikhil.p@email.com", source: "LinkedIn", campaignId: "c3",
    interestedCourse: "WordPress", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-02",
    leadScore: 75, leadQuality: "Warm", budgetRange: "₹45k", urgencyLevel: "Medium",
    highestQualification: "B.A", currentStatus: "Working Professional", careerGoal: "Web Developer",
    leadSourceFormType: "Register Now", leadMotivation: "Freelancing",
    intentScore: 72, intentCategory: "Medium Intent", temperature: "Warm", priorityScore: 75, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    activities: [
      { id: "a58", leadId: "l30", type: "Lead Created", description: "LinkedIn lead", timestamp: "2026-03-02T10:00:00" },
      { id: "a59", leadId: "l30", type: "Admission Completed", description: "Admission for WordPress", timestamp: "2026-03-06T11:00:00" },
    ],
  },
  {
    id: "l31", name: "Swati Mishra", phone: "9876543240", email: "swati.m@email.com", source: "Meta Ad", campaignId: "c4",
    interestedCourse: "Graphic Design", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-04",
    leadScore: 82, leadQuality: "Hot", budgetRange: "₹45k", urgencyLevel: "High",
    highestQualification: "B.Sc", currentStatus: "Fresher", careerGoal: "Graphic Designer",
    leadSourceFormType: "Free Counselling", leadMotivation: "Job Placement",
    intentScore: 80, intentCategory: "High Intent", temperature: "Hot", priorityScore: 82, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 20,
    activities: [
      { id: "a60", leadId: "l31", type: "Lead Created", description: "Meta Ad lead", timestamp: "2026-03-04T09:00:00" },
      { id: "a61", leadId: "l31", type: "Admission Completed", description: "Admission for Graphic Design", timestamp: "2026-03-08T10:00:00" },
    ],
  },
  // ── Admissions from Referral, YouTube, Partner Institute sources ──
  {
    id: "l32", name: "Deepak Verma", phone: "9876543241", email: "deepak.v@email.com", source: "Referral", campaignId: "c1",
    interestedCourse: "UI/UX Design", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-07",
    leadScore: 88, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High",
    highestQualification: "BCA", currentStatus: "Fresher", careerGoal: "UI/UX Designer", preferredStartTime: "Immediate",
    leadSourceFormType: "Free Callback", leadMotivation: "Job Placement",
    intentScore: 86, intentCategory: "High Intent", temperature: "Hot", priorityScore: 88, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-09", walkInTime: "11:30", walkInCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 10,
    activities: [
      { id: "a62", leadId: "l32", type: "Lead Created", description: "Referral from current student", timestamp: "2026-03-07T09:00:00" },
      { id: "a63", leadId: "l32", type: "Admission Completed", description: "Admission for UI/UX Design", timestamp: "2026-03-11T14:00:00" },
    ],
  },
  {
    id: "l33", name: "Manisha Rao", phone: "9876543242", email: "manisha.r@email.com", source: "YouTube", campaignId: "c2",
    interestedCourse: "Digital Marketing", assignedTelecallerId: "u4", status: "Admission", createdAt: "2026-03-05",
    leadScore: 80, leadQuality: "Hot", budgetRange: "₹90k", urgencyLevel: "High",
    highestQualification: "B.Com", currentStatus: "Working Professional", careerGoal: "Digital Marketer", preferredStartTime: "Within 1 Month",
    leadSourceFormType: "Free Counselling", leadMotivation: "Skill Upgrade",
    intentScore: 82, intentCategory: "High Intent", temperature: "Hot", priorityScore: 80, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    activities: [
      { id: "a64", leadId: "l33", type: "Lead Created", description: "YouTube tutorial viewer", timestamp: "2026-03-05T10:00:00" },
      { id: "a65", leadId: "l33", type: "Admission Completed", description: "Admission for Digital Marketing", timestamp: "2026-03-09T15:00:00" },
    ],
  },
  {
    id: "l34", name: "Karan Bhatt", phone: "9876543243", email: "karan.b@email.com", source: "Partner Institute", campaignId: "c3",
    interestedCourse: "Game Development", assignedTelecallerId: "u3", status: "Admission", createdAt: "2026-03-03",
    leadScore: 90, leadQuality: "Hot", budgetRange: "₹1.9L", urgencyLevel: "High",
    highestQualification: "B.Tech", currentStatus: "Fresher", careerGoal: "Full Stack Developer", preferredStartTime: "Immediate",
    leadSourceFormType: "Register Now", leadMotivation: "Job Placement",
    intentScore: 88, intentCategory: "High Intent", temperature: "Hot", priorityScore: 90, priorityCategory: "High Priority",
    assignedCounselor: "u5",
    walkInStatus: "Completed", walkInDate: "2026-03-05", walkInTime: "14:00", walkInCounselor: "u5",
    scholarshipApplied: true, scholarshipPercentage: 5,
    activities: [
      { id: "a66", leadId: "l34", type: "Lead Created", description: "Partner institute referral", timestamp: "2026-03-03T08:00:00" },
      { id: "a67", leadId: "l34", type: "Admission Completed", description: "Admission for Game Development", timestamp: "2026-03-07T11:00:00" },
    ],
  },
];

/* ═══════ CALL LOGS ═══════ */
export const mockCallLogs: CallLog[] = [
  { id: "cl1", leadId: "l1", telecallerId: "u3", outcome: "Connected", notes: "Interested in weekend batch", nextFollowUp: "2026-03-26", createdAt: "2026-03-24" },
  { id: "cl2", leadId: "l2", telecallerId: "u3", outcome: "Interested", notes: "Wants to know about placement support", nextFollowUp: "2026-03-27", createdAt: "2026-03-23",
    conversationInsight: { careerGoal: "Data Analyst", budgetRange: "₹2.6L", leadMotivation: "Career Switch", placementExpectation: "Within 6 months" } },
  { id: "cl3", leadId: "l3", telecallerId: "u4", outcome: "Call later", notes: "Busy, asked to call after 5 PM", nextFollowUp: "2026-03-25", createdAt: "2026-03-22" },
  { id: "cl4", leadId: "l7", telecallerId: "u3", outcome: "Not interested", notes: "Found another institute", nextFollowUp: "", createdAt: "2026-03-20", notInterestedReason: "Joined Competitor" },
  { id: "cl5", leadId: "l9", telecallerId: "u3", outcome: "Not Answered", notes: "No response — will retry", nextFollowUp: "2026-03-26", createdAt: "2026-03-25" },
  { id: "cl6", leadId: "l10", telecallerId: "u3", outcome: "Connected", notes: "Interested in Web Design, wants demo class", nextFollowUp: "2026-03-24", createdAt: "2026-03-22" },
  { id: "cl7", leadId: "l11", telecallerId: "u3", outcome: "Interested", notes: "Wants portfolio samples before deciding", nextFollowUp: "2026-03-23", createdAt: "2026-03-21",
    conversationInsight: { careerGoal: "Animator", budgetRange: "₹1.18L", leadMotivation: "Portfolio Building", placementExpectation: "After course" } },
  { id: "cl8", leadId: "l12", telecallerId: "u3", outcome: "Interested", notes: "Budget confirmed, wants counseling ASAP", nextFollowUp: "2026-03-20", createdAt: "2026-03-19",
    conversationInsight: { careerGoal: "Full Stack Developer", budgetRange: "₹4.1L", leadMotivation: "Career Switch", placementExpectation: "Within 3 months" } },
  { id: "cl9", leadId: "l13", telecallerId: "u3", outcome: "Connected", notes: "Portfolio-ready, very keen on joining", nextFollowUp: "2026-03-19", createdAt: "2026-03-18" },
  { id: "cl10", leadId: "l14", telecallerId: "u3", outcome: "Interested", notes: "Wants Game Dev, placement a must", nextFollowUp: "2026-03-16", createdAt: "2026-03-15" },
  { id: "cl11", leadId: "l15", telecallerId: "u3", outcome: "Not interested", notes: "Budget issue, cannot afford", nextFollowUp: "", createdAt: "2026-03-17", notInterestedReason: "Course Too Expensive" },
  { id: "cl12", leadId: "l16", telecallerId: "u4", outcome: "Not Answered", notes: "No pick up", nextFollowUp: "2026-03-26", createdAt: "2026-03-25" },
  { id: "cl13", leadId: "l17", telecallerId: "u4", outcome: "Interested", notes: "Excited about UI/UX — wants counseling", nextFollowUp: "2026-03-24", createdAt: "2026-03-23" },
  { id: "cl14", leadId: "l18", telecallerId: "u4", outcome: "Interested", notes: "Ready for next batch, budget OK", nextFollowUp: "", createdAt: "2026-03-17" },
  { id: "cl15", leadId: "l19", telecallerId: "u4", outcome: "Connected", notes: "Admission confirmed", nextFollowUp: "", createdAt: "2026-03-15" },
  { id: "cl16", leadId: "l20", telecallerId: "u4", outcome: "Switched Off", notes: "Phone switched off 3 attempts", nextFollowUp: "2026-03-14", createdAt: "2026-03-13" },
  { id: "cl17", leadId: "l21", telecallerId: "u3", outcome: "Interested", notes: "Wants scholarship info", nextFollowUp: "2026-03-21", createdAt: "2026-03-20" },
  { id: "cl18", leadId: "l22", telecallerId: "u3", outcome: "Connected", notes: "Interested in basic HTML/CSS course", nextFollowUp: "2026-03-26", createdAt: "2026-03-25" },
  { id: "cl19", leadId: "l23", telecallerId: "u4", outcome: "Connected", notes: "Wants demo class for Motion Graphics", nextFollowUp: "2026-03-22", createdAt: "2026-03-20" },
  { id: "cl20", leadId: "l24", telecallerId: "u3", outcome: "Interested", notes: "Needs EMI details, partner institute referral", nextFollowUp: "2026-03-21", createdAt: "2026-03-19" },
  { id: "cl21", leadId: "l25", telecallerId: "u4", outcome: "Connected", notes: "Interested in Graphic Design, sent for counseling", nextFollowUp: "", createdAt: "2026-03-18" },
];

/* ═══════ FOLLOW-UPS ═══════ */
export const mockFollowUps: FollowUp[] = [
  { id: "f1", leadId: "l1", assignedTo: "u3", date: "2026-03-26", notes: "Call about weekend batch availability", completed: false, createdAt: "2026-03-24", followUpType: "Phone Call" },
  { id: "f2", leadId: "l2", assignedTo: "u3", date: "2026-03-27", notes: "Share placement brochure", completed: false, createdAt: "2026-03-23", followUpType: "WhatsApp" },
  { id: "f3", leadId: "l3", assignedTo: "u4", date: "2026-03-25", notes: "Call after 5 PM", completed: false, createdAt: "2026-03-22", followUpType: "Phone Call" },
  { id: "f4", leadId: "l4", assignedTo: "u5", date: "2026-03-24", notes: "Counseling session scheduled", completed: true, createdAt: "2026-03-21", followUpType: "Counseling Meeting" },
  { id: "f5", leadId: "l9", assignedTo: "u3", date: "2026-03-26", notes: "Retry call — no answer earlier", completed: false, createdAt: "2026-03-25", followUpType: "Phone Call" },
  { id: "f6", leadId: "l10", assignedTo: "u3", date: "2026-03-24", notes: "Schedule demo class for Web Design", completed: false, createdAt: "2026-03-22", followUpType: "Demo Class" },
  { id: "f7", leadId: "l11", assignedTo: "u3", date: "2026-03-23", notes: "Email portfolio samples", completed: true, createdAt: "2026-03-21", followUpType: "Email" },
  { id: "f8", leadId: "l12", assignedTo: "u5", date: "2026-03-22", notes: "Schedule counseling for Full Stack", completed: true, createdAt: "2026-03-19", followUpType: "Counseling Meeting" },
  { id: "f9", leadId: "l16", assignedTo: "u4", date: "2026-03-26", notes: "Retry call — didn't pick up", completed: false, createdAt: "2026-03-25", followUpType: "Phone Call" },
  { id: "f10", leadId: "l17", assignedTo: "u5", date: "2026-03-25", notes: "Counseling for UI/UX", completed: false, createdAt: "2026-03-23", followUpType: "Counseling Meeting" },
  { id: "f11", leadId: "l23", assignedTo: "u4", date: "2026-03-22", notes: "Demo class for Motion Graphics", completed: false, createdAt: "2026-03-20", followUpType: "Demo Class" },
  { id: "f12", leadId: "l24", assignedTo: "u3", date: "2026-03-21", notes: "Share EMI plan details via WhatsApp", completed: true, createdAt: "2026-03-19", followUpType: "WhatsApp" },
  { id: "f13", leadId: "l21", assignedTo: "u5", date: "2026-03-24", notes: "Discuss scholarship and admission", completed: false, createdAt: "2026-03-20", followUpType: "Counseling Meeting" },
  { id: "f14", leadId: "l25", assignedTo: "u5", date: "2026-03-22", notes: "Follow up on counseling outcome", completed: true, createdAt: "2026-03-18", followUpType: "Phone Call" },
];

/* ═══════ ADMISSIONS (16 students across Red Apple courses) ═══════ */
// Sources: LinkedIn(2), Meta(4), Walk-in(2), Instagram(2), Education Fair(1), Alumni Referral(1), Google(1), Referral(1), YouTube(1), Partner Institute(1)
export const mockAdmissions: Admission[] = [
  {
    id: "a1", leadId: "l6", studentName: "Ishita Chopra", phone: "9876543215", email: "ishita@email.com",
    courseSelected: "Digital Marketing", batch: "DM-2026-A", admissionDate: "2026-03-20", totalFee: 90000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260320001",
    paymentType: "EMI", emiNumber: 1, totalEmis: 3,
    paymentHistory: [
      { id: "ph1", paymentDate: "2026-03-20", amountPaid: 35000, paymentMode: "Online Transfer", referenceNumber: "TXN20260320001", paymentType: "EMI", emiNumber: 1 },
    ],
    parentName: "Rajesh Chopra", parentPhone: "9876500001", studentBankName: "HDFC Bank", parentBankName: "SBI",
    createdAt: "2026-03-20",
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true,
  },
  {
    id: "a2", leadId: "l14", studentName: "Saurabh Mondal", phone: "9876543223", email: "saurabh@email.com",
    courseSelected: "Game Development", batch: "GD-2026-A", admissionDate: "2026-03-18", totalFee: 190000,
    paymentStatus: "Partial", paymentMode: "UPI", chequeNumber: "", transactionId: "TXN20260318001",
    paymentType: "EMI", emiNumber: 2, totalEmis: 4,
    paymentHistory: [
      { id: "ph2", paymentDate: "2026-03-18", amountPaid: 50000, paymentMode: "UPI", referenceNumber: "TXN20260318001", paymentType: "EMI", emiNumber: 1 },
      { id: "ph2b", paymentDate: "2026-03-25", amountPaid: 48000, paymentMode: "UPI", referenceNumber: "TXN20260325001", paymentType: "EMI", emiNumber: 2 },
    ],
    createdAt: "2026-03-18",
    scholarshipApplied: false, emiSelected: true,
  },
  {
    id: "a3", leadId: "l19", studentName: "Pooja Sharma", phone: "9876543228", email: "pooja.s@email.com",
    courseSelected: "Digital Marketing", batch: "DM-2026-B", admissionDate: "2026-03-17", totalFee: 90000,
    paymentStatus: "Paid", paymentMode: "Credit Card", chequeNumber: "", transactionId: "TXN20260317001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph3", paymentDate: "2026-03-17", amountPaid: 90000, paymentMode: "Credit Card", referenceNumber: "TXN20260317001", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-17",
    scholarshipApplied: true, scholarshipPercentage: 15, emiSelected: false,
  },
  {
    id: "a4", leadId: "l8", studentName: "Kavya Iyer", phone: "9876543217", email: "kavya@email.com",
    courseSelected: "UI/UX Design", batch: "UX-2026-A", admissionDate: "2026-03-14", totalFee: 90000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260314001",
    paymentType: "EMI", emiNumber: 1, totalEmis: 3,
    paymentHistory: [
      { id: "ph4", paymentDate: "2026-03-14", amountPaid: 30000, paymentMode: "Online Transfer", referenceNumber: "TXN20260314001", paymentType: "EMI", emiNumber: 1 },
    ],
    createdAt: "2026-03-14",
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true,
  },
  {
    id: "a5", leadId: "l13", studentName: "Megha Saha", phone: "9876543222", email: "megha@email.com",
    courseSelected: "Graphic Design", batch: "GD-2026-B", admissionDate: "2026-03-14", totalFee: 45000,
    paymentStatus: "Paid", paymentMode: "UPI", chequeNumber: "", transactionId: "TXN20260314002",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph5", paymentDate: "2026-03-14", amountPaid: 45000, paymentMode: "UPI", referenceNumber: "TXN20260314002", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-14",
    scholarshipApplied: false, emiSelected: false,
  },
  {
    id: "a6", leadId: "l18", studentName: "Sourav Kar", phone: "9876543227", email: "sourav.k@email.com",
    courseSelected: "Full Stack Development", batch: "FSD-2026-A", admissionDate: "2026-03-12", totalFee: 410000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260312001",
    paymentType: "EMI", emiNumber: 2, totalEmis: 6,
    paymentHistory: [
      { id: "ph6a", paymentDate: "2026-03-12", amountPaid: 80000, paymentMode: "Online Transfer", referenceNumber: "TXN20260312001", paymentType: "EMI", emiNumber: 1 },
      { id: "ph6b", paymentDate: "2026-03-25", amountPaid: 66000, paymentMode: "Online Transfer", referenceNumber: "TXN20260325002", paymentType: "EMI", emiNumber: 2 },
    ],
    createdAt: "2026-03-12",
    scholarshipApplied: false, emiSelected: true,
  },
  {
    id: "a7", leadId: "l22", studentName: "Debashis Paul", phone: "9876543231", email: "debashis@email.com",
    courseSelected: "HTML & CSS", batch: "HC-2026-A", admissionDate: "2026-03-10", totalFee: 15000,
    paymentStatus: "Paid", paymentMode: "Cash", chequeNumber: "", transactionId: "TXN20260310001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph7", paymentDate: "2026-03-10", amountPaid: 15000, paymentMode: "Cash", referenceNumber: "CASH20260310", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-10",
    scholarshipApplied: false, emiSelected: false,
  },
  {
    id: "a8", leadId: "l23", studentName: "Shreya Mitra", phone: "9876543232", email: "shreya.m@email.com",
    courseSelected: "Motion Graphics", batch: "MG-2026-A", admissionDate: "2026-03-10", totalFee: 118000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260310002",
    paymentType: "EMI", emiNumber: 1, totalEmis: 3,
    paymentHistory: [
      { id: "ph8", paymentDate: "2026-03-10", amountPaid: 40000, paymentMode: "Online Transfer", referenceNumber: "TXN20260310002", paymentType: "EMI", emiNumber: 1 },
    ],
    createdAt: "2026-03-10",
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true,
  },
  {
    id: "a9", leadId: "l25", studentName: "Ritika Sarkar", phone: "9876543234", email: "ritika.s@email.com",
    courseSelected: "Graphic Design", batch: "GD-2026-C", admissionDate: "2026-03-11", totalFee: 45000,
    paymentStatus: "Paid", paymentMode: "UPI", chequeNumber: "", transactionId: "TXN20260311001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph9", paymentDate: "2026-03-11", amountPaid: 45000, paymentMode: "UPI", referenceNumber: "TXN20260311001", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-11",
    scholarshipApplied: false, emiSelected: false,
  },
  {
    id: "a10", leadId: "l28", studentName: "Amit Bansal", phone: "9876543237", email: "amit.b@email.com",
    courseSelected: "Web Design", batch: "WD-2026-A", admissionDate: "2026-03-07", totalFee: 45000,
    paymentStatus: "Paid", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260307001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph10", paymentDate: "2026-03-07", amountPaid: 45000, paymentMode: "Online Transfer", referenceNumber: "TXN20260307001", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-07",
    scholarshipApplied: false, emiSelected: false,
  },
  {
    id: "a11", leadId: "l29", studentName: "Tanya Gupta", phone: "9876543238", email: "tanya.g@email.com",
    courseSelected: "AI / ML", batch: "AI-2026-A", admissionDate: "2026-03-06", totalFee: 260000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260306001",
    paymentType: "EMI", emiNumber: 2, totalEmis: 5,
    paymentHistory: [
      { id: "ph11a", paymentDate: "2026-03-06", amountPaid: 55000, paymentMode: "Online Transfer", referenceNumber: "TXN20260306001", paymentType: "EMI", emiNumber: 1 },
      { id: "ph11b", paymentDate: "2026-03-20", amountPaid: 52000, paymentMode: "Online Transfer", referenceNumber: "TXN20260320002", paymentType: "EMI", emiNumber: 2 },
    ],
    createdAt: "2026-03-06",
    scholarshipApplied: true, scholarshipPercentage: 5, emiSelected: true,
  },
  {
    id: "a12", leadId: "l30", studentName: "Nikhil Pal", phone: "9876543239", email: "nikhil.p@email.com",
    courseSelected: "WordPress", batch: "WP-2026-A", admissionDate: "2026-03-06", totalFee: 45000,
    paymentStatus: "Partial", paymentMode: "UPI", chequeNumber: "", transactionId: "TXN20260306002",
    paymentType: "EMI", emiNumber: 1, totalEmis: 2,
    paymentHistory: [
      { id: "ph12", paymentDate: "2026-03-06", amountPaid: 25000, paymentMode: "UPI", referenceNumber: "TXN20260306002", paymentType: "EMI", emiNumber: 1 },
    ],
    createdAt: "2026-03-06",
    scholarshipApplied: false, emiSelected: true,
  },
  {
    id: "a13", leadId: "l31", studentName: "Swati Mishra", phone: "9876543240", email: "swati.m@email.com",
    courseSelected: "Graphic Design", batch: "GD-2026-D", admissionDate: "2026-03-08", totalFee: 45000,
    paymentStatus: "Paid", paymentMode: "Cash", chequeNumber: "", transactionId: "CASH20260308001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph13", paymentDate: "2026-03-08", amountPaid: 45000, paymentMode: "Cash", referenceNumber: "CASH20260308001", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-08",
    scholarshipApplied: true, scholarshipPercentage: 20, emiSelected: false,
  },
  // ── Admissions from Referral, YouTube, Partner Institute ──
  {
    id: "a14", leadId: "l32", studentName: "Deepak Verma", phone: "9876543241", email: "deepak.v@email.com",
    courseSelected: "UI/UX Design", batch: "UX-2026-B", admissionDate: "2026-03-11", totalFee: 90000,
    paymentStatus: "Partial", paymentMode: "UPI", chequeNumber: "", transactionId: "TXN20260311002",
    paymentType: "EMI", emiNumber: 1, totalEmis: 3,
    paymentHistory: [
      { id: "ph14", paymentDate: "2026-03-11", amountPaid: 35000, paymentMode: "UPI", referenceNumber: "TXN20260311002", paymentType: "EMI", emiNumber: 1 },
    ],
    createdAt: "2026-03-11",
    scholarshipApplied: true, scholarshipPercentage: 10, emiSelected: true,
  },
  {
    id: "a15", leadId: "l33", studentName: "Manisha Rao", phone: "9876543242", email: "manisha.r@email.com",
    courseSelected: "Digital Marketing", batch: "DM-2026-C", admissionDate: "2026-03-09", totalFee: 90000,
    paymentStatus: "Paid", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260309001",
    paymentType: "Full Payment",
    paymentHistory: [
      { id: "ph15", paymentDate: "2026-03-09", amountPaid: 90000, paymentMode: "Online Transfer", referenceNumber: "TXN20260309001", paymentType: "Full Payment" },
    ],
    createdAt: "2026-03-09",
    scholarshipApplied: false, emiSelected: false,
  },
  {
    id: "a16", leadId: "l34", studentName: "Karan Bhatt", phone: "9876543243", email: "karan.b@email.com",
    courseSelected: "Game Development", batch: "GD-2026-B", admissionDate: "2026-03-07", totalFee: 190000,
    paymentStatus: "Partial", paymentMode: "Online Transfer", chequeNumber: "", transactionId: "TXN20260307002",
    paymentType: "EMI", emiNumber: 1, totalEmis: 4,
    paymentHistory: [
      { id: "ph16", paymentDate: "2026-03-07", amountPaid: 50000, paymentMode: "Online Transfer", referenceNumber: "TXN20260307002", paymentType: "EMI", emiNumber: 1 },
    ],
    createdAt: "2026-03-07",
    scholarshipApplied: true, scholarshipPercentage: 5, emiSelected: true,
  },
];

/* ═══════ MERGE INTERNSHIP LEADS INTO MAIN LEADS ═══════ */
// Add internship leads to the main leads array (cast is safe since Lead interface now supports programChannel)
const allMockLeads: Lead[] = [...mockLeads, ...internshipLeadEntries as unknown as Lead[]];

/* ═══════ LOCAL STORAGE HELPERS ═══════ */
const STORAGE_KEYS = {
  campaigns: "crm_campaigns",
  leads: "crm_leads",
  callLogs: "crm_call_logs",
  followUps: "crm_follow_ups",
  admissions: "crm_admissions",
  courses: "crm_courses",
  internshipAdmissions: "crm_internship_admissions",
  collegeAccounts: "crm_college_accounts",
  collegePrograms: "crm_college_programs",
  collegeStudents: "crm_college_students",
  schoolAccounts: "crm_school_accounts",
  schoolPrograms: "crm_school_programs",
  schoolStudents: "crm_school_students",
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

  getLeads: () => getOrInit(STORAGE_KEYS.leads, allMockLeads),
  saveLeads: (d: Lead[]) => save(STORAGE_KEYS.leads, d),

  getCallLogs: () => getOrInit(STORAGE_KEYS.callLogs, mockCallLogs),
  saveCallLogs: (d: CallLog[]) => save(STORAGE_KEYS.callLogs, d),

  getFollowUps: () => getOrInit(STORAGE_KEYS.followUps, mockFollowUps),
  saveFollowUps: (d: FollowUp[]) => save(STORAGE_KEYS.followUps, d),

  getAdmissions: () => getOrInit(STORAGE_KEYS.admissions, mockAdmissions),
  saveAdmissions: (d: Admission[]) => save(STORAGE_KEYS.admissions, d),

  getCourses: () => getOrInit(STORAGE_KEYS.courses, mockCourses),
  saveCourses: (d: Course[]) => save(STORAGE_KEYS.courses, d),

  // ── Multi-Vertical Stores ──
  getInternshipAdmissions: () => getOrInit(STORAGE_KEYS.internshipAdmissions, mockInternshipAdmissions),
  saveInternshipAdmissions: (d: InternshipAdmission[]) => save(STORAGE_KEYS.internshipAdmissions, d),

  getCollegeAccounts: () => getOrInit(STORAGE_KEYS.collegeAccounts, mockCollegeAccounts),
  saveCollegeAccounts: (d: CollegeAccount[]) => save(STORAGE_KEYS.collegeAccounts, d),

  getCollegePrograms: () => getOrInit(STORAGE_KEYS.collegePrograms, mockCollegePrograms),
  saveCollegePrograms: (d: CollegeProgram[]) => save(STORAGE_KEYS.collegePrograms, d),

  getCollegeStudents: () => getOrInit(STORAGE_KEYS.collegeStudents, mockCollegeStudents),
  saveCollegeStudents: (d: CollegeStudent[]) => save(STORAGE_KEYS.collegeStudents, d),

  getSchoolAccounts: () => getOrInit(STORAGE_KEYS.schoolAccounts, mockSchoolAccounts),
  saveSchoolAccounts: (d: SchoolAccount[]) => save(STORAGE_KEYS.schoolAccounts, d),

  getSchoolPrograms: () => getOrInit(STORAGE_KEYS.schoolPrograms, mockSchoolPrograms),
  saveSchoolPrograms: (d: SchoolProgram[]) => save(STORAGE_KEYS.schoolPrograms, d),

  getSchoolStudents: () => getOrInit(STORAGE_KEYS.schoolStudents, mockSchoolStudents),
  saveSchoolStudents: (d: SchoolStudent[]) => save(STORAGE_KEYS.schoolStudents, d),

  getUsers: () => mockUsers,

  resetAll: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
