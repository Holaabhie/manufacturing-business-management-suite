"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Factory,
    Lock,
    Phone,
    User,
    FileText,
    Check,
    ChevronRight,
    Eye,
    EyeOff,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type SetupStep = 1 | 2 | 3 | 4;

const STEPS = [
    { step: 1 as const, label: "Change Password", icon: Lock },
    { step: 2 as const, label: "Configure OTP", icon: Phone },
    { step: 3 as const, label: "Complete Profile", icon: User },
    { step: 4 as const, label: "Accept Terms", icon: FileText },
];

export default function StaffSetupPage() {
    const [currentStep, setCurrentStep] = useState<SetupStep>(1);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Step 1: Password Change
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Step 2: OTP Setup
    const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");

    // Step 3: Profile
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    // Step 4: Terms
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleStep1 = async () => {
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            // API call to change password
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error || "Failed to change password");
            }
            toast.success("Password changed successfully!");
            setCurrentStep(2);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStep2 = async () => {
        setLoading(true);
        try {
            // API call to configure OTP
            toast.success("OTP method configured!");
            setCurrentStep(3);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStep3 = async () => {
        if (!fullName.trim()) {
            toast.error("Please enter your full name");
            return;
        }
        setLoading(true);
        try {
            // API call to update profile
            toast.success("Profile updated!");
            setCurrentStep(4);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStep4 = async () => {
        if (!termsAccepted) {
            toast.error("Please accept the terms of use");
            return;
        }
        setLoading(true);
        try {
            // API call to complete setup
            const res = await fetch("/api/auth/complete-setup", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ termsAccepted: true }),
            });
            toast.success("Setup complete! Welcome to IND Manager.");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    };

    const strength = passwordStrength(newPassword);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-600 rounded-lg">
                            <Factory className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">IND Manager</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Complete Your Account Setup</h1>
                    <p className="text-muted-foreground text-sm">
                        Step {currentStep} of 4 — {STEPS[currentStep - 1].label}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((s) => (
                        <div key={s.step} className="flex-1 flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                                    currentStep > s.step
                                        ? "bg-emerald-600 text-white"
                                        : currentStep === s.step
                                            ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20"
                                            : "bg-muted text-muted-foreground"
                                )}
                            >
                                {currentStep > s.step ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    s.step
                                )}
                            </div>
                            {s.step < 4 && (
                                <div
                                    className={cn(
                                        "flex-1 h-1 rounded-full transition-colors",
                                        currentStep > s.step ? "bg-emerald-600" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="rounded-xl border bg-card p-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Change Password */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <Lock className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Change Your Password</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Replace the temporary password with a secure one
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimum 8 characters"
                                            className="h-12 rounded-xl pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {/* Password Strength */}
                                    {newPassword && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex gap-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "h-1.5 rounded-full flex-1 transition-colors",
                                                            strength >= i
                                                                ? strength <= 1 ? "bg-red-500"
                                                                    : strength <= 2 ? "bg-amber-500"
                                                                        : strength <= 3 ? "bg-emerald-500"
                                                                            : "bg-emerald-600"
                                                                : "bg-muted"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {strength <= 1 ? "Weak" : strength <= 2 ? "Fair" : strength <= 3 ? "Good" : "Strong"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Confirm Password
                                    </Label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                        className="h-12 rounded-xl"
                                    />
                                </div>

                                <Button
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    onClick={handleStep1}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Continue
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 2: Configure OTP */}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <Phone className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Configure OTP Verification</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Choose how you want to receive verification codes
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { value: "email" as const, label: "Email OTP", desc: "Receive codes via email" },
                                        { value: "sms" as const, label: "SMS OTP", desc: "Receive codes via text message" },
                                    ].map((option) => (
                                        <label
                                            key={option.value}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                                                otpMethod === option.value
                                                    ? "border-emerald-500/50 bg-emerald-500/10"
                                                    : "border-border hover:border-border/80"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="otp-method"
                                                value={option.value}
                                                checked={otpMethod === option.value}
                                                onChange={() => setOtpMethod(option.value)}
                                                className="sr-only"
                                            />
                                            <div
                                                className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                    otpMethod === option.value ? "border-emerald-500" : "border-muted-foreground/30"
                                                )}
                                            >
                                                {otpMethod === option.value && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{option.label}</p>
                                                <p className="text-xs text-muted-foreground">{option.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <Button
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    onClick={handleStep2}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Continue
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 3: Complete Profile */}
                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                                        <User className="h-5 w-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Complete Your Profile</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Confirm your contact details
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Full Name
                                    </Label>
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="h-12 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Phone Number
                                    </Label>
                                    <Input
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+91XXXXXXXXXX"
                                        className="h-12 rounded-xl"
                                    />
                                </div>

                                <Button
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    onClick={handleStep3}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Continue
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 4: Accept Terms */}
                        {currentStep === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                                        <FileText className="h-5 w-5 text-pink-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Accept Terms of Use</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Review and accept the company usage policies
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border bg-muted/50 p-4 max-h-48 overflow-y-auto text-sm text-muted-foreground space-y-3">
                                    <p>By accessing IND Manager, you agree to the following terms:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>All actions performed are recorded in the audit trail</li>
                                        <li>Data accessed is confidential and belongs to your organization</li>
                                        <li>Sharing credentials is strictly prohibited</li>
                                        <li>Unauthorized data exports may result in account suspension</li>
                                        <li>Your administrator can view your activity log</li>
                                        <li>You must report any security concerns immediately</li>
                                    </ul>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-border bg-muted/50 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm">
                                        I have read and agree to the company usage policies and
                                        acknowledge that my activities will be tracked.
                                    </span>
                                </label>

                                <Button
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    onClick={handleStep4}
                                    disabled={loading || !termsAccepted}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Complete Setup & Enter Dashboard
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
