import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Megaphone, Users, Phone, CalendarClock,
  GraduationCap, Menu, X, LogOut, Shield, HeartHandshake,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, roleNavConfig, roleLabels } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard,
  "/campaigns": Megaphone,
  "/leads": Users,
  "/telecalling": Phone,
  "/counseling": HeartHandshake,
  "/follow-ups": CalendarClock,
  "/admissions": GraduationCap,
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) return <>{children}</>;

  const navItems = roleNavConfig[currentUser.role] || [];

  // Check if current route is allowed for this role
  const isAllowed = navItems.some((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  ) || location.pathname === "*";

  return (
    <div className="flex min-h-screen w-full">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">RA</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground">Red Apple Learning</h1>
            <p className="text-xs text-sidebar-foreground/60">CRM Portal</p>
          </div>
          <button className="ml-auto text-sidebar-foreground lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = iconMap[item.to] || LayoutDashboard;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
              {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60">{roleLabels[currentUser.role]}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 shadow-card lg:px-6">
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">CRM Dashboard</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">{roleLabels[currentUser.role]}</Badge>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {isAllowed ? children : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Shield className="mx-auto h-10 w-10 text-destructive mb-3" />
                <p className="font-medium text-card-foreground">Access Denied</p>
                <p className="text-sm text-muted-foreground mt-1">You do not have permission to access this page.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
