/**
 * Premium, role-aware Sign-In experience.
 *
 *  • Left panel (md+): branding, time-based greeting, rotating trust messages.
 *  • Right panel: role chips → email → password → CTA → OTP stub (Owner only).
 *
 * Microinteractions: focus glow, valid-tick, error-shake, caps-lock badge,
 * show/hide password, hover-elevate CTA, success flash, sequential fade-up.
 *
 * Hardening: 5-attempt / 2-minute lockout (localStorage), navigator.onLine
 * banner, slow-server hint after 4s, suspicious-device note for new
 * fingerprint, mock forgot-password modal.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, roleLabels } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Mail, Lock, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, Check,
  Briefcase, Crown, Wallet, Settings2, WifiOff, Loader2, KeyRound, ShieldAlert,
  Phone, HeartHandshake, Megaphone, Headphones, Building2, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

/* ───────── Roles for the selector ───────── */

type ChipRole =
  | "accounts_executive" | "accounts_manager" | "owner" | "admin"
  | "telecaller" | "telecalling_manager" | "counselor" | "marketing_manager"
  | "alliance_manager" | "alliance_executive";

type RoleTier = "premium" | "ops";

const ROLE_CHIPS: { value: ChipRole; label: string; icon: typeof Crown; subtitle: string; tier: RoleTier }[] = [
  // Premium tier — split-screen with branding & rotating trust messages
  { value: "accounts_executive", label: "Accounts Executive", icon: Wallet, subtitle: "Daily billing, collections support and invoice operations.", tier: "premium" },
  { value: "accounts_manager", label: "Accounts Manager", icon: Briefcase, subtitle: "Billing, reconciliation and finance controls.", tier: "premium" },
  { value: "owner", label: "Owner", icon: Crown, subtitle: "Strategic revenue, approvals and executive visibility.", tier: "premium" },
  { value: "admin", label: "Admin", icon: Settings2, subtitle: "Operations, verification and workflow controls.", tier: "premium" },
  // Ops tier — compact single panel
  { value: "telecaller", label: "Telecaller", icon: Phone, subtitle: "Call queue, lead follow-ups and conversion.", tier: "ops" },
  { value: "telecalling_manager", label: "Telecalling Manager", icon: Headphones, subtitle: "Team performance, call quality and lead routing.", tier: "ops" },
  { value: "counselor", label: "Counselor", icon: GraduationCap, subtitle: "Walk-ins, counseling outcomes and admissions.", tier: "ops" },
  { value: "marketing_manager", label: "Marketing Manager", icon: Megaphone, subtitle: "Campaigns, lead sources and ROAS.", tier: "ops" },
  { value: "alliance_manager", label: "Alliance Manager", icon: Building2, subtitle: "Institutional partnerships and program launches.", tier: "ops" },
  { value: "alliance_executive", label: "Alliance Executive", icon: HeartHandshake, subtitle: "On-ground alliance visits and follow-ups.", tier: "ops" },
];

/* ───────── Lockout helpers (localStorage) ───────── */

const LOCK_KEY = "ral_login_lock_v1";
const LOCK_LIMIT = 5;
const LOCK_WINDOW_MS = 2 * 60 * 1000;

interface LockState { count: number; lockedUntil?: number }

const readLock = (): LockState => {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "{}"); } catch { return { count: 0 }; }
};
const writeLock = (s: LockState) => localStorage.setItem(LOCK_KEY, JSON.stringify(s));

/* ───────── Suspicious-device fingerprint ───────── */

