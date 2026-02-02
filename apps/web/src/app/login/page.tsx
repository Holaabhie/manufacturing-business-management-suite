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
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // SSO Modal states
  const [ssoProvider, setSsoProvider] = useState<"google" | "microsoft" | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Countdown timer for resend OTP
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-format Indian phone number
  const formatPhone = (value: string) => {
    // Remove all non-digit characters
    let digits = value.replace(/\D/g, '');

    // If the input already started with 91 (from existing +91 prefix), strip it
    // We check this by seeing if the user entered value likely included the prefix
    if (digits.startsWith('91')) {
      digits = digits.substring(2);
    }

    // Handle cases where user might have typed 0 at start
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Limit to 10 digits
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }

    // Always return with +91 prefix if there are digits, otherwise empty
    return digits ? `+91${digits}` : '';
  };

  // Validate email or username format
  const isValidEmailOrUsername = (value: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernamePattern = /^[a-zA-Z0-9_-]{3,30}$/;
    return emailPattern.test(value) || usernamePattern.test(value);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmailOrUsername(emailOrUsername)) {
      toast.error("Please enter a valid email or username");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailOrUsername, password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Login failed");
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailOrUsername, password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Registration failed");
        toast.success("Account created!");
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle SSO button click
  const handleSsoClick = (provider: "google" | "microsoft") => {
    setSsoProvider(provider);
    setShowPhoneModal(true);
    // Reset phone modal state
    setPhone("");
    setOtp("");
    setOtpSent(false);
  };

  // Handle sending OTP
  const handleSendOtp = async () => {
    if (!phone || !phone.match(/^\+91\d{10}$/)) {
      toast.error("Please enter a valid Indian phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send OTP");

      setOtpSent(true);
      setCountdown(60);
      toast.success("OTP sent to your phone!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle verifying OTP
  const handleVerifyOtp = async () => {
    if (!phone || !otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, otp, purpose: "login" }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Invalid OTP");

      toast.success("Login successful!");
      setShowPhoneModal(false);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Close modal and reset state
  const handleCloseModal = () => {
    setShowPhoneModal(false);
    setSsoProvider(null);
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setCountdown(0);
  };

  // Feature items for the left panel
  const features = [
    {
      icon: Brain,
      label: "AI-Powered Business Assistant",
      description: "Smart insights and automation",
      gradient: "from-purple-500/20 to-indigo-500/20 dark:from-purple-500/30 dark:to-indigo-500/30"
    },
    {
      icon: FileText,
      label: "Intelligent Invoice Generator",
      description: "Auto-create and manage bills",
      gradient: "from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30"
    },
    {
      icon: BarChart3,
      label: "Real-time Data Analytics",
      description: "Track performance metrics live",
      gradient: "from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/30 dark:to-teal-500/30"
    },
    {
      icon: Cloud,
      label: "Cloud-Based Management",
      description: "Access anywhere, anytime",
      gradient: "from-orange-500/20 to-amber-500/20 dark:from-orange-500/30 dark:to-amber-500/30"
    },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Left Panel - Visuals (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-muted to-background dark:from-slate-900 dark:to-black border-r border-border">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 px-12 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
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

            {/* Feature Cards with Gradient Backgrounds */}
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

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 bottom-20 w-32 h-32 border border-accent/20 rounded-full blur-sm"
        />
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[420px] space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="lg:hidden flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent rounded-lg">
                  <Factory className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="font-bold text-xl tracking-tight">IND Manager</span>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-3xl font-bold tracking-tight">
                {isLogin ? "Sign In" : "Create Account"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isLogin
                  ? "Access your dashboard to manage business operations."
                  : "Join the next generation of intelligent management."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email or Username</Label>
                <div className="relative group">
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="admin@company.com or username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className="h-12 bg-muted/50 dark:bg-white/5 border-border text-foreground focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 pr-4 group-hover:border-accent/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <button type="button" className="text-xs text-accent hover:underline font-medium">Forgot password?</button>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-muted/50 dark:bg-white/5 border-border text-foreground focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 pr-12 group-hover:border-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={showPassword ? "eye-off" : "eye"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-border bg-muted/50 dark:bg-white/5 text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl transition-all shadow-lg shadow-accent/20 group"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-accent-foreground/20 border-t-accent-foreground rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{isLogin ? "Sign Into Dashboard" : "Register Account"}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSsoClick("google")}
                className="w-full h-11 flex items-center justify-center gap-2 border border-border rounded-xl bg-muted/50 dark:bg-white/5 text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium">Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSsoClick("microsoft")}
                className="w-full h-11 flex items-center justify-center gap-2 border border-border rounded-xl bg-muted/50 dark:bg-white/5 text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#F25022"
                    d="M11.4 11.4H0V0h11.4v11.4z"
                  />
                  <path
                    fill="#7FBA00"
                    d="M24 11.4H12.6V0H24v11.4z"
                  />
                  <path
                    fill="#00A4EF"
                    d="M11.4 24H0V12.6h11.4V24z"
                  />
                  <path
                    fill="#FFB900"
                    d="M24 24H12.6V12.6H24V24z"
                  />
                </svg>
                <span className="text-sm font-medium">Microsoft</span>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className="text-accent font-bold underline underline-offset-4">
                  {isLogin ? "Sign up free" : "Sign in here"}
                </span>
              </button>
            </div>
          </motion.div>

          <p className="text-center text-[10px] text-muted-foreground/60 mt-12 uppercase tracking-[0.2em]">
            &copy; 2026 Industry Managing System &bull; All Rights Reserved
          </p>
        </div>
      </div>

      {/* Phone Verification Modal */}
      <Dialog open={showPhoneModal} onOpenChange={handleCloseModal}>
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
              {!otpSent
                ? "Enter your phone number to verify your identity"
                : `Enter the 6-digit OTP sent to ${phone}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91XXXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={loading || !phone.match(/^\+91\d{10}$/)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Send OTP
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
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
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    disabled={loading}
                  >
                    Change Number
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  {countdown > 0 ? (
                    <p className="text-muted-foreground">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </Button>
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

