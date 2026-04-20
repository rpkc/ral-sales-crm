import { UserRole } from "./types";

export const roleNavConfig: Record<UserRole, { to: string; label: string }[]> = {
  admin: [
    { to: "/", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/leads", label: "Leads" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/counseling", label: "Counseling" },
    { to: "/revenue", label: "Revenue" },
    { to: "/institutional", label: "Institutional" },
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
    { to: "/approvals", label: "Approvals" },
  ],
  telecaller: [
    { to: "/", label: "Dashboard" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/follow-ups", label: "Follow-ups" },
  ],
  counselor: [
    { to: "/", label: "Dashboard" },
    { to: "/counseling", label: "Counseling" },
    { to: "/leads", label: "Leads" },
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
  ],
  marketing_manager: [
    { to: "/", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/leads", label: "Leads" },
    { to: "/revenue", label: "Revenue" },
  ],
  telecalling_manager: [
    { to: "/", label: "Dashboard" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/leads", label: "Leads" },
    { to: "/follow-ups", label: "Follow-ups" },
  ],
  owner: [
    { to: "/", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/leads", label: "Leads" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/counseling", label: "Counseling" },
    { to: "/revenue", label: "Revenue" },
    { to: "/institutional", label: "Institutional" },
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
    { to: "/approvals", label: "Approvals" },
  ],
  alliance_manager: [
    { to: "/", label: "Dashboard" },
    { to: "/alliances", label: "Industry Alliances" },
  ],
  alliance_executive: [
    { to: "/", label: "Dashboard" },
    { to: "/alliances", label: "My Alliances" },
  ],
};

export const roleLabels: Record<UserRole, string> = {
  admin: "System Administrator",
  telecaller: "Telecaller",
  counselor: "Academic Counselor",
  marketing_manager: "Marketing Manager",
  telecalling_manager: "Telecalling Manager",
  owner: "Owner / Director",
  alliance_manager: "Alliance Manager",
  alliance_executive: "Alliance Executive",
};
