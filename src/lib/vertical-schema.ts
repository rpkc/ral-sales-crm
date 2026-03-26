/**
 * Master schema for multi-vertical dropdown options.
 */

export const PROGRAM_CHANNELS = [
  "Individual Course Admission",
  "Internship Program",
  "College Collaboration Program",
  "School Training Program",
] as const;

// ── Internship ──
export const INTERNSHIP_COURSES = [
  "Graphic Design Internship", "UI/UX Internship", "Web Development Internship",
  "Digital Marketing Internship", "AI/ML Internship", "Game Development Internship",
  "Simulation Engineering Internship",
] as const;

export const INTERNSHIP_DURATIONS = ["1 Month", "2 Months", "3 Months", "6 Months"] as const;
export const INTERNSHIP_LOCATIONS = ["Red Apple Campus", "College Campus"] as const;
export const INTERNSHIP_FEE_BANDS = [1200, 5000, 10000, 25000, 50000, 75000] as const;
export const INTERNSHIP_ENROLLMENT_TYPES = ["Individual Student", "College Batch"] as const;
export const INTERNSHIP_PIPELINE_STAGES = ["Internship Lead", "Call Attempted", "Internship Discussion", "Proposal Shared", "Internship Confirmed", "Batch Start"] as const;

// ── College ──
export const COLLEGE_STREAMS = ["Engineering", "Design", "Commerce", "Management", "Arts", "Science"] as const;
export const COLLEGE_PROGRAM_TYPES = ["Certificate Program", "Diploma Program", "Advanced Diploma Program"] as const;
export const COLLEGE_COURSES_OFFERED = ["Graphic Design", "UI/UX Design", "Web Development", "Digital Marketing", "AI/ML", "Game Development", "Simulation Engineering"] as const;
export const COLLEGE_PROGRAM_DURATIONS = ["3 Months", "6 Months", "12 Months"] as const;
export const COLLEGE_TRAINING_MODES = ["Online", "Offline (College Campus)", "Offline (Red Apple Campus)", "Hybrid (College + Red Apple)", "Hybrid (Online + Offline)"] as const;
export const COLLEGE_PIPELINE_STAGES = ["College Identified", "Meeting Scheduled", "Proposal Shared", "Negotiation", "Agreement Signed", "Program Launch"] as const;
export const COLLEGE_ENROLLMENT_MODES = ["College Managed Enrollment", "Joint Enrollment (College + Red Apple)", "Red Apple Managed Enrollment"] as const;
export const COLLEGE_STUDENT_CATEGORIES = ["Existing College Student", "External Student (Local Area)"] as const;
export const COLLEGE_REVENUE_MODELS = ["Revenue Share", "Per Student Fee", "Fixed Institutional Fee"] as const;
export const COLLEGE_ENROLLMENT_SOURCES = ["College", "Red Apple"] as const;

// ── School ──
export const SCHOOL_CLASSES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"] as const;
export const SCHOOL_COURSES = ["Basic AI/ML", "Game Development", "2D Design", "3D Design", "Creative Coding", "Future Tech Foundation"] as const;
export const SCHOOL_TRAINING_SCHEDULES = ["Before School Hours", "During School Hours", "After School Hours"] as const;
export const SCHOOL_FEE_MODELS = ["School Collects Fees", "Direct Payment to Red Apple"] as const;
export const SCHOOL_PIPELINE_STAGES = ["School Identified", "Meeting Scheduled", "Proposal Shared", "Negotiation", "Agreement Signed", "Program Launch"] as const;

// ── Unified Lead Sources ──
export const UNIFIED_LEAD_SOURCES = [
  "Google Ads", "Meta Ads", "Instagram", "Website", "Walk-in", "Referral",
  "College Outreach", "School Outreach", "Seminar", "Workshop",
] as const;
