"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Factory,
    ArrowRight,
    ArrowLeft,
    Phone,
    Loader2,
    Shield,
    Lock,
    KeyRound,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type ResetStep = "phone" | "otp" | "new-password" | "success";

export default function ForgotPasswordPage() {
    const router = useRouter();

    // ─── State ────────────────────────────────────────────────────
    const [step, setStep] = useState<ResetStep>("phone");
    const [loading, setLoading] = useState(false);

    // Phone step
    const [phone, setPhone] = useState("");

    // OTP step
    const [otp, setOtp] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [resendCount, setResendCount] = useState(0);

    // Password step
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ─── Countdown Timer ──────────────────────────────────────────
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ─── Phone Formatter ──────────────────────────────────────────
    const formatPhone = (value: string) => {
        let digits = value.replace(/\D/g, "");
        if (digits.startsWith("91")) digits = digits.substring(2);
        if (digits.startsWith("0")) digits = digits.substring(1);
        if (digits.length > 10) digits = digits.substring(0, 10);
        return digits ? `+91${digits}` : "";
    };

    // ─── Password Strength ───────────────────────────────────────
    const passwordStrength = useMemo(() => {
        const p = newPassword;
        if (!p) return { score: 0, label: "", color: "" };
        let score = 0;
        if (p.length >= 8) score += 20;
        if (p.length >= 12) score += 10;
        if (p.length >= 16) score += 10;
        if (/[A-Z]/.test(p)) score += 15;
        if (/[a-z]/.test(p)) score += 10;
        if (/[0-9]/.test(p)) score += 15;
        if (/[^A-Za-z0-9]/.test(p)) score += 20;
        score = Math.min(100, score);
        if (score < 30) return { score, label: "Weak", color: "bg-red-500" };
        if (score < 55) return { score, label: "Fair", color: "bg-amber-500" };
        if (score < 80) return { score, label: "Good", color: "bg-blue-500" };
        return { score, label: "Strong", color: "bg-emerald-500" };
    }, [newPassword]);

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Send OTP to phone
    // ═══════════════════════════════════════════════════════════════
    const handleSendOtp = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!phone || !phone.match(/^\+91\d{10}$/)) {
            toast.error("Please enter a valid 10-digit Indian phone number");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone }),
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
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone }),
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
        if (!otp || otp.length !== 6) {
            toast.error("Please enter the 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone, otp, purpose: "forgot-password" }),
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(json?.error || "Invalid OTP");
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

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            toast.error("Password must contain an uppercase letter");
            return;
        }
        if (!/[a-z]/.test(newPassword)) {
            toast.error("Password must contain a lowercase letter");
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            toast.error("Password must contain a number");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone, newPassword, resetToken }),
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
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30">
                                <Factory className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">IND Manager</h1>
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
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-600 rounded-lg">
                                    <Factory className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">IND Manager</span>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        {step !== "success" && (
                            <div className="flex items-center justify-center gap-2 mb-8">
                                {steps.map((s, i) => (
                                    <div key={s.key} className="flex items-center gap-2">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${i <= currentStepIndex
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
                                            className={`text-xs font-medium hidden sm:inline ${i <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                                                }`}
                                        >
                                            {s.label}
                                        </span>
                                        {i < steps.length - 1 && (
                                            <div
                                                className={`w-8 h-0.5 rounded-full ${i < currentStepIndex ? "bg-indigo-600" : "bg-border"
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
                                        <div className="space-y-2">
                                            <Label htmlFor="reset-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Registered Phone Number
                                            </Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="reset-phone"
                                                    type="tel"
                                                    placeholder="+91XXXXXXXXXX"
                                                    value={phone}
                                                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                                                    required
                                                    className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pl-10"
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                This should be the phone number associated with your account.
                                            </p>
                                        </div>

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
                                            Enter the 6-digit code sent to <span className="font-semibold text-foreground">{phone}</span>
                                        </p>
                                    </div>

                                    <div className="space-y-6">
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
                                        {/* New Password */}
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                New Password
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="new-password"
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                    className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                                                >
                                                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {/* Password Strength */}
                                            {newPassword && (
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${passwordStrength.score}%` }}
                                                                className={`h-full rounded-full transition-colors ${passwordStrength.color}`}
                                                            />
                                                        </div>
                                                        <span
                                                            className={`text-xs font-semibold ${passwordStrength.score < 30
                                                                    ? "text-red-500"
                                                                    : passwordStrength.score < 55
                                                                        ? "text-amber-500"
                                                                        : passwordStrength.score < 80
                                                                            ? "text-blue-500"
                                                                            : "text-emerald-500"
                                                                }`}
                                                        >
                                                            {passwordStrength.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                        <span className={`text-[10px] flex items-center gap-1 ${newPassword.length >= 8 ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                            {newPassword.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} 8+ chars
                                                        </span>
                                                        <span className={`text-[10px] flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                            {/[A-Z]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Uppercase
                                                        </span>
                                                        <span className={`text-[10px] flex items-center gap-1 ${/[a-z]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                            {/[a-z]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Lowercase
                                                        </span>
                                                        <span className={`text-[10px] flex items-center gap-1 ${/[0-9]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                            {/[0-9]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Number
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Confirm Password
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirm-password"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p className="text-[10px] text-red-400 flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" /> Passwords do not match
                                                </p>
                                            )}
                                            {confirmPassword && newPassword === confirmPassword && (
                                                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Passwords match
                                                </p>
                                            )}
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group"
                                            disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
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
                                            Your password has been successfully updated. All existing sessions have been logged out for security.
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
