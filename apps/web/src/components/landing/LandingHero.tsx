"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Check,
  Play,
  TrendingUp,
  Package,
  FileText,
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Users,
  BarChart3,
  CreditCard,
  Settings,
} from "lucide-react";

const HERO_CHECKS = [
  "Track Orders",
  "Manage Inventory",
  "Handle Payments",
  "Grow Faster",
] as const;

const MOCKUP_SIDEBAR = [
  { name: "Dashboard", icon: LayoutDashboard, active: true },
  { name: "Orders", icon: ShoppingCart, active: false },
  { name: "Production", icon: Layers, active: false },
  { name: "Inventory", icon: Package, active: false },
  { name: "Clients", icon: Users, active: false },
  { name: "Analytics", icon: BarChart3, active: false },
  { name: "Payments", icon: CreditCard, active: false },
  { name: "Settings", icon: Settings, active: false },
] as const;

const MOCKUP_STATS = [
  { label: "Total Orders", value: "1,248", change: "+12% this month" },
  { label: "Total Revenue", value: "₹8,64,000", change: "+8% this month" },
  { label: "Inventory Value", value: "₹3,20,000", change: "In stock" },
  { label: "Pending Payments", value: "₹1,12,500", change: "4 invoices due" },
] as const;

const MOCKUP_ORDERS = [
  {
    id: "ORD-1048",
    product: "Steel Brackets × 500",
    status: "Delivered",
    statusBg: "rgba(22,163,74,0.1)",
    statusColor: "#16A34A",
  },
  {
    id: "ORD-1047",
    product: "Copper Pipes × 200",
    status: "Processing",
    statusBg: "rgba(37,99,235,0.1)",
    statusColor: "#2563EB",
  },
  {
    id: "ORD-1046",
    product: "Rubber Gaskets × 1000",
    status: "Shipped",
    statusBg: "rgba(245,158,11,0.1)",
    statusColor: "#D97706",
  },
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

export function LandingHero() {
  return (
    <section
      id="home"
      className="relative pt-4 sm:pt-6 lg:pt-8 pb-10 sm:pb-16 px-4 sm:px-6"
    >
      {/* Glow background */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 dark:bg-blue-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* ── Left copy column (staggered entrance) ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 sm:space-y-5 lg:space-y-6 text-center lg:text-left"
          >
            {/* 1. Badge pill */}
            <motion.div variants={itemVariants} className="inline-block">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-xs sm:text-sm font-medium text-muted-foreground shadow-sm">
                <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                Built for Indian manufacturers
              </div>
            </motion.div>

            {/* 2. H1: Line by line */}
            <motion.h1
              variants={itemVariants}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <motion.span variants={itemVariants} className="block">
                Your entire factory,
              </motion.span>
              <motion.span
                variants={itemVariants}
                className="block text-primary"
              >
                one app.
              </motion.span>
            </motion.h1>

            {/* 3. Body paragraph */}
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0"
            >
              Stop running your manufacturing business on paper registers,
              WhatsApp groups, and scattered Excel sheets. IND Manager
              brings your orders, inventory, production, payments, and
              clients into a single platform — purpose-built for Indian
              SME manufacturers.
            </motion.p>

            {/* 4. 4-item checklist row */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-2.5 max-w-sm mx-auto lg:mx-0"
            >
              {HERO_CHECKS.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* 5. CTA row */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:scale-[0.98] duration-200"
              >
                Start Free Trial
                <ArrowRight className="h-4 sm:h-5 w-4 sm:w-5" />
              </Link>
              {/* Watch Demo — scrolls to video placeholder */}
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium text-foreground bg-card border border-border hover:bg-muted/50 transition-all duration-200 shadow-sm"
              >
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Play
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary ml-0.5"
                    fill="currentColor"
                  />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-bold text-xs sm:text-sm">Watch Demo</span>
                  <span className="text-[11px] text-muted-foreground">See how it works</span>
                </span>
              </a>
            </motion.div>
          </motion.div>

          {/* ── Right: Interactive Dashboard mockup with tilt & floating cards ── */}
          <div className="relative flex items-center justify-center lg:justify-end mt-4 lg:mt-0">
            <InteractiveMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function InteractiveMockup() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle pointer-based 3D tilt (max 4.5deg)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 140, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 140, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only apply tilt on fine pointer (mouse / trackpad)
    if (e.pointerType === "touch") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full max-w-[560px] py-4"
      style={{ perspective: 1000 }}
    >
      {/* ── Floating stat card 1: Top right ("More Sales / More Growth") ── */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-1 -right-2 sm:-top-3 sm:-right-4 z-20 flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-card border border-border shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm pointer-events-none select-none"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground">More Sales</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">More Growth</p>
        </div>
      </motion.div>

      {/* ── Floating stat card 2: Middle right ("Automated Invoicing") ── */}
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
        className="absolute top-1/2 -right-2 sm:-right-4 -translate-y-1/2 z-20 flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-card border border-border shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm pointer-events-none select-none"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-600/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground">Automated</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Invoicing</p>
        </div>
      </motion.div>

      {/* ── Floating stat card 3: Bottom left ("Real-time Inventory Tracking") ── */}
      <motion.div
        animate={{ y: [0, -3.5, 0] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8,
        }}
        className="absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-4 z-20 flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-card border border-border shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm pointer-events-none select-none"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground">Real-time</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Inventory Tracking</p>
        </div>
      </motion.div>

      {/* ── Main browser-style panel with tilt ── */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="relative rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        {/* Browser chrome bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="ml-4 flex-1 h-5 rounded-md bg-muted/60 flex items-center px-2">
            <span className="text-[9px] text-muted-foreground font-mono">
              app.indmanager.in/dashboard
            </span>
          </div>
        </div>

        {/* App layout */}
        <div className="flex h-[340px] sm:h-[380px]">
          {/* Sidebar */}
          <div className="w-[110px] sm:w-[120px] flex-shrink-0 border-r border-border bg-muted/20 flex flex-col py-3 px-2 gap-0.5">
            <div className="px-2 mb-2">
              <BrandLogo
                variant="icon"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </div>
            {MOCKUP_SIDEBAR.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`h-3 w-3 flex-shrink-0 ${
                    item.active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {/* Dashboard header */}
            <div className="px-3.5 py-2.5 border-b border-border bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-foreground">Dashboard</p>
                  <p className="text-[9px] text-muted-foreground">Good Morning, Admin</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-primary">A</span>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5">
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-2 p-2.5">
              {MOCKUP_STATS.map((s) => (
                <div
                  key={s.label}
                  className="p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <p className="text-[8px] text-muted-foreground mb-0.5">{s.label}</p>
                  <p className="text-[12px] sm:text-[13px] font-bold text-foreground">
                    {s.value}
                  </p>
                  <p className="text-[8px] text-green-500 font-medium">{s.change}</p>
                </div>
              ))}
            </div>

            {/* Sales overview mini-chart */}
            <div className="mx-2.5 mb-2.5 p-2 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-[9px] font-bold text-foreground">Sales Overview</p>
                  <p className="text-[8px] text-muted-foreground">Last 6 Months</p>
                </div>
              </div>
              {/* Static SVG chart curve */}
              <svg viewBox="0 0 200 50" className="w-full h-7 sm:h-8" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(37,99,235)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(37,99,235)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,40 C20,38 30,28 50,25 C70,22 80,32 100,20 C120,8 130,18 150,12 C170,6 180,15 200,8"
                  fill="none"
                  stroke="rgb(37,99,235)"
                  strokeWidth="1.5"
                />
                <path
                  d="M0,40 C20,38 30,28 50,25 C70,22 80,32 100,20 C120,8 130,18 150,12 C170,6 180,15 200,8 L200,50 L0,50Z"
                  fill="url(#chartGrad)"
                />
              </svg>
            </div>

            {/* Recent orders */}
            <div className="mx-2.5 mb-2.5 p-2 rounded-lg bg-muted/30 border border-border/50 flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold text-foreground">Recent Orders</p>
                <span className="text-[8px] text-primary font-medium">View all →</span>
              </div>
              <div className="space-y-1">
                {MOCKUP_ORDERS.map((o) => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-foreground truncate">{o.id}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{o.product}</p>
                    </div>
                    <span
                      className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: o.statusBg, color: o.statusColor }}
                    >
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
