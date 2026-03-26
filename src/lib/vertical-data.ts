/**
 * Mock data for multi-vertical entities:
 * Internship leads/admissions, College accounts/programs, School accounts/programs
 */
import {
  CollegeAccount, CollegeProgram, CollegeStudent,
  SchoolAccount, SchoolProgram, SchoolStudent,
  InternshipAdmission,
} from "./vertical-types";

// ── Internship Leads (stored as regular leads with programChannel + internship fields) ──
// These are added to mockLeads in mock-data.ts

// ── Internship Admissions ──
export const mockInternshipAdmissions: InternshipAdmission[] = [
  { id: "ia1", leadId: "li1", studentName: "Rohit Kumar", phone: "9876600001", email: "rohit.k@email.com", internshipCourse: "Web Development Internship", internshipDuration: "3 Months", internshipLocation: "Red Apple Campus", fee: 25000, enrollmentType: "Individual Student", batchName: "INT-WD-2026-A", admissionDate: "2026-03-15", createdAt: "2026-03-15" },
  { id: "ia2", leadId: "li2", studentName: "Anita Sharma", phone: "9876600002", email: "anita.s@email.com", internshipCourse: "Digital Marketing Internship", internshipDuration: "1 Month", internshipLocation: "Red Apple Campus", fee: 5000, enrollmentType: "Individual Student", batchName: "INT-DM-2026-A", admissionDate: "2026-03-18", createdAt: "2026-03-18" },
  { id: "ia3", leadId: "li3", studentName: "Vivek Patel", phone: "9876600003", email: "vivek.p@email.com", internshipCourse: "Graphic Design Internship", internshipDuration: "2 Months", internshipLocation: "College Campus", fee: 10000, enrollmentType: "College Batch", batchName: "INT-GD-2026-A", admissionDate: "2026-03-20", createdAt: "2026-03-20" },
  { id: "ia4", leadId: "li4", studentName: "Neha Gupta", phone: "9876600004", email: "neha.g@email.com", internshipCourse: "UI/UX Internship", internshipDuration: "3 Months", internshipLocation: "Red Apple Campus", fee: 25000, enrollmentType: "Individual Student", batchName: "INT-UX-2026-A", admissionDate: "2026-03-22", createdAt: "2026-03-22" },
  { id: "ia5", leadId: "li5", studentName: "Rahul Singh", phone: "9876600005", email: "rahul.s@email.com", internshipCourse: "AI/ML Internship", internshipDuration: "6 Months", internshipLocation: "Red Apple Campus", fee: 75000, enrollmentType: "Individual Student", batchName: "INT-AI-2026-A", admissionDate: "2026-03-24", createdAt: "2026-03-24" },
];

// ── College Accounts ──
export const mockCollegeAccounts: CollegeAccount[] = [
  { id: "col1", collegeName: "Techno India University", city: "Kolkata", state: "West Bengal", contactPersonName: "Dr. Sanjay Mukherjee", designation: "Dean of Academics", phone: "9876700001", email: "dean@technoindia.edu", totalStudentStrength: 3500, streamsOffered: ["Engineering", "Management", "Science"], pipelineStage: "Agreement Signed", createdAt: "2026-02-01", notes: "Strong tech focus, interested in AI/ML and Web Dev programs" },
  { id: "col2", collegeName: "St. Xavier's College", city: "Kolkata", state: "West Bengal", contactPersonName: "Prof. Mary D'Souza", designation: "Head of Placements", phone: "9876700002", email: "placements@stxaviers.edu", totalStudentStrength: 5000, streamsOffered: ["Commerce", "Arts", "Science"], pipelineStage: "Proposal Shared", createdAt: "2026-02-15", notes: "Interested in Digital Marketing and Design courses" },
  { id: "col3", collegeName: "Heritage Institute of Technology", city: "Kolkata", state: "West Bengal", contactPersonName: "Mr. Arun Ghosh", designation: "Training & Placement Officer", phone: "9876700003", email: "tpo@heritage.ac.in", totalStudentStrength: 2800, streamsOffered: ["Engineering", "Design"], pipelineStage: "Meeting Scheduled", createdAt: "2026-03-01", notes: "Looking for game dev and simulation programs" },
];

