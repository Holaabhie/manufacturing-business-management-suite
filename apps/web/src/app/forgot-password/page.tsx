"use client";

import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Lock,
  KeyRound,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneField, PasswordField, OtpInput } from "@/components/auth";

type ResetStep = "phone" | "otp" | "new-password" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────
  const [step, setStep] = useState<ResetStep>("phone");
  const [loading, setLoading] = useState(false);

  // Phone step
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // OTP step
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  // Password step
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // ─── Countdown Timer ──────────────────────────────────────────
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Send OTP to phone
  // ═══════════════════════════════════════════════════════════════
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPhoneError("");

    if (!phone || phone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit Indian phone number");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to send OTP");
      }

      toast.success("If an account exists, an OTP has been sent to your phone.");
      setCountdown(30);
      setStep("otp");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Resend OTP
  // ═══════════════════════════════════════════════════════════════
  const handleResendOtp = async () => {
    setLoading(true);
    setOtpError("");
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to resend OTP");
      }
      setCountdown(30);
      setResendCount((prev) => prev + 1);
      toast.success("OTP resent to your phone");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Verify OTP
  // ═══════════════════════════════════════════════════════════════
  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, otp, purpose: "forgot-password" }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = json?.error || "Invalid OTP";
        setOtpError(msg);
        throw new Error(msg);
      }

      if (!json.resetToken) {
        throw new Error("No reset token received. Please try again.");
      }

      setResetToken(json.resetToken);
      toast.success("OTP verified! Set your new password.");
      setStep("new-password");
    } catch (error: any) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Reset Password
  // ═══════════════════════════════════════════════════════════════
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setConfirmError("");

    if (newPassword.length < 8) {
      setPwdError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPwdError("Password must contain an uppercase letter");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setPwdError("Password must contain a lowercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPwdError("Password must contain a number");
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, newPassword, resetToken }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to reset password");
      }

      toast.success("Password reset successfully!");
      setStep("success");
    } catch (error: any) {
      toast.error(error.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step Indicators ──────────────────────────────────────────
  const steps = [
    { key: "phone", label: "Phone" },
    { key: "otp", label: "Verify" },
    { key: "new-password", label: "Reset" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* ─── Left Panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-r border-border">
        <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 px-12 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <BrandLogo
                variant="full"
                width={160}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
            </div>
            <h2 className="text-5xl font-bold leading-tight mb-6 text-white">
              Reset Your <br />
              <span className="text-indigo-400">Password</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              We&apos;ll send a one-time verification code to your registered phone number to verify your identity.
            </p>

            <div className="space-y-4">
              {[
                { icon: Phone, label: "Phone Verification", desc: "OTP sent to your registered number" },
                { icon: Shield, label: "Secure Process", desc: "Time-limited tokens for safety" },
                { icon: Lock, label: "Strong Password Policy", desc: "Enforced password requirements" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm"
                >
                  <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                    <item.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{item.label}</h4>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px] space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <BrandLogo
                variant="full"
                width={150}
                height={38}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>

            {/* Progress Steps */}
            {step !== "success" && (
              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                        i <= currentStepIndex
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "bg-muted/50 text-muted-foreground border border-border"
                      }`}
                    >
                      {i < currentStepIndex ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline ${
                        i <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                    {i < steps.length - 1 && (
                      <div
                        className={`w-8 h-0.5 rounded-full ${
                          i < currentStepIndex ? "bg-indigo-600" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ═══ STEP 1: PHONE ═════════════════════════════════ */}
              {step === "phone" && (
                <motion.div
                  key="phone-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-2 mb-6">
                    <h3 className="text-3xl font-bold tracking-tight">Forgot Password?</h3>
                    <p className="text-muted-foreground text-sm">
                      Enter your registered phone number and we&apos;ll send you a verification code.
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <PhoneField
                      id="reset-phone"
                      label="Registered Phone Number"
                      value={phone}
                      onChange={(val) => {
                        setPhone(val);
                        setPhoneError("");
                      }}
                      error={phoneError}
                      helperText="This should be the mobile number associated with your account."
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Send Verification Code</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* ═══ STEP 2: OTP VERIFICATION ═════════════════════ */}
              {step === "otp" && (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-2 mb-6">
                    <h3 className="text-3xl font-bold tracking-tight">Verify OTP</h3>
                    <p className="text-muted-foreground text-sm">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-semibold text-foreground">+91 {phone}</span>
                    </p>
                  </div>

                  <div className="space-y-6">
                    <OtpInput
                      value={otp}
                      onChange={(val) => {
                        setOtp(val);
                        setOtpError("");
                      }}
                      error={otpError}
                      autoFocus={true}
                    />

                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Resend OTP in <span className="font-bold text-foreground">{countdown}s</span>
                        </p>
                      ) : resendCount < 3 ? (
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-indigo-400 hover:text-indigo-300"
                          onClick={handleResendOtp}
                          disabled={loading}
                        >
                          Resend OTP ({3 - resendCount} remaining)
                        </Button>
                      ) : (
                        <p className="text-sm text-red-400">
                          Maximum resend attempts reached. Please try again later.
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 group"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Verify Code</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setStep("phone");
                        setOtp("");
                        setOtpError("");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Change phone number
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 3: NEW PASSWORD ═════════════════════════ */}
              {step === "new-password" && (
                <motion.div
                  key="password-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-2 mb-6">
                    <h3 className="text-3xl font-bold tracking-tight">Set New Password</h3>
                    <p className="text-muted-foreground text-sm">
                      Choose a strong password for your account.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <PasswordField
                      id="new-password"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPwdError("");
                      }}
                      showStrength={true}
                      error={pwdError}
                    />

                    <PasswordField
                      id="confirm-password"
                      label="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setConfirmError("");
                      }}
                      error={confirmError}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group"
                      disabled={loading || !newPassword || !confirmPassword}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Resetting password...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          <span>Reset Password</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* ═══ SUCCESS ══════════════════════════════════════ */}
              {step === "success" && (
                <motion.div
                  key="success-step"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <div className="p-4 bg-emerald-500/20 rounded-full">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold tracking-tight">Password Reset!</h3>
                    <p className="text-muted-foreground text-sm">
                      Your password has been successfully updated. All existing sessions have been signed out for security.
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group"
                    onClick={() => router.push("/login")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Sign In with New Password</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back to Login */}
            {step !== "success" && (
              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </span>
                </a>
              </div>
            )}
          </motion.div>

          <p className="text-center text-[10px] text-muted-foreground/60 mt-8 uppercase tracking-[0.2em]">
            &copy; 2026 Industry Managing System &bull; All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
