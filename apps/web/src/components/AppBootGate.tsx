"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Factory, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const INTRO_SEEN_KEY = "indmanager_intro_seen";
const MIN_BOOT_DURATION_MS = 1200;
const FADE_DURATION_MS = 250;

type BootStage = "loading" | "intro" | "ready";

export function AppBootGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<BootStage>("loading");
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Lock scroll during boot / intro overlay
    if (stage !== "ready") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [stage]);

  useEffect(() => {
    // Stage 1 initialization & timer
    let introSeen = false;
    try {
      introSeen = localStorage.getItem(INTRO_SEEN_KEY) === "true";
    } catch {
      introSeen = false;
    }

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const holdSplash = searchParams?.get("hold_splash") === "true";
    if (holdSplash) {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, MIN_BOOT_DURATION_MS - elapsed);

    const timer = setTimeout(() => {
      // Start 250ms fade out of Stage 1
      setIsExiting(true);

      const fadeTimer = setTimeout(() => {
        if (introSeen) {
          setStage("ready");
        } else {
          setStage("intro");
          setIsExiting(false);
        }
      }, FADE_DURATION_MS);

      return () => clearTimeout(fadeTimer);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch (e) {
      console.warn("Failed to persist intro seen flag:", e);
    }

    // Fade out Stage 2 over 250ms ease
    setIsExiting(true);
    setTimeout(() => {
      setStage("ready");
    }, FADE_DURATION_MS);
  };

  if (stage === "ready") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Route content mounted in background so auth and routing checks resolve in parallel */}
      <div className="w-full h-full min-w-0" aria-hidden="true">
        {children}
      </div>

      {/* Boot sequence full-screen overlay */}
      <AnimatePresence>
        {stage === "loading" && (
          <motion.div
            key="stage-loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 select-none"
          >
            {/* Logo and Wordmark */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: "var(--primary)",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.28)",
                  }}
                >
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold tracking-tight leading-tight">
                    IND Manager
                  </span>
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Enterprise Suite
                  </span>
                </div>
              </div>

              {/* Indeterminate loading bar (140px x 2.5px track, clipped with overflow-hidden) */}
              <div className="relative w-[140px] h-[2.5px] rounded-full overflow-hidden bg-foreground/10 mt-2">
                <motion.div
                  className="absolute top-0 bottom-0 w-[45px] rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                  initial={{ x: -45 }}
                  animate={{ x: [-45, 140] }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {stage === "intro" && (
          <motion.div
            key="stage-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 overflow-y-auto"
          >
            <div className="w-full max-w-md flex flex-col items-center text-center my-auto py-8">
              {/* Logo icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mb-5"
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
                }}
              >
                <Factory className="h-7 w-7 text-white" />
              </div>

              {/* App Badge */}
              <span className="text-xs font-semibold tracking-wider text-primary uppercase bg-primary/10 px-3 py-1 rounded-full mb-4">
                Manufacturing Management Suite
              </span>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Precision Control for Your Manufacturing Operations
              </h1>

              {/* Verified accurate one-line description */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 max-w-sm">
                Production tracking, inventory management, and real-time operational analytics built for Indian industry.
              </p>

              {/* Verified core capabilities */}
              <div className="w-full space-y-2.5 mb-8 text-left max-w-sm">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Production tracking & job status workflow
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Raw materials & real-time inventory levels
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Client billing, GST invoicing & financial logs
                  </span>
                </div>
              </div>

              {/* Primary Get Started Button */}
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="w-full max-w-sm h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 cursor-pointer transition-transform active:scale-[0.98]"
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
