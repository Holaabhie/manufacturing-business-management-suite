import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PLANS, formatPrice, getYearlySavings } from "@/lib/razorpay/plans";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Package,
  Factory,
  Wallet,
  Globe,
  FileText,
  Clock,
  Building2,
} from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDemo } from "@/components/landing/LandingDemo";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { SectionReveal } from "@/components/landing/SectionReveal";
import { Footer } from "@/components/landing/Footer";
import { MODULES } from "@/content/modules";

/* ─────────────────────────────────────────────────────────────
   IND Manager — Marketing Landing Page (Server Component)
   indmanager.in
   ───────────────────────────────────────────────────────────── */

export const metadata = {
  title: "IND Manager — Manufacturing Management for Indian SMEs",
  description:
    "Stop managing your factory on paper registers and Excel sheets. IND Manager unifies orders, inventory, production, payments, and clients in one platform built for Indian manufacturers.",
};

export default async function HomePage() {
  // ── Server-side auth: logged-in users skip the marketing page entirely ──
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  // ── Pull pricing from single source of truth (zero hardcoded numbers) ──
  const monthlyPrice = formatPrice(PLANS.pro_monthly.price); // ₹999
  const yearlyPrice = formatPrice(PLANS.pro_yearly.price); // ₹9,999
  const yearlySavings = formatPrice(getYearlySavings()); // ₹1,989
  const proFeatures = PLANS.pro_yearly.features;

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ overflowX: "hidden" }}
    >
      {/* ════════════════════════════════════════════════════════
          NAVBAR (Sticky with scroll blur & soft shadow)
          ════════════════════════════════════════════════════════ */}
      <LandingNavbar />

      {/* ════════════════════════════════════════════════════════
          HERO (Staggered reveal, tilt mockup, floating stats)
          ════════════════════════════════════════════════════════ */}
      <LandingHero />

      {/* ════════════════════════════════════════════════════════
          STATS BAR
          ════════════════════════════════════════════════════════ */}
      <SectionReveal className="border-y border-border bg-card/50 dark:bg-card/30 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center text-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-foreground">
                {s.value}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground leading-snug max-w-[120px]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </SectionReveal>

      {/* ════════════════════════════════════════════════════════
          FEATURES
          ════════════════════════════════════════════════════════ */}
      <SectionReveal id="features" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything You Need
              <br />
              <span className="text-primary">in One Place</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Built with real factory needs in mind. Simple, powerful, and made
              for India.
            </p>
          </div>

          {/* 4-card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group relative block p-7 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(37,99,235,0.07)] transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {/* Subtle glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px circle at 0% 0%, ${f.glowColor}, transparent)`,
                  }}
                />
                {/* Icon badge */}
                <div
                  className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: f.iconBg }}
                >
                  <f.icon className="h-6 w-6" style={{ color: f.iconColor }} />
                </div>
                {/* Content */}
                <h3 className="relative font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors duration-200">
                  {f.title}
                </h3>
                <p className="relative text-sm text-muted-foreground leading-relaxed mb-6">
                  {f.description}
                </p>
                {/* Arrow button → decorative element inside single Link (no nested anchors) */}
                <span
                  aria-hidden="true"
                  className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-200"
                >
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>

          {/* See all modules link */}
          <div className="text-center mt-10">
            <Link
              href="/modules"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              See all 15+ modules <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionReveal>

      {/* ════════════════════════════════════════════════════════
          VIDEO / DEMO PLACEHOLDER ("See it in action")
          ════════════════════════════════════════════════════════ */}
      <LandingDemo />

      {/* ════════════════════════════════════════════════════════
          PRICING
          ════════════════════════════════════════════════════════ */}
      <LandingPricing
        monthlyPrice={monthlyPrice}
        yearlyPrice={yearlyPrice}
        yearlySavings={yearlySavings}
        proFeatures={proFeatures}
      />

      {/* ════════════════════════════════════════════════════════
          ABOUT
          ════════════════════════════════════════════════════════ */}
      <SectionReveal
        id="about"
        className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30 dark:bg-card/30"
      >
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="flex justify-center">
            <BrandLogo
              variant="icon"
              width={64}
              height={64}
              className="w-16 h-16 object-contain"
            />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            About IND Manager
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            IND Manager is built in India, for India — designed specifically for
            small and medium manufacturing businesses that are ready to move
            beyond paper ledgers and fragmented spreadsheets. We understand the
            real challenges of running a factory: last-minute order changes,
            raw material shortfalls, payment follow-ups, and staff coordination.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Our platform unifies every part of your operation — from the shop
            floor to the accounts ledger — in one mobile-first app that works in
            Hindi, Gujarati, Marathi, and English.
          </p>
        </div>
      </SectionReveal>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════════════════════════ */}
      <SectionReveal className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to modernise your factory?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join manufacturers across India who are replacing paper registers
            and Excel chaos with one clean, powerful platform.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:scale-[0.98] duration-200"
          >
            Start Free — No Credit Card Needed
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </SectionReveal>

      {/* ════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Static data — co-located, not exported
   ───────────────────────────────────────────────────────────── */

const STATS = [
  { value: "15+", label: "Business Modules in One App", icon: Building2 },
  { value: "4", label: "Indian Languages Supported", icon: Globe },
  { value: "100%", label: "GST-Ready Invoicing", icon: FileText },
  { value: "24/7", label: "Access Anywhere, Anytime", icon: Clock },
] as const;

const getCardBlurb = (slug: string, fallback: string): string => {
  const mod = MODULES.find((m) => m.slug === slug);
  return mod?.cardBlurb || fallback;
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Orders",
    description: getCardBlurb(
      "orders",
      "Create, track, and manage customer orders from quotation to delivery. Status updates keep everyone aligned."
    ),
    iconBg: "rgba(37, 99, 235, 0.1)",
    iconColor: "var(--primary)",
    glowColor: "rgba(37,99,235,0.04)",
    href: "/modules/orders",
  },
  {
    icon: Package,
    title: "Inventory",
    description: getCardBlurb(
      "inventory",
      "Track raw materials and finished goods with automatic stock deductions when jobs are launched. Low stock alerts help you stay ahead of shortages."
    ),
    iconBg: "rgba(22, 163, 74, 0.1)",
    iconColor: "#16A34A",
    glowColor: "rgba(22,163,74,0.04)",
    href: "/modules/inventory",
  },
  {
    icon: Factory,
    title: "Production",
    description: getCardBlurb(
      "production",
      "Assign staff and machines to production runs, and monitor completion status."
    ),
    iconBg: "rgba(139, 92, 246, 0.1)",
    iconColor: "#8B5CF6",
    glowColor: "rgba(139,92,246,0.04)",
    href: "/modules/production",
  },
  {
    icon: Wallet,
    title: "Payments & Accounts",
    description: getCardBlurb(
      "payments-accounts",
      "Record client payments with TDS details, track receivables, and generate reports. Keep your finances organized and transparent."
    ),
    iconBg: "rgba(37, 99, 235, 0.1)",
    iconColor: "var(--primary)",
    glowColor: "rgba(37,99,235,0.04)",
    href: "/modules/payments-accounts",
  },
];

