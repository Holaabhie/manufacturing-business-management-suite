"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Factory,
  ArrowRight,
  Eye,
  EyeOff,
  Brain,
  FileText,
  BarChart3,
  Cloud,
  Phone,
  Loader2,
  Shield,
  Users,
  BadgeCheck,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";
type Portal = "admin" | "staff";
type LoginStep = "credentials" | "otp";

export default function LoginPage() {
  // ─── Core State ───────────────────────────────────────────────
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [portal, setPortal] = useState<Portal>("admin");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ─── Admin Fields ─────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ─── Staff Fields ─────────────────────────────────────────────
  const [employeeId, setEmployeeId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // ─── Register Fields ──────────────────────────────────────────
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // ─── Security Feedback ────────────────────────────────────────
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);

  // ─── OTP State ────────────────────────────────────────────────
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMethod, setOtpMethod] = useState("email");
  const [countdown, setCountdown] = useState(0);

  // ─── SSO Modal State ──────────────────────────────────────────
  const [ssoProvider, setSsoProvider] = useState<"google" | "microsoft" | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [ssoOtp, setSsoOtp] = useState("");
  const [ssoOtpSent, setSsoOtpSent] = useState(false);
  const [ssoCountdown, setSsoCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (ssoCountdown > 0) {
      const timer = setTimeout(() => setSsoCountdown(ssoCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [ssoCountdown]);

  // ─── Reset when switching portals or modes ────────────────────
  useEffect(() => {
    setStep("credentials");
    setAttemptsRemaining(null);
    setLockedMinutes(null);
    setOtp("");
  }, [portal, authMode]);

  // ─── Phone Formatter ─────────────────────────────────────────
  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('91')) digits = digits.substring(2);
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.length > 10) digits = digits.substring(0, 10);
    return digits ? `+91${digits}` : '';
  };

  // ═══════════════════════════════════════════════════════════════
  // ADMIN LOGIN
  // ═══════════════════════════════════════════════════════════════
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Email and password are required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, loginType: "admin" }),
      });
      const json = await res.json().catch(() => ({}));

      if (json.locked) {
        setLockedMinutes(json.remainingMinutes || 15);
        toast.error(json.error || "Account temporarily locked");
        return;
      }
      if (!res.ok) {
        if (json.attemptsRemaining !== undefined) setAttemptsRemaining(json.attemptsRemaining);
        throw new Error(json?.error || "Login failed");
      }

      setAttemptsRemaining(null);
      setLockedMinutes(null);
      toast.success("Welcome back, Admin!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STAFF LOGIN
  // ═══════════════════════════════════════════════════════════════
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !staffPassword) { toast.error("Employee ID and password are required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId, password: staffPassword, loginType: "staff" }),
      });
      const json = await res.json().catch(() => ({}));

      if (json.locked) {
        setLockedMinutes(json.remainingMinutes || 30);
        toast.error(json.error || "Account temporarily locked");
        return;
      }
      if (!res.ok) {
        if (json.attemptsRemaining !== undefined) setAttemptsRemaining(json.attemptsRemaining);
        throw new Error(json?.error || "Login failed");
      }

      // OTP required
      if (json.otpRequired) {
        setUserId(json.userId);
        setOtpMethod(json.otpDeliveryMethod || "email");
        setStep("otp");
        await sendStaffOtp(json.userId);
        return;
      }

      // First-time setup
      if (json.firstLoginCompleted === false) {
        toast.success("Welcome! Please complete your account setup.");
        router.push("/staff/setup");
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const sendStaffOtp = async (uid?: string) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: uid || userId, purpose: "login" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to send OTP");
      }
      setCountdown(30);
      toast.success(`OTP sent via ${otpMethod}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleVerifyStaffOtp = async () => {
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, otp, purpose: "login" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Invalid OTP");
      }
      toast.success("Verification successful!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !registerPhone) { toast.error("All fields are required"); return; }
    if (registerPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!registerPhone.match(/^\+91\d{10}$/)) { toast.error("Enter a valid Indian phone number (+91...)"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          fullName: registerName,
          phone: registerPhone
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Registration failed");
      toast.success("Account created! Welcome to IND Manager.");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SSO HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSsoClick = (provider: "google" | "microsoft") => {
    setSsoProvider(provider);
    setShowPhoneModal(true);
    setPhone("");
    setSsoOtp("");
    setSsoOtpSent(false);
  };

  const handleSendSsoOtp = async () => {
    if (!phone || !phone.match(/^\+91\d{10}$/)) { toast.error("Enter a valid Indian phone number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send OTP");
      setSsoOtpSent(true);
      setSsoCountdown(60);
      toast.success("OTP sent to your phone!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySsoOtp = async () => {
    if (ssoOtp.length !== 6) { toast.error("Enter a valid 6-digit OTP"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, otp: ssoOtp, purpose: "login" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Invalid OTP");
      toast.success("Login successful!");
      setShowPhoneModal(false);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Feature Cards (left panel) ──────────────────────────────
  const features = [
    { icon: Brain, label: "AI-Powered Business Assistant", description: "Smart insights and automation", gradient: "from-purple-500/20 to-indigo-500/20 dark:from-purple-500/30 dark:to-indigo-500/30" },
    { icon: FileText, label: "Intelligent Invoice Generator", description: "Auto-create and manage bills", gradient: "from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30" },
    { icon: BarChart3, label: "Real-time Data Analytics", description: "Track performance metrics live", gradient: "from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/30 dark:to-teal-500/30" },
    { icon: Cloud, label: "Cloud-Based Management", description: "Access anywhere, anytime", gradient: "from-orange-500/20 to-amber-500/20 dark:from-orange-500/30 dark:to-amber-500/30" },
  ];

  // ─── Dynamic accent based on portal ──────────────────────────
  const accent = portal === "admin"
    ? { bg: "bg-indigo-600", hover: "hover:bg-indigo-700", shadow: "shadow-indigo-600/20", text: "text-indigo-400", border: "border-indigo-500/30", bgLight: "bg-indigo-500/10", ring: "ring-indigo-500/20" }
    : { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "shadow-emerald-600/20", text: "text-emerald-400", border: "border-emerald-500/30", bgLight: "bg-emerald-500/10", ring: "ring-emerald-500/20" };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* ─── Left Panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-muted to-background dark:from-slate-900 dark:to-black border-r border-border">
        <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 px-12 max-w-xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-accent rounded-2xl shadow-lg shadow-accent/30">
                <Factory className="h-8 w-8 text-accent-foreground" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">IND Manager</h1>
            </div>
            <h2 className="text-5xl font-bold leading-tight mb-6">
              Intelligent Business <br />
              <span className="text-accent">Management Suite</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Harness the power of AI to streamline your business operations, automate workflows, and gain actionable insights.
            </p>

            <div className="space-y-4">
              {features.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border border-border bg-gradient-to-r ${item.gradient} backdrop-blur-sm hover:border-accent/30 transition-all duration-300 hover:scale-[1.02] cursor-default`}
                >
                  <div className="p-2 bg-card/50 dark:bg-white/10 rounded-lg shrink-0">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{item.label}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 bottom-20 w-32 h-32 border border-accent/20 rounded-full blur-sm"
        />
      </div>

      {/* ─── Right Panel ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px] space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent rounded-lg">
                  <Factory className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="font-bold text-xl tracking-tight">IND Manager</span>
              </div>
            </div>

            {/* ─── Portal Switcher ───────────────────────────────── */}
            {authMode === "login" && step === "credentials" && (
              <div className="flex p-1 bg-muted/50 dark:bg-white/5 rounded-xl border border-border mb-6">
                <button
                  type="button"
                  onClick={() => setPortal("admin")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    portal === "admin"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setPortal("staff")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    portal === "staff"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Staff
                </button>
              </div>
            )}

            {/* Header */}
            <div className="space-y-2 mb-6">
              <h3 className="text-3xl font-bold tracking-tight">
                {authMode === "register" ? "Create Account" : step === "otp" ? "Verify Identity" : portal === "admin" ? "Admin Sign In" : "Staff Sign In"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {authMode === "register"
                  ? "Register as an organization administrator."
                  : step === "otp"
                    ? `Enter the 6-digit OTP sent to your registered ${otpMethod}.`
                    : portal === "admin"
                      ? "Access your dashboard to manage business operations."
                      : "Enter your employee credentials for the operational dashboard."}
              </p>
            </div>

            {/* Lockout Warning */}
            {lockedMinutes && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 mb-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Lock className="h-4 w-4" />
                  <p className="text-sm font-semibold">Account Temporarily Locked</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Too many failed attempts. Try again in {lockedMinutes} minute(s).
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* ═══ ADMIN LOGIN ══════════════════════════════════ */}
              {authMode === "login" && portal === "admin" && step === "credentials" && (
                <motion.form
                  key="admin-login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleAdminLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input id="admin-email" type="text" placeholder="admin@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="admin-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <button type="button" className="text-xs text-indigo-400 hover:underline font-medium">Forgot password?</button>
                    </div>
                    <div className="relative group">
                      <Input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12 group-hover:border-indigo-500/30" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={showPassword ? "off" : "on"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="remember" className="w-4 h-4 rounded border-border bg-muted/50 dark:bg-white/5 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">Remember me for 30 days</label>
                  </div>

                  {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {attemptsRemaining} attempt(s) remaining before lockout
                    </motion.p>
                  )}

                  <Button type="submit" className={`w-full h-12 ${accent.bg} ${accent.hover} text-white font-bold rounded-xl transition-all shadow-lg ${accent.shadow} group`} disabled={loading || !!lockedMinutes}>
                    {loading ? (
                      <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Authenticating...</span></div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Sign In as Admin</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </motion.form>
              )}

              {/* ═══ STAFF LOGIN ══════════════════════════════════ */}
              {authMode === "login" && portal === "staff" && step === "credentials" && (
                <motion.form
                  key="staff-login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStaffLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="staff-emp-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee ID</Label>
                    <Input id="staff-emp-id" type="text" placeholder="EMP-001 or your employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl font-mono uppercase" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="staff-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <button type="button" className="text-xs text-emerald-400 hover:underline font-medium">Forgot password?</button>
                    </div>
                    <div className="relative group">
                      <Input id="staff-password" type={showStaffPassword ? "text" : "password"} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12 group-hover:border-emerald-500/30" />
                      <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={showStaffPassword ? "off" : "on"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                            {showStaffPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {attemptsRemaining} attempt(s) remaining before lockout
                    </motion.p>
                  )}

                  <Button type="submit" className={`w-full h-12 ${accent.bg} ${accent.hover} text-white font-bold rounded-xl transition-all shadow-lg ${accent.shadow} group`} disabled={loading || !!lockedMinutes}>
                    {loading ? (
                      <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Verifying...</span></div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <BadgeCheck className="h-4 w-4" />
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </motion.form>
              )}

              {/* ═══ OTP STEP ════════════════════════════════════ */}
              {authMode === "login" && step === "otp" && (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-muted-foreground">Resend OTP in <span className="font-bold text-foreground">{countdown}s</span></p>
                    ) : (
                      <Button type="button" variant="link" className="p-0 h-auto text-emerald-400 hover:text-emerald-300" onClick={() => sendStaffOtp()} disabled={loading}>Resend OTP</Button>
                    )}
                  </div>

                  <Button className={`w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20`} onClick={handleVerifyStaffOtp} disabled={loading || otp.length !== 6}>
                    {loading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Verifying...</span></div> : "Verify & Sign In"}
                  </Button>

                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("credentials"); setOtp(""); }}>
                    ← Back to credentials
                  </Button>
                </motion.div>
              )}

              {/* ═══ REGISTER ════════════════════════════════════ */}
              {authMode === "register" && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleRegister}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <Input id="reg-name" type="text" placeholder="Your full name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="reg-phone" type="tel" placeholder="+91XXXXXXXXXX" value={registerPhone} onChange={(e) => setRegisterPhone(formatPhone(e.target.value))} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input id="reg-email" type="email" placeholder="admin@company.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password (min 8 chars)</Label>
                    <div className="relative">
                      <Input id="reg-password" type={showRegisterPassword ? "text" : "password"} value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12" />
                      <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md">
                        {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Creating account...</span></div>
                    ) : (
                      <div className="flex items-center justify-center gap-2"><span>Create Admin Account</span><ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* ─── SSO Buttons (Admin login only) ────────────── */}
            {authMode === "login" && portal === "admin" && step === "credentials" && (
              <>
                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleSsoClick("google")} className="w-full h-11 flex items-center justify-center gap-2 border border-border rounded-xl bg-muted/50 dark:bg-white/5 text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-sm font-medium">Google</span>
                  </button>
                  <button type="button" onClick={() => handleSsoClick("microsoft")} className="w-full h-11 flex items-center justify-center gap-2 border border-border rounded-xl bg-muted/50 dark:bg-white/5 text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
                      <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
                      <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
                      <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
                    </svg>
                    <span className="text-sm font-medium">Microsoft</span>
                  </button>
                </div>
              </>
            )}

            {/* ─── Toggle Login / Register ───────────────────── */}
            {step === "credentials" && (
              <div className="mt-6 flex flex-col gap-3">
                <button type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors py-2">
                  {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <span className={`${accent.text} font-bold underline underline-offset-4`}>
                    {authMode === "login" ? "Register as Admin" : "Sign in here"}
                  </span>
                </button>
              </div>
            )}

          </motion.div>

          <p className="text-center text-[10px] text-muted-foreground/60 mt-8 uppercase tracking-[0.2em]">
            &copy; 2026 Industry Managing System &bull; All Rights Reserved
          </p>
        </div>
      </div>

      {/* ─── SSO Phone Verification Modal ──────────────────────── */}
      <Dialog open={showPhoneModal} onOpenChange={(open) => { if (!open) { setShowPhoneModal(false); setSsoProvider(null); setPhone(""); setSsoOtp(""); setSsoOtpSent(false); setSsoCountdown(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {ssoProvider === "google" ? (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
                    <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
                    <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
                    <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
                  </svg>
                  Continue with Microsoft
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {!ssoOtpSent ? "Enter your phone number to verify your identity" : `Enter the 6-digit OTP sent to ${phone}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!ssoOtpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sso-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="sso-phone" type="tel" placeholder="+91XXXXXXXXXX" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="pl-10" required />
                  </div>
                </div>
                <Button type="button" className="w-full" onClick={handleSendSsoOtp} disabled={loading || !phone.match(/^\+91\d{10}$/)}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</> : <><Phone className="mr-2 h-4 w-4" />Send OTP</>}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={ssoOtp} onChange={(value) => setSsoOtp(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setSsoOtpSent(false); setSsoOtp(""); }} disabled={loading}>Change Number</Button>
                  <Button type="button" className="flex-1" onClick={handleVerifySsoOtp} disabled={loading || ssoOtp.length !== 6}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify OTP"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  {ssoCountdown > 0 ? (
                    <p className="text-muted-foreground">Resend OTP in {ssoCountdown}s</p>
                  ) : (
                    <Button type="button" variant="link" className="p-0 h-auto font-normal" onClick={handleSendSsoOtp} disabled={loading}>Resend OTP</Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