// ── College Programs ──
export const mockCollegePrograms: CollegeProgram[] = [
  { id: "cp1", collegeAccountId: "col1", programType: "Certificate Program", courseOffered: "Web Development", programDuration: "6 Months", trainingMode: "Hybrid (College + Red Apple)", enrollmentMode: "Joint Enrollment (College + Red Apple)", revenueModel: "Revenue Share", collegeSharePercentage: 30, redAppleSharePercentage: 70, totalStudentsEnrolled: 45, totalRevenue: 225000, createdAt: "2026-02-15" },
  { id: "cp2", collegeAccountId: "col1", programType: "Advanced Diploma Program", courseOffered: "AI/ML", programDuration: "12 Months", trainingMode: "Hybrid (Online + Offline)", enrollmentMode: "Red Apple Managed Enrollment", revenueModel: "Per Student Fee", perStudentFee: 8000, totalStudentsEnrolled: 30, totalRevenue: 240000, createdAt: "2026-02-20" },
];

// ── College Students ──
export const mockCollegeStudents: CollegeStudent[] = [
  { id: "cs1", collegeProgramId: "cp1", studentName: "Amit Sen", phone: "9876800001", email: "amit.s@tech.edu", courseSelected: "Web Development", batchName: "TIU-WD-2026-A", studentCategory: "Existing College Student", enrollmentSource: "College" },
  { id: "cs2", collegeProgramId: "cp1", studentName: "Priya Roy", phone: "9876800002", email: "priya.r@tech.edu", courseSelected: "Web Development", batchName: "TIU-WD-2026-A", studentCategory: "Existing College Student", enrollmentSource: "Red Apple" },
  { id: "cs3", collegeProgramId: "cp2", studentName: "Sourav Dey", phone: "9876800003", email: "sourav.d@tech.edu", courseSelected: "AI/ML", batchName: "TIU-AI-2026-A", studentCategory: "Existing College Student" },
];

