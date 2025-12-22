"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Factory, ShieldCheck, Zap, Activity, ArrowRight, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if session exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Verification email sent!");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

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
              Precision Logistics <br />
              <span className="text-accent">Simplified Production</span>
            </h2>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
              The all-in-one OS for modern manufacturing. Manage orders, inventory, and clients with millisecond precision.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: ShieldCheck, label: "Enterprise Security" },
                { icon: Zap, label: "Real-time Sync" },
                { icon: Activity, label: "Visual Analytics" },
                { icon: Factory, label: "Multi-Plant Setup" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm font-medium text-zinc-300 bg-white/5 p-4 rounded-xl border border-white/10"
                >
                  <item.icon className="h-4 w-4 text-accent" />
                  {item.label}
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
                  ? "Access your dashboard to manage factory operations." 
                  : "Join the next generation of manufacturing management."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email Address</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@factory.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-zinc-800 text-white focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 group-hover:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</Label>
                  <button type="button" className="text-xs text-accent hover:underline font-medium">Forgot password?</button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-zinc-800 text-white focus:ring-accent focus:border-accent rounded-xl transition-all pl-4 group-hover:border-zinc-700"
                />
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
                    <span>{isLogin ? "Sign Into Dashboard" : "Register Admin"}</span>
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
                <span className="bg-zinc-950 px-3 text-zinc-500 font-medium">Alternative access</span>
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
            &copy; 2024 IND Industrial Systems &bull; All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
