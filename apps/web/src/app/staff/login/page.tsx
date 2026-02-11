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
    Users,
    AlertTriangle,
    BadgeCheck,
    Loader2,
    Lock,
    Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type LoginStep = "credentials" | "otp";

export default function StaffLoginPage() {
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
    const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);
    const router = useRouter();

    // OTP states
    const [step, setStep] = useState<LoginStep>("credentials");
    const [userId, setUserId] = useState("");
    const [otp, setOtp] = useState("");
    const [otpDeliveryMethod, setOtpDeliveryMethod] = useState("email");
    const [countdown, setCountdown] = useState(0);
    const [resendCount, setResendCount] = useState(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeId || !password) {
            toast.error("Please enter your Employee ID and password");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    employeeId,
                    password,
                    loginType: "staff",
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (json.locked) {
                setLockedMinutes(json.remainingMinutes || 30);
                toast.error(json.error || "Account temporarily locked");
                return;
            }

            if (!res.ok) {
                if (json.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(json.attemptsRemaining);
                }
                throw new Error(json?.error || "Login failed");
            }

            // Check if OTP is required
            if (json.otpRequired) {
                setUserId(json.userId);
                setOtpDeliveryMethod(json.otpDeliveryMethod || "email");
                setStep("otp");

                // Auto-send OTP
                await sendOtp(json.userId);
                return;
            }

            // Check first-time login
            if (json.firstLoginCompleted === false) {
                toast.success("Welcome! Please complete your account setup.");
                router.push("/staff/setup");
                return;
            }

            setAttemptsRemaining(null);
            setLockedMinutes(null);
            toast.success("Welcome back!");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const sendOtp = async (uid?: string) => {
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    userId: uid || userId,
                    purpose: "login",
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Failed to send OTP");

            setCountdown(30);
            setResendCount((prev) => prev + 1);
            toast.success(`OTP sent via ${otpDeliveryMethod}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to send OTP");
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    userId,
                    otp,
                    purpose: "login",
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Invalid OTP");

            toast.success("Verification successful!");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Left Panel - Staff Branding */}
            <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 border-r border-border">
                <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600 rounded-full blur-[120px] animate-pulse delay-1000" />
                </div>

                <div className="relative z-10 px-12 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/30">
                                <Factory className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">IND Manager</h1>
                        </div>
                        <h2 className="text-5xl font-bold leading-tight mb-6 text-white">
                            Welcome, <br />
                            <span className="text-emerald-400">Team Member</span>
                        </h2>
                        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                            Access your operational dashboard to manage orders, production, inventory, and more.
                        </p>

                        <div className="space-y-4">
                            {[
                                { icon: BadgeCheck, label: "Employee ID Authentication", desc: "Secure credential-based access" },
                                { icon: Phone, label: "OTP Verification", desc: "Two-factor authentication for security" },
                                { icon: Users, label: "Role-Based Access", desc: "Permissions tailored to your role" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.15 }}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm"
                                >
                                    <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                                        <item.icon className="h-5 w-5 text-emerald-400" />
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

            {/* Right Panel - Staff Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-[420px] space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-600 rounded-lg">
                                    <Factory className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">IND Manager</span>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === "credentials" ? (
                                <motion.div
                                    key="credentials"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="space-y-2 mb-8">
                                        <h3 className="text-3xl font-bold tracking-tight">Staff Sign In</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Enter your employee credentials to access the operational dashboard.
                                        </p>
                                    </div>

                                    {/* Lockout Warning */}
                                    {lockedMinutes && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 mb-6"
                                        >
                                            <div className="flex items-center gap-2 text-red-400">
                                                <Lock className="h-4 w-4" />
                                                <p className="text-sm font-semibold">Account Temporarily Locked</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Too many failed attempts. Try again in {lockedMinutes} minute(s).
                                                Contact your administrator if you need immediate access.
                                            </p>
                                        </motion.div>
                                    )}

                                    <form onSubmit={handleCredentialSubmit} className="space-y-5">
                                        {/* Employee ID */}
                                        <div className="space-y-2">
                                            <Label htmlFor="staff-employee-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Employee ID
                                            </Label>
                                            <Input
                                                id="staff-employee-id"
                                                type="text"
                                                placeholder="EMP-001 or your employee ID"
                                                value={employeeId}
                                                onChange={(e) => setEmployeeId(e.target.value)}
                                                required
                                                className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl font-mono uppercase"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="staff-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Password
                                                </Label>
                                                <a href="/forgot-password" className="text-xs text-emerald-400 hover:underline">Forgot password?</a>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    id="staff-password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                                                >
                                                    <AnimatePresence mode="wait" initial={false}>
                                                        <motion.div
                                                            key={showPassword ? "eye-off" : "eye"}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.15 }}
                                                        >
                                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Attempts Warning */}
                                        {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-amber-400 flex items-center gap-1.5"
                                            >
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {attemptsRemaining} attempt(s) remaining before account lockout
                                            </motion.p>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 group"
                                            disabled={loading || !!lockedMinutes}
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Verifying...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <BadgeCheck className="h-4 w-4" />
                                                    <span>Sign In</span>
                                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            )}
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                /* OTP Step */
                                <motion.div
                                    key="otp"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="space-y-2 mb-8">
                                        <h3 className="text-3xl font-bold tracking-tight">Verify Identity</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Enter the 6-digit OTP sent to your registered {otpDeliveryMethod}.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* OTP Input */}
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

                                        {/* OTP Timer */}
                                        <div className="text-center">
                                            {countdown > 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Resend OTP in <span className="font-bold text-foreground">{countdown}s</span>
                                                </p>
                                            ) : resendCount < 3 ? (
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    className="p-0 h-auto text-emerald-400 hover:text-emerald-300"
                                                    onClick={() => sendOtp()}
                                                    disabled={loading}
                                                >
                                                    Resend OTP ({3 - resendCount} remaining)
                                                </Button>
                                            ) : (
                                                <p className="text-sm text-red-400">
                                                    Maximum resend attempts reached. Contact your administrator.
                                                </p>
                                            )}
                                        </div>

                                        {/* Verify Button */}
                                        <Button
                                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                                            onClick={handleVerifyOtp}
                                            disabled={loading || otp.length !== 6}
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Verifying...</span>
                                                </div>
                                            ) : (
                                                "Verify & Sign In"
                                            )}
                                        </Button>

                                        {/* Back to credentials */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full"
                                            onClick={() => {
                                                setStep("credentials");
                                                setOtp("");
                                                setResendCount(0);
                                            }}
                                        >
                                            ← Back to credentials
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Switch to Admin */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                Administrator?{" "}
                                <a href="/admin/login" className="text-emerald-400 font-bold underline underline-offset-4 hover:text-emerald-300">
                                    Admin Login Portal
                                </a>
                            </p>
                        </div>
                    </motion.div>

                    <p className="text-center text-[10px] text-muted-foreground/60 mt-12 uppercase tracking-[0.2em]">
                        &copy; 2026 Industry Managing System &bull; All Rights Reserved
                    </p>
                </div>
            </div>
        </div>
    );
}
