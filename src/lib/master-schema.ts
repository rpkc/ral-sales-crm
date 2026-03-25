/**
 * Centralized master schema for Red Apple Learning CRM.
 * All dropdowns and standardized fields across modules pull from here.
 */

export const MASTER_ROLES = [
  "Admin", "Telecaller", "Counselor", "Marketing Manager", "Telecalling Manager", "Owner / Director",
] as const;

export const MASTER_TELECALLERS = ["Shreya Chakraborty", "Priya Das"] as const;
export const MASTER_COUNSELORS = ["Manjari Chakraborty"] as const;
export const MASTER_MARKETING_MANAGERS = ["Soumya Saha"] as const;

export const MASTER_LEAD_SOURCES = [
  "Website Apply Now", "Website Free Counseling", "Website Callback Request",
  "Website Register Form", "Website Brochure Download",
  "Google Ads", "Meta Ads", "Instagram Organic", "YouTube",
  "Referral", "Alumni Referral", "Walk-in", "Education Fair", "Partner Institute",
] as const;

export const MASTER_QUALIFICATIONS = [
  "Class 10", "Class 12", "Diploma",
  "B.A", "B.Com", "B.Sc", "B.Tech", "BBA", "BCA",
  "M.A", "M.Com", "M.Sc", "MBA", "MCA", "Other",
] as const;

export const MASTER_STREAMS = [
  "Science", "Commerce", "Arts", "Engineering", "Management", "Computer Science", "Other",
] as const;

export const MASTER_CURRENT_STATUS = [
  "Student", "Working Professional", "Fresher", "Business Owner", "Career Switch", "Unemployed",
] as const;

export const MASTER_COURSES = [
  { course_name: "Graphic Design", course_fee: 45000 },
  { course_name: "UI/UX Design", course_fee: 90000 },
  { course_name: "Motion Graphics", course_fee: 118000 },
  { course_name: "Web Design", course_fee: 45000 },
  { course_name: "HTML & CSS", course_fee: 15000 },
  { course_name: "WordPress", course_fee: 45000 },
  { course_name: "Digital Marketing", course_fee: 90000 },
  { course_name: "AI / ML", course_fee: 260000 },
  { course_name: "Game Development", course_fee: 190000 },
  { course_name: "Full Stack Development", course_fee: 410000 },
] as const;

export const MASTER_COURSE_NAMES = MASTER_COURSES.map((c) => c.course_name);

export const MASTER_FEE_BANDS = [
  { label: "Low Ticket", range: "15000-45000" },
  { label: "Mid Ticket", range: "90000-118000" },
  { label: "High Ticket", range: "160000-410000" },
] as const;

export const MASTER_CAREER_GOALS = [
  "Graphic Designer", "UI/UX Designer", "Web Developer", "Full Stack Developer",
  "Digital Marketer", "Animator", "Video Editor", "Freelancer", "Entrepreneur", "Content Creator",
] as const;

export const MASTER_LEAD_MOTIVATIONS = [
  "Job Placement", "Career Switch", "Skill Upgrade", "Portfolio Building", "Freelancing", "Business Purpose",
] as const;

export const MASTER_CALL_OUTCOMES = [
  "Connected", "Not Answered", "Call Later", "Interested", "Not Interested", "Wrong Number", "Switched Off", "Invalid Number",
] as const;

export const MASTER_OBJECTIONS = [
  "Course Too Expensive", "Timing Issue", "Location Issue", "Not Sure About Career",
  "Need Parent Approval", "Already Joined Another Institute", "Just Researching", "Need More Time",
] as const;

export const MASTER_FOLLOWUP_TYPES = [
  "Phone Call", "WhatsApp", "Email", "Counseling Meeting", "Campus Visit", "Demo Class", "Zoom Meeting", "In-person Meeting", "Parent Discussion",
] as const;

export const MASTER_WALKIN_STATUS = [
  "Not Scheduled", "Scheduled", "Completed", "No Show",
] as const;

export const MASTER_COUNSELING_OUTCOMES = [
  "Strong Admission Intent", "Interested but Needs Time", "Fee Discussion Pending", "Parent Approval Pending", "Not Interested",
] as const;

export const MASTER_FEE_COMMITMENTS = [
  "Full Admission Fee", "Registration Fee", "Seat Booking Token", "EMI Plan",
] as const;

export const MASTER_DOCUMENT_STATUS = [
  "Documents Submitted", "Documents Pending", "Verification Pending",
] as const;

export const MASTER_JOINING_FAILURE_REASONS = [
  "Fee Arrangement Issue", "Parents Reluctant", "Document Issues", "Student Not Responding", "Joined Another Institute", "Follow-Up Missed",
] as const;

export const MASTER_COUNSELOR_FOLLOWUP_TYPES = [
  "Phone Call", "WhatsApp", "In-person Meeting", "Parent Discussion",
] as const;

export const MASTER_PAYMENT_MODES = [
  "Cash", "Cheque", "Online Transfer", "UPI", "Credit Card", "Debit Card", "Net Banking",
] as const;

export const MASTER_SCHOLARSHIP_LEVELS = [
  "None", "5%", "10%", "15%", "20%", "25%",
] as const;

export const MASTER_SALARY_EXPECTATIONS = [
  "2-3 LPA", "3-4 LPA", "4-6 LPA", "6-8 LPA", "8+ LPA",
] as const;

export const MASTER_BATCH_TIMINGS = [
  "Weekday Morning", "Weekday Afternoon", "Weekday Evening", "Weekend Batch",
] as const;

export const MASTER_ADMISSION_PROBABILITY = [
  "Very High", "High", "Medium", "Low", "Very Low",
] as const;

export const MASTER_LEAD_PIPELINE_STAGES = [
  "New Lead", "Contact Attempted", "Connected", "Interested",
  "Application Submitted", "Interview Scheduled", "Interview Completed",
  "Admission Discussion", "Admitted", "Lost",
] as const;

export const MASTER_LEAD_EVENTS = [
  "Lead Created", "Call Attempted", "Call Connected", "Follow-up Scheduled",
  "Counseling Done", "Application Submitted", "Interview Scheduled",
  "Admission Discussion", "Admission Completed",
] as const;

export const MASTER_LOCATIONS = ["Kolkata", "Salt Lake", "New Town"] as const;

/** Get fee band label for a given fee amount */
export function getFeeBandLabel(fee: number): string {
  if (fee <= 45000) return "Low Ticket";
  if (fee <= 118000) return "Mid Ticket";
  return "High Ticket";
}

/** Get course fee by name */
export function getCourseFee(courseName: string): number | undefined {
  return MASTER_COURSES.find((c) => c.course_name === courseName)?.course_fee;
}
