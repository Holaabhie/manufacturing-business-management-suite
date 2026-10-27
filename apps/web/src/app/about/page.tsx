import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { DocsNavbar } from "@/components/modules/DocsNavbar";
import { Footer } from "@/components/landing/Footer";
import { COMPANY, isFilled } from "@/content/company";
import {
  Factory,
  Globe2,
  FileCheck2,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Instagram,
  Sparkles,
  Cpu,
  Truck,
  FileSpreadsheet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | IND Manager",
  description:
    "Learn how IND Manager is purpose-built to streamline operations, GST invoicing, and production workflows for Indian manufacturing SMBs.",
  alternates: {
    canonical: "/about",
  },
};

const FEATURED_MODULES = [
  {
    title: "Order Management",
    desc: "From quote generation to dispatch tracking with automated customer balance logs.",
    icon: FileCheck2,
  },
  {
    title: "Production Tracking",
    desc: "Multi-stage job routing, machine status monitoring, and scrap calculation.",
    icon: Factory,
  },
  {
    title: "Raw Material Inventory",
    desc: "Real-time stock ledger, batch deduction, and low-stock threshold alerts.",
    icon: Layers,
  },
  {
    title: "GST Invoicing & Challans",
    desc: "Compliant GST tax break-ups, delivery challans, and instant Tally Prime XML export.",
    icon: FileSpreadsheet,
  },
  {
    title: "Delivery Challans",
    desc: "Dispatch documentation with linked order tracking and transport details.",
    icon: Truck,
  },
  {
    title: "Machine Allocation",
    desc: "Shop-floor machine utilization, maintenance records, and operator logging.",
    icon: Cpu,
  },
];

const AUDIENCE_ITEMS = [
  "Fabrication & Job Shops",
  "CNC & Precision Machining Workshops",
  "Assembly Lines & Small Factories",
  "Plastic Molding & Packaging Units",
  "Sheet Metal & Component Manufacturers",
  "Industrial Hardware & Electrical Assemblies",
];

const CORE_VALUES = [
  {
    title: "Operational Transparency",
    desc: "Clear visibility into every order stage, raw material deduction, and customer receivable without hidden data silos.",
  },
  {
    title: "True Data Ownership",
    desc: "Your records belong strictly to you. Enjoy single-click exports to standard spreadsheet formats and zero data monetization.",
  },
  {
    title: "Indian Manufacturing Context",
    desc: "Engineered specifically for Indian business practices, state tax calculations, and localized workshop dynamics.",
  },
  {
    title: "Simplicity Over Complexity",
    desc: "Tools designed for shop-floor owners and factory teams that require zero complex training to become productive.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full min-w-0 overflow-x-hidden">
      {/* Top Navbar */}
      <DocsNavbar backHref="/" backLabel="Home" currentTitle="About Us" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        {/* ─── Hero Section ───────────────────────────────────── */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs sm:text-sm font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Indian Manufacturing SMBs
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
            Simplifying Factory Operations Across India
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground leading-relaxed">
            IND Manager was built to eliminate the gap between tedious manual paper registers and
            overly complicated, foreign-centric enterprise software. We provide job shops and small
            factories with an intuitive, unified platform for production, inventory, and GST billing.
          </p>

          {isFilled(COMPANY.founderName) && (
            <p className="mt-4 text-sm font-medium text-foreground">
              Founded by <span className="font-semibold">{COMPANY.founderName}</span>
            </p>
          )}
        </div>

        {/* ─── Verified Facts Numbers Band ─────────────────────── */}
        <section className="mb-16 sm:mb-24" aria-label="Platform Highlights">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 sm:p-8 rounded-3xl border border-border bg-card/60 shadow-xs">
            <div className="space-y-1 sm:border-r border-border/80 sm:pr-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary font-mono">
                15+
              </div>
              <div className="text-sm font-semibold text-foreground">Dedicated Modules</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Covering orders, production, inventory, delivery challans, billing, and staff.
              </p>
            </div>

            <div className="space-y-1 sm:border-r border-border/80 sm:px-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary font-mono">
                4
              </div>
              <div className="text-sm font-semibold text-foreground">Indian Languages</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full interface localization in English, हिन्दी, ગુજરાતી, and मराठी.
              </p>
            </div>

            <div className="space-y-1 sm:pl-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary font-mono">
                100%
              </div>
              <div className="text-sm font-semibold text-foreground">GST-Ready Invoicing</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated CGST/SGST/IGST tax breakdowns, delivery challans, and Tally export.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Why It Exists ──────────────────────────────────── */}
        <section className="mb-16 sm:mb-24 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Why IND Manager Exists
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              Most manufacturing software is designed for multinational conglomerates with dedicated
              IT departments. Indian small factory owners are left navigating disconnected WhatsApp
              messages, Excel sheets, and handwritten chalkboards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Factory className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Built for the Shop Floor</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Workflows match how factories actually operate. Operators update machine stages and
                record material deductions with minimal taps, while managers view live batch status.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Globe2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Built in India, for India</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Equipped with native Indian numbering formats (₹ Lakhs &amp; Crores), statutory GST
                tax slabs, multi-lingual navigation, and direct XML data bridges to Tally Prime.
              </p>
            </div>
          </div>
        </section>

        {/* ─── What's Inside & Featured Modules ───────────────── */}
        <section className="mb-16 sm:mb-24 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                What’s Inside the Platform
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                A unified suite connecting every step from initial enquiry to final customer payment.
              </p>
            </div>
            <Link
              href="/modules"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
            >
              <span>Explore all modules</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED_MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div
                  key={i}
                  className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-colors space-y-3 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Who It's For ───────────────────────────────────── */}
        <section className="mb-16 sm:mb-24 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Who It's For
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              Designed for manufacturing SMBs, job work contractors, and growing production units
              across a wide spectrum of industrial sectors:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {AUDIENCE_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/70 bg-card flex items-center gap-3"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Core Values ────────────────────────────────────── */}
        <section className="mb-16 sm:mb-24 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Our Core Principles
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              The fundamental guidelines that steer our product engineering and customer support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CORE_VALUES.map((val, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-border/80 bg-card space-y-2 shadow-2xs"
              >
                <div className="text-xs font-mono font-bold text-primary">0{idx + 1}</div>
                <h3 className="text-base font-bold text-foreground">{val.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Community & Instagram Link ─────────────────────── */}
        <section className="mb-16 sm:mb-24 p-6 sm:p-8 rounded-3xl border border-border bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              <span>Connect on Instagram</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">Follow Our Journey</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Get behind-the-scenes product updates, factory management tips, and feature releases on
              our official Instagram page.
            </p>
          </div>
          <a
            href={COMPANY.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow IND Manager on Instagram"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all shadow-xs min-h-[44px] shrink-0"
          >
            <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span>Follow {COMPANY.handle}</span>
          </a>
        </section>

        {/* ─── Call to Action ─────────────────────────────────── */}
        <section className="text-center py-12 px-6 rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
            Ready to Streamline Your Workshop?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start managing orders, inventory, and GST billing with our free Starter plan today.
            No credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/25 min-h-[44px]"
            >
              Start Free — No Credit Card
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/modules"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors min-h-[44px]"
            >
              Explore All Modules
            </Link>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
