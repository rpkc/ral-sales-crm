import { useState } from "react";
import { useAuth, roleLabels } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/types";
import { LogIn, Shield, Phone, GraduationCap, Megaphone, Users, Crown } from "lucide-react";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield, telecaller: Phone, counselor: GraduationCap,
  marketing_manager: Megaphone, telecalling_manager: Users, owner: Crown,
};

const roleColors: Record<UserRole, string> = {
  admin: "border-primary/30 hover:border-primary hover:bg-primary/5",
  telecaller: "border-success/30 hover:border-success hover:bg-success/5",
  counselor: "border-warning/30 hover:border-warning hover:bg-warning/5",
  marketing_manager: "border-primary/30 hover:border-primary hover:bg-primary/5",
  telecalling_manager: "border-success/30 hover:border-success hover:bg-success/5",
  owner: "border-warning/30 hover:border-warning hover:bg-warning/5",
};

export default function LoginPage() {
  const { login, allUsers } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  const handleLogin = () => {
    if (selected) login(selected);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">RA</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Red Apple Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">CRM Portal — Select your role to continue</p>
        </div>

        {/* User cards */}
        <div className="space-y-2">
          {allUsers.map((user) => {
            const Icon = roleIcons[user.role];
            const isSelected = selected === user.id;
            return (
              <button
                key={user.id}
                onClick={() => setSelected(user.id)}
                className={`w-full flex items-center gap-4 rounded-xl border-2 bg-card p-4 text-left transition-all ${
                  isSelected ? "border-primary bg-primary/5 shadow-md" : roleColors[user.role]
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{roleLabels[user.role]}</Badge>
              </button>
            );
          })}
        </div>

        <Button onClick={handleLogin} disabled={!selected} className="w-full h-11" size="lg">
          <LogIn className="h-4 w-4 mr-2" /> Sign In
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          This is a simulated login for prototyping. Select any user to view their role-based dashboard.
        </p>
      </div>
    </div>
  );
}
