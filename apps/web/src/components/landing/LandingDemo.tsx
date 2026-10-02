"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Sparkles, Volume2, Maximize2 } from "lucide-react";

export function LandingDemo() {
  return (
    <section
      id="demo"
      className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 dark:bg-card/30"
    >
      <div className="mx-auto max-w-4xl text-center space-y-6 sm:space-y-8">
        {/* Section Header with smooth whileInView */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Product Walkthrough
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            See it in action
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Watch how IND Manager replaces paper registers, Excel sheets, and
            scattered WhatsApp conversations with one unified manufacturing suite.
          </p>
        </motion.div>

        {/* Polished Video Player Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="relative mx-auto w-full max-w-3xl rounded-2xl overflow-hidden border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] group cursor-pointer"
        >
          {/* Subtle blueprint grid & gradient backdrop */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/5"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />

          {/* Aspect container */}
          <div className="relative aspect-video flex flex-col items-center justify-center p-6 select-none">
            {/* Ambient center glow */}
            <div className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            {/* Central icon & pulsing play button */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-md opacity-80 transition-transform duration-300 group-hover:scale-105 border border-border/50 bg-background/80 backdrop-blur-sm p-1.5">
                <Image
                  src="/icons/icon-512.png"
                  alt="IND Manager"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              {/* Pulsing play button (soft box-shadow pulse, 2s loop) */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(37,99,235,0.45)",
                    "0 0 0 16px rgba(37,99,235,0)",
                    "0 0 0 0 rgba(37,99,235,0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_8px_30px_rgba(37,99,235,0.4)] transition-all duration-300 group-hover:bg-primary/95"
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground ml-1" fill="currentColor" />
              </motion.div>

              <div className="text-center space-y-1">
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  Product demo — coming soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Official walkthrough video is being recorded
                </p>
              </div>
            </div>

            {/* Bottom mock video player scrubber bar */}
            <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-background/90 via-background/40 to-transparent flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[11px] sm:text-xs text-foreground/80">0:00 / 2:30</span>
              </div>
              {/* Progress bar track */}
              <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden max-w-md mx-2">
                <div className="h-full w-1/4 bg-primary/60 rounded-full" />
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-foreground/70">
                <Volume2 className="h-3.5 w-3.5" />
                <Maximize2 className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
