"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  Cloud
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Auth redirects are handled by middleware (session cookie).
  }, [router]);

  // Validate email or username format
  const isValidEmailOrUsername = (value: string): boolean => {
    // Email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Username pattern: 3-30 characters, alphanumeric with underscores/hyphens
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

  // Feature items for the left panel
  const features = [
    {
      icon: Brain,
      label: "AI-Powered Business Assistant",
      description: "Smart insights and automation",
      gradient: "from-purple-500/20 to-indigo-500/20"
    },
    {
      icon: FileText,
      label: "Intelligent Invoice Generator",
      description: "Auto-create and manage bills",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: BarChart3,
      label: "Real-time Data Analytics",
      description: "Track performance metrics live",
      gradient: "from-emerald-500/20 to-teal-500/20"
    },
    {
      icon: Cloud,
      label: "Cloud-Based Management",
      description: "Access anywhere, anytime",
      gradient: "from-orange-500/20 to-amber-500/20"
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      {/* Left Panel - Visuals (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black border-r border-zinc-800/50">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
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
              <div className="p-3 bg-accent rounded-2xl shadow-lg shadow-accent/20">
                <Factory className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">IND Manager</h1>
            </div>
            <h2 className="text-5xl font-bold leading-tight mb-6">
              Intelligent Business <br />
              <span className="text-accent">Management Suite</span>
            </h2>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
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
                  className={`flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-gradient-to-r ${item.gradient} backdrop-blur-sm hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-default`}
                >
                  <div className="p-2 bg-white/10 rounded-lg shrink-0">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-100">{item.label}</h4>
                    <p className="text-sm text-zinc-400">{item.description}</p>
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
                  <Factory className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">IND Manager</span>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-3xl font-bold tracking-tight">
                {isLogin ? "Sign In" : "Create Account"}
              </h3>
              <p className="text-zinc-500 text-sm">
                {isLogin
                  ? "Access your dashboard to manage business operations."
                  : "Join the next generation of intelligent management."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email or Username</Label>
                <div className="relative group">
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="admin@company.com or username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-zinc-800 text-white focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 pr-4 group-hover:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</Label>
                  <button type="button" className="text-xs text-accent hover:underline font-medium">Forgot password?</button>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-zinc-800 text-white focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 pr-12 group-hover:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-md"
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
                  className="w-4 h-4 rounded border-zinc-700 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-zinc-400 cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-accent/20 group"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-3 text-zinc-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="w-full h-11 flex items-center justify-center gap-2 border border-zinc-800 rounded-xl bg-white/5 text-zinc-400 cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Coming Soon
                </div>
              </div>
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="w-full h-11 flex items-center justify-center gap-2 border border-zinc-800 rounded-xl bg-white/5 text-zinc-400 cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Microsoft</span>
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Coming Soon
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-center text-zinc-400 hover:text-white transition-colors py-2"
              >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className="text-accent font-bold underline underline-offset-4">
                  {isLogin ? "Sign up free" : "Sign in here"}
                </span>
              </button>
            </div>
          </motion.div>

          <p className="text-center text-[10px] text-zinc-600 mt-12 uppercase tracking-[0.2em]">
            &copy; 2026 Industry Managing System &bull; All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
