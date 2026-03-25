import { useState } from "react";
import { useAuth, roleLabels } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { loginByCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    // Simulate brief loading
    setTimeout(() => {
      const result = loginByCredentials(email.trim(), password);
      if (!result.success) {
        setError(result.error || "Login failed.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">RA</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Red Apple Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">CRM Portal — Sign in to continue</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="rounded-xl bg-card p-6 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@redapple.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" /> Sign In
              </span>
            )}
          </Button>
        </form>

        {/* Demo credentials */}
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-card-foreground mb-2">Demo Credentials</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Telecaller</span><span className="font-mono text-card-foreground">shreya@redapple.com / telecaller123</span></div>
            <div className="flex justify-between"><span>Telecaller</span><span className="font-mono text-card-foreground">priya@redapple.com / telecaller123</span></div>
            <div className="flex justify-between"><span>Counselor</span><span className="font-mono text-card-foreground">manjari@redapple.com / counselor123</span></div>
            <div className="flex justify-between"><span>Marketing</span><span className="font-mono text-card-foreground">soumya@redapple.com / marketing123</span></div>
            <div className="flex justify-between"><span>Admin</span><span className="font-mono text-card-foreground">amit@redapple.com / admin123</span></div>
            <div className="flex justify-between"><span>Owner</span><span className="font-mono text-card-foreground">rajesh@redapple.com / owner123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
