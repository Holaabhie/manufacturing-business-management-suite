"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";

interface LandingPricingProps {
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySavings: string;
  proFeatures: string[];
}

const STARTER_FEATURES = [
  "Up to 5 orders",
  "Up to 5 inventory items",
  "Up to 5 clients",
  "Order & production tracking",
  "Payment recording",
  "Multi-language UI",
] as const;

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
};

export function LandingPricing({
  monthlyPrice,
  yearlyPrice,
  yearlySavings,
  proFeatures,
}: LandingPricingProps) {
  return (
    <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="text-center space-y-4 mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Predictable Investment
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Start free, upgrade when you&apos;re ready. No hidden fees, no per-user charges.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
          {/* Starter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-shadow duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Starter</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">Free</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Perfect for getting started — up to 5 orders, 5 inventory items, and 5 clients.
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors duration-200"
              >
                Get Started Free
              </Link>

              {/* Staggered checkmark reveal on scroll into view */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-3 pt-4"
              >
                {STARTER_FEATURES.map((f) => (
                  <motion.li
                    key={f}
                    variants={itemVariants}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>

          {/* Pro Card (with animated glow/shimmer border) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
            animate={{
              boxShadow: [
                "0 0 0 2px rgba(37,99,235,0.4), 0 4px 20px rgba(37,99,235,0.08)",
                "0 0 0 2px rgba(37,99,235,0.8), 0 8px 32px rgba(37,99,235,0.22)",
                "0 0 0 2px rgba(37,99,235,0.4), 0 4px 20px rgba(37,99,235,0.08)",
              ],
            }}
            transition={{
              boxShadow: {
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              },
              duration: 0.45,
              ease: "easeOut",
            }}
            className="relative p-6 sm:p-8 rounded-2xl border-2 border-primary bg-card transition-shadow duration-200 flex flex-col justify-between"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm">
              Most Popular
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Pro</h3>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{monthlyPrice}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-primary font-medium mt-1">
                  or {yearlyPrice}/year — save {yearlySavings}
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlimited everything. Full power for growing manufacturers.
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] active:scale-[0.98] duration-200"
              >
                Upgrade to Pro
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Staggered checkmark reveal on scroll into view */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-3 pt-4"
              >
                {proFeatures
                  .filter((f) => f !== "2 months free")
                  .map((f) => (
                    <motion.li
                      key={f}
                      variants={itemVariants}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </motion.li>
                  ))}
                <motion.li
                  variants={itemVariants}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Unlimited orders, inventory &amp; clients</span>
                </motion.li>
              </motion.ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
