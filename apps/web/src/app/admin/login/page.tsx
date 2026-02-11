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
    Shield,
    AlertTriangle,
    Key,
    Loader2,
    Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [masterKey, setMasterKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showMasterKey, setShowMasterKey] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
    const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    masterKey: masterKey || undefined,
                    loginType: "admin",
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (json.locked) {
                setLockedMinutes(json.remainingMinutes || 15);
                toast.error(json.error || "Account temporarily locked");
                return;
            }

            if (!res.ok) {
                if (json.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(json.attemptsRemaining);
                }
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

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Left Panel - Admin Branding */}
            <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-r border-border">
                {/* Animated Background Elements */}
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
                            Administration <br />
                            <span className="text-indigo-400">Control Center</span>
                        </h2>
                        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                            Full access to organization management, team oversight, financial controls, and system configuration.
                        </p>

                        {/* Security indicators */}
                        <div className="space-y-4">
                            {[
                                { icon: Shield, label: "Organization Master Key Verification", desc: "Multi-factor admin authentication" },
                                { icon: Lock, label: "Restricted Management Portal", desc: "Admin-only access with audit logging" },
                                { icon: AlertTriangle, label: "Failed Attempt Protection", desc: "Auto-lockout after 5 failed attempts" },
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

            {/* Right Panel - Admin Login Form */}
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
                                <div className="p-2 bg-indigo-600 rounded-lg">
                                    <Factory className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">IND Manager</span>
                            </div>
                        </div>

                        {/* Warning Banner */}
                        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-6">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-400">Restricted Management Portal</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    This login is for organization administrators only. Staff members should use the{" "}
                                    <a href="/staff/login" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
                                        Staff Portal
                                    </a>.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <h3 className="text-3xl font-bold tracking-tight">Admin Sign In</h3>
                            <p className="text-muted-foreground text-sm">
                                Authenticate to access organization management controls.
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
                                </p>
                            </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Admin Email
                                </Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    placeholder="admin@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="admin-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Password
                                    </Label>
                                    <a href="/forgot-password" className="text-xs text-indigo-400 hover:underline">Forgot password?</a>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="admin-password"
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

                            {/* Organization Master Key (Optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="admin-master-key" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Key className="h-3 w-3" />
                                    Organization Master Key
                                    <span className="text-muted-foreground/50 normal-case font-normal">(if configured)</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="admin-master-key"
                                        type={showMasterKey ? "text" : "password"}
                                        placeholder="Enter master key..."
                                        value={masterKey}
                                        onChange={(e) => setMasterKey(e.target.value)}
                                        className="h-12 bg-muted/50 dark:bg-white/5 border-border rounded-xl pr-12 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowMasterKey(!showMasterKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                                    >
                                        {showMasterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 group"
                                disabled={loading || !!lockedMinutes}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        <span>Sign In as Admin</span>
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </form>

                        {/* Switch to Staff */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                Not an administrator?{" "}
                                <a href="/staff/login" className="text-indigo-400 font-bold underline underline-offset-4 hover:text-indigo-300">
                                    Staff Login Portal
                                </a>
                            </p>
                        </div>

                        {/* Register New Organization */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                Setting up a new organization?{" "}
                                <a href="/login" className="text-indigo-400 font-bold underline underline-offset-4 hover:text-indigo-300">
                                    Register here
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
