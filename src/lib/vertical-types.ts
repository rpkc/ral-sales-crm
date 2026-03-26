/**
 * Types for multi-vertical business channels:
 * Individual Course Admission, Internship, College Collaboration, School Training
 */

export type ProgramChannel = "Individual Course Admission" | "Internship Program" | "College Collaboration Program" | "School Training Program";

// ── Internship Types ──
export type InternshipCourse = "Graphic Design Internship" | "UI/UX Internship" | "Web Development Internship" | "Digital Marketing Internship" | "AI/ML Internship" | "Game Development Internship" | "Simulation Engineering Internship";
export type InternshipDuration = "1 Month" | "2 Months" | "3 Months" | "6 Months";
export type InternshipLocation = "Red Apple Campus" | "College Campus";
export type InternshipFeeBand = 1200 | 5000 | 10000 | 25000 | 50000 | 75000;
export type InternshipEnrollmentType = "Individual Student" | "College Batch";
export type InternshipPipelineStage = "Internship Lead" | "Call Attempted" | "Internship Discussion" | "Proposal Shared" | "Internship Confirmed" | "Batch Start";

export interface InternshipLead {
  programChannel: "Internship Program";
  internshipCourse: InternshipCourse;
  internshipDuration: InternshipDuration;
  internshipLocation: InternshipLocation;
  internshipFee: InternshipFeeBand;
  internshipEnrollmentType: InternshipEnrollmentType;
  internshipPipelineStage: InternshipPipelineStage;
}

// ── College Collaboration Types ──
export type CollegeStream = "Engineering" | "Design" | "Commerce" | "Management" | "Arts" | "Science";
export type CollegeProgramType = "Certificate Program" | "Diploma Program" | "Advanced Diploma Program";
export type CollegeCourseOffered = "Graphic Design" | "UI/UX Design" | "Web Development" | "Digital Marketing" | "AI/ML" | "Game Development" | "Simulation Engineering";
export type CollegeProgramDuration = "3 Months" | "6 Months" | "12 Months";
export type CollegeTrainingMode = "Online" | "Offline (College Campus)" | "Offline (Red Apple Campus)" | "Hybrid (College + Red Apple)" | "Hybrid (Online + Offline)";
export type CollegePipelineStage = "College Identified" | "Meeting Scheduled" | "Proposal Shared" | "Negotiation" | "Agreement Signed" | "Program Launch";
export type CollegeEnrollmentMode = "College Managed Enrollment" | "Joint Enrollment (College + Red Apple)" | "Red Apple Managed Enrollment";
export type CollegeStudentCategory = "Existing College Student" | "External Student (Local Area)";
export type CollegeRevenueModel = "Revenue Share" | "Per Student Fee" | "Fixed Institutional Fee";
export type CollegeEnrollmentSource = "College" | "Red Apple";

export interface CollegeAccount {
  id: string;
  collegeName: string;
  city: string;
  state: string;
  contactPersonName: string;
  designation: string;
  phone: string;
  email: string;
  totalStudentStrength: number;
  streamsOffered: CollegeStream[];
  pipelineStage: CollegePipelineStage;
  createdAt: string;
  notes: string;
}

export interface CollegeProgram {
  id: string;
  collegeAccountId: string;
  programType: CollegeProgramType;
  courseOffered: CollegeCourseOffered;
  programDuration: CollegeProgramDuration;
  trainingMode: CollegeTrainingMode;
  enrollmentMode: CollegeEnrollmentMode;
  revenueModel: CollegeRevenueModel;
  collegeSharePercentage?: number;
  redAppleSharePercentage?: number;
  perStudentFee?: number;
  fixedFee?: number;
  totalStudentsEnrolled: number;
  totalRevenue: number;
  createdAt: string;
}

export interface CollegeStudent {
  id: string;
  collegeProgramId: string;
  studentName: string;
  phone: string;
  email: string;
  courseSelected: string;
  batchName: string;
  feePaidToCollege?: number;
  studentCategory: CollegeStudentCategory;
  enrollmentSource?: CollegeEnrollmentSource;
}

// ── School Training Types ──
export type SchoolClass = "Class 5" | "Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10" | "Class 11" | "Class 12";
export type SchoolCourse = "Basic AI/ML" | "Game Development" | "2D Design" | "3D Design" | "Creative Coding" | "Future Tech Foundation";
export type SchoolTrainingSchedule = "Before School Hours" | "During School Hours" | "After School Hours";
export type SchoolFeeModel = "School Collects Fees" | "Direct Payment to Red Apple";
export type SchoolPipelineStage = "School Identified" | "Meeting Scheduled" | "Proposal Shared" | "Negotiation" | "Agreement Signed" | "Program Launch";

export interface SchoolAccount {
  id: string;
  schoolName: string;
  city: string;
  contactPersonName: string;
  designation: string;
  phone: string;
  email: string;
  totalStudents: number;
  classCoverage: SchoolClass[];
  pipelineStage: SchoolPipelineStage;
  createdAt: string;
  notes: string;
}

export interface SchoolProgram {
  id: string;
  schoolAccountId: string;
  courseOffered: SchoolCourse;
  classCoverage: SchoolClass[];
  trainingSchedule: SchoolTrainingSchedule;
  feeModel: SchoolFeeModel;
  totalStudentsEnrolled: number;
  feePerStudent: number;
  schoolSharePercentage?: number;
  redAppleSharePercentage?: number;
  totalRevenue: number;
  createdAt: string;
}

export interface SchoolStudent {
  id: string;
  schoolProgramId: string;
  studentName: string;
  phone: string;
  courseSelected: string;
  feePaid: number;
}

// ── Internship Admission ──
export interface InternshipAdmission {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string;
  internshipCourse: InternshipCourse;
  internshipDuration: InternshipDuration;
  internshipLocation: InternshipLocation;
  fee: number;
  enrollmentType: InternshipEnrollmentType;
  batchName: string;
  admissionDate: string;
  createdAt: string;
}
