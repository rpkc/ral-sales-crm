import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { User } from "./types";
export { roleNavConfig, roleLabels } from "./role-config";

const allUsers: User[] = [
  { id: "u1", name: "Amit Sharma", email: "amit@redapple.com", password: "admin123", role: "admin" },
  { id: "u2", name: "Soumya Saha", email: "soumya@redapple.com", password: "marketing123", role: "marketing_manager" },
  { id: "u3", name: "Shreya Chakraborty", email: "shreya@redapple.com", password: "telecaller123", role: "telecaller" },
  { id: "u4", name: "Priya Das", email: "priya@redapple.com", password: "telecaller123", role: "telecaller" },
  { id: "u5", name: "Manjari Chakraborty", email: "manjari@redapple.com", password: "counselor123", role: "counselor" },
  { id: "u6", name: "Vikram Singh", email: "vikram@redapple.com", password: "manager123", role: "telecalling_manager" },
  { id: "u7", name: "Rajesh Kapoor", email: "rajesh@redapple.com", password: "owner123", role: "owner" },
  // Industry Alliances
  { id: "am1", name: "Rohit Banerjee", email: "rohit@redapple.com", password: "alliance123", role: "alliance_manager" },
  { id: "ae1", name: "Sneha Roy", email: "sneha@redapple.com", password: "alliance123", role: "alliance_executive" },
  { id: "ae2", name: "Karan Mehta", email: "karan@redapple.com", password: "alliance123", role: "alliance_executive" },
  { id: "ae3", name: "Pooja Nair", email: "pooja@redapple.com", password: "alliance123", role: "alliance_executive" },
];

interface AuthContextValue {
  currentUser: User | null;
  loginByCredentials: (email: string, password: string) => { success: boolean; error?: string };
  loginById: (userId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("crm_current_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return allUsers.find((u) => u.id === parsed.id) || null;
      }
    } catch {}
    return null;
  });

  const loginByCredentials = useCallback((email: string, password: string): { success: boolean; error?: string } => {
    if (!email || !password) return { success: false, error: "Email and password are required." };
    const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return { success: false, error: "Invalid credentials. Please check email or password." };
    setCurrentUser(user);
    localStorage.setItem("crm_current_user", JSON.stringify(user));
    return { success: true };
  }, []);

  const loginById = useCallback((userId: string) => {
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
    <AuthContext.Provider value={{ currentUser, loginByCredentials, loginById, logout, isAuthenticated: !!currentUser, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
