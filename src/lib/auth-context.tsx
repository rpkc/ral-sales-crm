import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { User, UserRole } from "./types";
import { mockUsers } from "./mock-data";

// Extended mock users for new roles
const allUsers: User[] = [
  ...mockUsers,
  { id: "u6", name: "Vikram Singh", email: "vikram@redapple.com", role: "telecalling_manager" },
  { id: "u7", name: "Rajesh Kapoor", email: "rajesh@redapple.com", role: "owner" },
];

interface AuthContextValue {
  currentUser: User | null;
  login: (userId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("crm_current_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      return allUsers.find((u) => u.id === parsed.id) || null;
    }
    return null;
  });

  const login = useCallback((userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem("crm_current_user", JSON.stringify(user));
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("crm_current_user");
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated: !!currentUser, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Role-based navigation config
export const roleNavConfig: Record<UserRole, { to: string; label: string }[]> = {
  admin: [
    { to: "/", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/leads", label: "Leads" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
  ],
  telecaller: [
    { to: "/", label: "Dashboard" },
    { to: "/telecalling", label: "Telecalling" },
    { to: "/follow-ups", label: "Follow-ups" },
  ],
  counselor: [
    { to: "/", label: "Dashboard" },
    { to: "/leads", label: "Leads" },
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
  ],
  marketing_manager: [
    { to: "/", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/leads", label: "Leads" },
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
    { to: "/follow-ups", label: "Follow-ups" },
    { to: "/admissions", label: "Admissions" },
  ],
};

export const roleLabels: Record<UserRole, string> = {
  admin: "System Administrator",
  telecaller: "Telecaller",
  counselor: "Academic Counselor",
  marketing_manager: "Marketing Manager",
  telecalling_manager: "Telecalling Manager",
  owner: "Owner / Director",
};