// ── School Accounts ──
export const mockSchoolAccounts: SchoolAccount[] = [
  { id: "sch1", schoolName: "DPS Ruby Park", city: "Kolkata", contactPersonName: "Mrs. Ritu Agarwal", designation: "Principal", phone: "9876900001", email: "principal@dpsrubypark.edu", totalStudents: 1200, classCoverage: ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12"], pipelineStage: "Agreement Signed", createdAt: "2026-01-15", notes: "Interested in AI/ML and Creative Coding for senior students" },
  { id: "sch2", schoolName: "La Martiniere for Boys", city: "Kolkata", contactPersonName: "Mr. John Williams", designation: "IT Coordinator", phone: "9876900002", email: "it@lamartiniere.edu", totalStudents: 800, classCoverage: ["Class 6", "Class 7", "Class 8"], pipelineStage: "Program Launch", createdAt: "2026-01-20", notes: "Running Game Dev and 2D Design workshops" },
  { id: "sch3", schoolName: "South Point High School", city: "Kolkata", contactPersonName: "Dr. Ashok Kumar", designation: "Vice Principal", phone: "9876900003", email: "vp@southpoint.edu", totalStudents: 2000, classCoverage: ["Class 9", "Class 10", "Class 11", "Class 12"], pipelineStage: "Proposal Shared", createdAt: "2026-02-10", notes: "Evaluating Future Tech Foundation program" },
];

// ── School Programs ──
export const mockSchoolPrograms: SchoolProgram[] = [
  { id: "sp1", schoolAccountId: "sch1", courseOffered: "Basic AI/ML", classCoverage: ["Class 11", "Class 12"], trainingSchedule: "After School Hours", feeModel: "School Collects Fees", totalStudentsEnrolled: 60, feePerStudent: 3000, schoolSharePercentage: 25, redAppleSharePercentage: 75, totalRevenue: 180000, createdAt: "2026-02-01" },
  { id: "sp2", schoolAccountId: "sch2", courseOffered: "Game Development", classCoverage: ["Class 6", "Class 7", "Class 8"], trainingSchedule: "During School Hours", feeModel: "Direct Payment to Red Apple", totalStudentsEnrolled: 40, feePerStudent: 2500, totalRevenue: 100000, createdAt: "2026-02-15" },
  { id: "sp3", schoolAccountId: "sch1", courseOffered: "Creative Coding", classCoverage: ["Class 8", "Class 9", "Class 10"], trainingSchedule: "After School Hours", feeModel: "School Collects Fees", totalStudentsEnrolled: 45, feePerStudent: 2000, schoolSharePercentage: 20, redAppleSharePercentage: 80, totalRevenue: 90000, createdAt: "2026-02-20" },
];

// ── School Students (sample) ──
export const mockSchoolStudents: SchoolStudent[] = [
  { id: "ss1", schoolProgramId: "sp2", studentName: "Aryan Das", phone: "9876950001", courseSelected: "Game Development", feePaid: 2500 },
  { id: "ss2", schoolProgramId: "sp2", studentName: "Sneha Roy", phone: "9876950002", courseSelected: "Game Development", feePaid: 2500 },
];

// ── Internship Leads (to be merged into mockLeads) ──
export const internshipLeadEntries = [
  {
    id: "li1", name: "Rohit Kumar", phone: "9876600001", email: "rohit.k@email.com", source: "College Outreach", campaignId: "c1",
    interestedCourse: "Web Development Internship", assignedTelecallerId: "u3", status: "Admission" as const, createdAt: "2026-03-12",
    programChannel: "Internship Program" as const,
    internshipCourse: "Web Development Internship", internshipDuration: "3 Months", internshipLocation: "Red Apple Campus",
    internshipFee: 25000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Batch Start",
    leadScore: 80, leadQuality: "Hot" as const, budgetRange: "₹25k", urgencyLevel: "High",
    intentScore: 82, intentCategory: "High Intent" as const, temperature: "Hot" as const, priorityScore: 80, priorityCategory: "High Priority" as const,
    activities: [{ id: "ali1", leadId: "li1", type: "Lead Created", description: "Internship inquiry from college outreach", timestamp: "2026-03-12T09:00:00" }],
  },
  {
    id: "li2", name: "Anita Sharma", phone: "9876600002", email: "anita.s@email.com", source: "Website", campaignId: "c4",
    interestedCourse: "Digital Marketing Internship", assignedTelecallerId: "u4", status: "Admission" as const, createdAt: "2026-03-15",
    programChannel: "Internship Program" as const,
    internshipCourse: "Digital Marketing Internship", internshipDuration: "1 Month", internshipLocation: "Red Apple Campus",
    internshipFee: 5000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Batch Start",
    leadScore: 75, leadQuality: "Warm" as const, budgetRange: "₹5k", urgencyLevel: "Medium",
    intentScore: 70, intentCategory: "Medium Intent" as const, temperature: "Warm" as const, priorityScore: 72, priorityCategory: "High Priority" as const,
    activities: [{ id: "ali2", leadId: "li2", type: "Lead Created", description: "Internship inquiry from website", timestamp: "2026-03-15T10:00:00" }],
  },
  {
    id: "li3", name: "Vivek Patel", phone: "9876600003", email: "vivek.p@email.com", source: "College Outreach", campaignId: "c3",
    interestedCourse: "Graphic Design Internship", assignedTelecallerId: "u3", status: "Admission" as const, createdAt: "2026-03-17",
    programChannel: "Internship Program" as const,
    internshipCourse: "Graphic Design Internship", internshipDuration: "2 Months", internshipLocation: "College Campus",
    internshipFee: 10000, internshipEnrollmentType: "College Batch", internshipPipelineStage: "Batch Start",
    leadScore: 72, leadQuality: "Warm" as const, budgetRange: "₹10k", urgencyLevel: "Medium",
    intentScore: 68, intentCategory: "Medium Intent" as const, temperature: "Warm" as const, priorityScore: 70, priorityCategory: "Medium Priority" as const,
    activities: [{ id: "ali3", leadId: "li3", type: "Lead Created", description: "College batch inquiry for internship", timestamp: "2026-03-17T11:00:00" }],
  },
  {
    id: "li4", name: "Neha Gupta", phone: "9876600004", email: "neha.g@email.com", source: "Seminar", campaignId: "c1",
    interestedCourse: "UI/UX Internship", assignedTelecallerId: "u4", status: "Admission" as const, createdAt: "2026-03-19",
    programChannel: "Internship Program" as const,
    internshipCourse: "UI/UX Internship", internshipDuration: "3 Months", internshipLocation: "Red Apple Campus",
    internshipFee: 25000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Batch Start",
    leadScore: 85, leadQuality: "Hot" as const, budgetRange: "₹25k", urgencyLevel: "High",
    intentScore: 84, intentCategory: "High Intent" as const, temperature: "Hot" as const, priorityScore: 85, priorityCategory: "High Priority" as const,
    activities: [{ id: "ali4", leadId: "li4", type: "Lead Created", description: "Seminar attendee interested in UI/UX internship", timestamp: "2026-03-19T14:00:00" }],
  },
  {
    id: "li5", name: "Rahul Singh", phone: "9876600005", email: "rahul.s@email.com", source: "Workshop", campaignId: "c2",
    interestedCourse: "AI/ML Internship", assignedTelecallerId: "u3", status: "Admission" as const, createdAt: "2026-03-21",
    programChannel: "Internship Program" as const,
    internshipCourse: "AI/ML Internship", internshipDuration: "6 Months", internshipLocation: "Red Apple Campus",
    internshipFee: 75000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Batch Start",
    leadScore: 90, leadQuality: "Hot" as const, budgetRange: "₹75k", urgencyLevel: "High",
    intentScore: 88, intentCategory: "High Intent" as const, temperature: "Hot" as const, priorityScore: 90, priorityCategory: "High Priority" as const,
    activities: [{ id: "ali5", leadId: "li5", type: "Lead Created", description: "Workshop attendee, very keen on AI/ML internship", timestamp: "2026-03-21T10:00:00" }],
  },
  {
    id: "li6", name: "Kavita Mehta", phone: "9876600006", email: "kavita.m@email.com", source: "Google Ads", campaignId: "c2",
    interestedCourse: "Game Development Internship", assignedTelecallerId: "u4", status: "Interested" as const, createdAt: "2026-03-23",
    programChannel: "Internship Program" as const,
    internshipCourse: "Game Development Internship", internshipDuration: "3 Months", internshipLocation: "Red Apple Campus",
    internshipFee: 50000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Internship Discussion",
    leadScore: 65, leadQuality: "Warm" as const, budgetRange: "₹50k", urgencyLevel: "Medium",
    intentScore: 60, intentCategory: "Medium Intent" as const, temperature: "Warm" as const, priorityScore: 65, priorityCategory: "Medium Priority" as const,
    activities: [{ id: "ali6", leadId: "li6", type: "Lead Created", description: "Google Ad lead for game dev internship", timestamp: "2026-03-23T08:00:00" }],
  },
  {
    id: "li7", name: "Deepak Jain", phone: "9876600007", email: "deepak.j@email.com", source: "Meta Ads", campaignId: "c1",
    interestedCourse: "Simulation Engineering Internship", assignedTelecallerId: "u3", status: "New" as const, createdAt: "2026-03-25",
    programChannel: "Internship Program" as const,
    internshipCourse: "Simulation Engineering Internship", internshipDuration: "6 Months", internshipLocation: "Red Apple Campus",
    internshipFee: 75000, internshipEnrollmentType: "Individual Student", internshipPipelineStage: "Internship Lead",
    leadScore: 50, leadQuality: "Cold" as const, budgetRange: "₹75k", urgencyLevel: "Low",
    intentScore: 45, intentCategory: "Low Intent" as const, temperature: "Cold" as const, priorityScore: 50, priorityCategory: "Medium Priority" as const,
    activities: [{ id: "ali7", leadId: "li7", type: "Lead Created", description: "Meta Ad lead for simulation internship", timestamp: "2026-03-25T09:00:00" }],
  },
];