const FP_KEY = "ral_login_fp_v1";
const computeFp = () =>
  `${navigator.userAgent.length}-${navigator.language}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;

/* ───────── Time-based greeting ───────── */

function useGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning. Let's build momentum.";
  if (h < 17) return "Good afternoon. Operations are live.";
  return "Good evening. Your reports are ready.";
}

/* ───────── Rotating trust messages ───────── */

const TRUST_MESSAGES = [
  "Today's collections synchronized in real time.",
  "GST-ready invoices. Verified workflows.",
  "Revenue intelligence at your fingertips.",
  "Restricted access. Full accountability.",
];

function useRotatingMessage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % TRUST_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);
  return TRUST_MESSAGES[i];
}

/* ═══════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const { loginByCredentials } = useAuth();

  const [chipRole, setChipRole] = useState<ChipRole>("accounts_manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [slow, setSlow] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState("");
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);

  const [lock, setLock] = useState<LockState>(() => readLock());
  const [now, setNow] = useState(Date.now());
  const [suspicious, setSuspicious] = useState(false);

  const greeting = useGreeting();
  const trust = useRotatingMessage();
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online/offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Tick the lockout countdown
  useEffect(() => {
    if (!lock.lockedUntil || lock.lockedUntil < Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lock.lockedUntil]);

  // Suspicious-device check
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FP_KEY);
      const fp = computeFp();
      if (stored && stored !== fp) setSuspicious(true);
      if (!stored) localStorage.setItem(FP_KEY, fp);
    } catch { /* ignore */ }
  }, []);

  const lockedRemainingMs = lock.lockedUntil && lock.lockedUntil > now ? lock.lockedUntil - now : 0;
  const isLocked = lockedRemainingMs > 0;
  const lockSeconds = Math.ceil(lockedRemainingMs / 1000);

  const activeChip = ROLE_CHIPS.find(r => r.value === chipRole)!;
  const validEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const triggerShake = (which: "email" | "password" | "both") => {
    if (which === "email" || which === "both") { setEmailError(true); setTimeout(() => setEmailError(false), 450); }
    if (which === "password" || which === "both") { setPasswordError(true); setTimeout(() => setPasswordError(false), 450); }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsOn(e.getModifierState("CapsLock"));
  };

  const finishLogin = (em: string, pw: string) => {
    setSlow(false);
    if (slowTimer.current) clearTimeout(slowTimer.current);

    const result = loginByCredentials(em.trim(), pw);
    if (!result.success) {
      const next = { count: (lock.count || 0) + 1, lockedUntil: lock.lockedUntil };
      if (next.count >= LOCK_LIMIT) {
        next.lockedUntil = Date.now() + LOCK_WINDOW_MS;
        next.count = 0;
        toast.error("Too many attempts detected. Please wait 2 minutes for security reset.");
      }
      writeLock(next); setLock(next);
      setError(result.error || "We couldn't verify those credentials. Try again or contact System Admin.");
      triggerShake("both");
      setLoading(false);
      return;
    }
    // success
    setSuccess(true);
    writeLock({ count: 0 });
    setLock({ count: 0 });
    toast.success("Access granted.");
    // AuthProvider switches the tree on next render; small delay for the flash.
    setTimeout(() => setLoading(false), 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isLocked) return;
    if (!online) { setError("Connection interrupted. Check internet and retry."); return; }
    if (!email.trim()) { setError("Please enter your registered ID."); triggerShake("email"); return; }
    if (!validEmail) { setError("Please enter a valid email address."); triggerShake("email"); return; }
    if (!password) { setError("Password didn't match our records."); triggerShake("password"); return; }

    // Owner gets the OTP stub step.
    if (chipRole === "owner") {
      setPendingLogin({ email, password });
      setOtpStep(true);
      return;
    }

    setLoading(true);
    if (slowTimer.current) clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), 4000);
    setTimeout(() => finishLogin(email, password), 600);
  };

  const handleOtpSubmit = () => {
    // Stub: any 6 digits accepted. Real OTP integration would verify here.
    if (!/^\d{6}$/.test(otpDigits)) { toast.error("Enter the 6-digit code."); return; }
    if (!pendingLogin) return;
    setLoading(true);
    setOtpStep(false);
    setTimeout(() => finishLogin(pendingLogin.email, pendingLogin.password), 500);
  };

  const sendForgot = () => {
    if (!forgotEmail.trim()) { toast.error("Enter your registered ID."); return; }
    toast.success("Recovery instructions sent. Check your inbox.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  /* ───────── Render ───────── */

  const isOpsTier = activeChip.tier === "ops";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ════ Left panel — branding (premium tier only) ════ */}
      {!isOpsTier && (
        <aside className="hidden md:flex flex-col justify-between w-[42%] lg:w-[44%] bg-secondary text-secondary-foreground p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 30% 20%, hsl(var(--primary)) 0, transparent 45%), radial-gradient(circle at 80% 80%, hsl(var(--primary)) 0, transparent 40%)" }} />

          <div className="relative animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <span className="font-bold text-primary-foreground">RA</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Red Apple Learning</p>
                <p className="text-[11px] text-secondary-foreground/60">Finance & Operations</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-6">
            <div className="space-y-2 animate-fade-up">
              <p className="text-[11px] uppercase tracking-[0.18em] text-secondary-foreground/50">{greeting}</p>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                Red Apple Learning <span className="text-primary">Control Center</span>
              </h1>
              <p className="text-sm text-secondary-foreground/70 max-w-md">
                Secure access to finance, billing and business intelligence.
              </p>
            </div>

            {/* Rotating trust message — key forces re-mount + fade */}
            <div key={trust} className="flex items-center gap-2 text-xs text-secondary-foreground/80 animate-fade-in-soft">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{trust}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { k: "Verified", v: "Daily reconciliation" },
                { k: "Encrypted", v: "256-bit session" },
                { k: "Audited", v: "Full accountability" },
                { k: "Real-time", v: "Live KPIs" },
              ].map((x, i) => (
                <div key={x.k}
                  className="rounded-lg border border-secondary-foreground/10 bg-secondary-foreground/[0.04] px-3 py-2.5 animate-fade-up"
                  style={{ animationDelay: `${100 + i * 70}ms` }}>
                  <p className="text-[10px] uppercase tracking-wider text-secondary-foreground/50">{x.k}</p>
                  <p className="text-xs font-medium mt-0.5">{x.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-[11px] text-secondary-foreground/50 flex items-center gap-2">
            <span>Restricted system. Authorized personnel only.</span>
          </div>
        </aside>
      )}

      {/* ════ Right panel — login ════ */}
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md space-y-5">
          {/* Mobile logo */}
          <div className="md:hidden text-center animate-fade-up">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground">RA</span>
            </div>
            <p className="mt-2 text-sm font-semibold">Red Apple Learning</p>
          </div>

          {/* Banners */}
          {!online && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive flex items-center gap-2 animate-fade-up">
              <WifiOff className="h-3.5 w-3.5" />
              <span><strong>Connection interrupted.</strong> Check internet and retry.</span>
            </div>
          )}
          {suspicious && online && (
            <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning flex items-start gap-2 animate-fade-up">
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span><strong>New device detected.</strong> Verification may be required after sign-in.</span>
            </div>
          )}

          {/* Role chips — grouped by tier */}
          <div className="space-y-3 animate-fade-up">
            <Label className="text-xs text-muted-foreground">Select Access Role</Label>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Finance & Leadership</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_CHIPS.filter(r => r.tier === "premium").map(r => {
                  const Icon = r.icon;
                  const active = chipRole === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setChipRole(r.value)}
                      aria-pressed={active}
                      className={`group relative rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                        active
                          ? "border-primary bg-primary/5 shadow-card"
                          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                        <span className={`text-xs font-medium ${active ? "text-foreground" : "text-foreground/80"}`}>{r.label}</span>
                      </div>
                      {active && <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Operations & Sales</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_CHIPS.filter(r => r.tier === "ops").map(r => {
                  const Icon = r.icon;
                  const active = chipRole === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setChipRole(r.value)}
                      aria-pressed={active}
                      className={`group relative rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                        active
                          ? "border-primary bg-primary/5 shadow-card"
                          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                        <span className={`text-[11px] font-medium ${active ? "text-foreground" : "text-foreground/80"}`}>{r.label}</span>
                      </div>
                      {active && <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <p key={chipRole} className="text-[11px] text-muted-foreground animate-fade-in-soft">
              {activeChip.subtitle}
            </p>
          </div>

          {/* Form card */}
          <form onSubmit={handleSubmit} className="rounded-xl bg-card p-6 shadow-card space-y-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Sign in to your workspace</h2>
              <p className="text-xs text-muted-foreground">{greeting}</p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3 w-3 text-muted-foreground" /> Employee ID / Email
              </Label>
              <div className={`relative rounded-md ${emailError ? "animate-field-shake" : ""} ${emailFocused ? "animate-soft-glow" : ""}`}>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter employee ID / email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoComplete="email"
                  autoFocus
                  disabled={isLocked}
                  aria-label="Employee ID or email"
                  className={`pr-9 ${emailError ? "border-destructive" : ""}`}
                />
                {validEmail && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" aria-hidden />
                )}
              </div>
              {emailFocused && !email && (
                <p className="text-[10px] text-muted-foreground">Use your official registered credentials.</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="flex items-center gap-1.5 text-xs">
                  <Lock className={`h-3 w-3 transition-colors ${passwordFocused ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                  Password
                </Label>
                <button type="button" onClick={() => setForgotOpen(true)}
                  className="text-[11px] text-primary hover:underline">
                  Need help signing in?
                </button>
              </div>
              <div className={`relative rounded-md ${passwordError ? "animate-field-shake" : ""} ${passwordFocused ? "animate-soft-glow" : ""}`}>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onKeyUp={handleKey}
                  onKeyDown={handleKey}
                  autoComplete="current-password"
                  disabled={isLocked}
                  aria-label="Password"
                  className={`pr-10 ${passwordError ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title="Show / hide password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsOn && (
                <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                  Caps Lock is ON
                </Badge>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">We couldn't verify those credentials.</p>
                  <p className="text-[11px] opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* Lockout */}
            {isLocked && (
              <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Too many attempts. Try again in <strong>{lockSeconds}s</strong>.</span>
              </div>
            )}

            {/* Slow */}
            {slow && loading && (
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Still connecting securely... please wait a moment.
              </div>
            )}

            {/* CTA */}
            <Button
              type="submit"
              size="lg"
              disabled={loading || isLocked || !online}
              className={`w-full h-11 group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${success ? "bg-success hover:bg-success" : ""}`}
            >
              {success ? (
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Access granted</span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating access...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In Securely
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>

            {/* Security indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-success" /> 256-bit encrypted session</span>
              <span className="flex items-center gap-1"><KeyRound className="h-3 w-3 text-primary" /> Role-based secure access</span>
              <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-muted-foreground" /> Auto logout on inactivity</span>
            </div>
          </form>

          {/* Demo credentials */}
          <details className="rounded-xl bg-card p-4 shadow-card text-xs animate-fade-up" style={{ animationDelay: "120ms" }}>
            <summary className="cursor-pointer font-semibold text-card-foreground select-none">Demo Credentials</summary>
            <div className="mt-3 space-y-1.5 text-muted-foreground">
              <div className="flex justify-between"><span>Owner</span><span className="font-mono text-card-foreground">rajesh@redapple.com / owner123</span></div>
              <div className="flex justify-between"><span>Admin</span><span className="font-mono text-card-foreground">amit@redapple.com / admin123</span></div>
              <div className="flex justify-between"><span>Accounts Mgr</span><span className="font-mono text-card-foreground">neha@redapple.com / accounts123</span></div>
              <div className="flex justify-between"><span>Accounts Exec</span><span className="font-mono text-card-foreground">arjun@redapple.com / accounts123</span></div>
              <div className="flex justify-between"><span>Counselor</span><span className="font-mono text-card-foreground">manjari@redapple.com / counselor123</span></div>
              <div className="flex justify-between"><span>Telecaller</span><span className="font-mono text-card-foreground">shreya@redapple.com / telecaller123</span></div>
            </div>
          </details>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
            <span>Need technical support? Contact System Admin</span>
            <span>v2.6 · Finance Secure Build</span>
          </div>
        </div>
      </main>

      {/* Forgot password modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Reset access securely.
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your registered email or employee ID. We'll send recovery instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Registered email / Employee ID</Label>
            <Input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@redapple.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
            <Button onClick={sendForgot}>Send Reset Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP stub for Owner */}
      <Dialog open={otpStep} onOpenChange={(o) => { if (!o) { setOtpStep(false); setPendingLogin(null); setOtpDigits(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Sensitive access requires second verification.
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the 6-digit OTP sent to your registered device. <span className="text-muted-foreground">(Demo: any 6 digits)</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">One-time passcode</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={otpDigits}
              onChange={(e) => setOtpDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="text-center tracking-[0.6em] text-lg font-mono"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOtpStep(false); setPendingLogin(null); setOtpDigits(""); }}>Cancel</Button>
            <Button onClick={handleOtpSubmit}>Verify & Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export so existing `import { roleLabels } from ...` callers don't break.
export { roleLabels };
