import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { MODULES, MODULE_GROUPS, type ModuleGroup } from "@/content/modules";
import { DocsNavbar } from "@/components/modules/DocsNavbar";
import { ModuleIcon } from "@/components/modules/ModuleIcon";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight, Sparkles, Layers, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Module Directory & Documentation | IND Manager",
  description:
    "Explore all 21 specialized manufacturing modules built for Indian factory operations, from orders and inventory to Tally integration and GST billing.",
};

const GROUP_DESCRIPTIONS: Record<ModuleGroup, string> = {
  Overview: "Executive cockpit and real-time factory health monitoring.",
  Operations: "Core shop-floor workflow from quotation to machine tracking and procurement.",
  Finance: "GST billing, accounts receivable, vendor payables, and bank reconciliation.",
  Relationships: "Customer master profiles, transaction histories, and statements of account.",
  Insights: "Business intelligence, aging reports, in-app notifications, and AI assistant.",
  Workspace: "Petty expenses management and workshop reference scratchpads.",
  "Admin & Integrations": "Team access roles, enterprise preferences, and Tally Prime XML integration.",
};

export default function ModulesIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground w-full min-w-0 overflow-x-hidden flex flex-col">
      {/* Sticky top bar */}
      <DocsNavbar backHref="/" backLabel="Home" />

      {/* Main container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        {/* Hero Section */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-xs sm:text-sm font-medium text-muted-foreground shadow-sm mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            21 Purpose-Built Manufacturing Modules
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
            Platform Module Directory
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every tool required to run your manufacturing business smoothly — from initial quotation
            and production routing to delivery challans, GST invoices, and Tally Prime export.
          </p>

          {/* Quick Category Anchors */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {MODULE_GROUPS.map((group) => (
              <a
                key={group}
                href={`#group-${group.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                className="shrink-0 min-h-[44px] flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                {group}
              </a>
            ))}
          </div>
        </div>

        {/* Grouped Modules */}
        <div className="space-y-16">
          {MODULE_GROUPS.map((group) => {
            const groupModules = MODULES.filter((m) => m.group === group);
            const anchorId = `group-${group.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

            return (
              <section
                key={group}
                id={anchorId}
                className="scroll-mt-24 space-y-6"
              >
                {/* Section Header */}
                <div className="border-b border-border pb-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                      <Layers className="h-5 w-5 text-primary shrink-0" />
                      {group}
                    </h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {groupModules.length} {groupModules.length === 1 ? "module" : "modules"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {GROUP_DESCRIPTIONS[group]}
                  </p>
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groupModules.map((mod) => (
                    <Link
                      key={mod.slug}
                      href={`/modules/${mod.slug}`}
                      className="group relative flex flex-col justify-between p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)] transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
                    >
                      {/* Top icon and badge */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200"
                            style={{ backgroundColor: mod.color.iconBg }}
                          >
                            <ModuleIcon
                              name={mod.iconName}
                              className="h-6 w-6"
                              style={{ color: mod.color.iconColor }}
                            />
                          </div>

                          {mod.status === "beta" && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Beta
                            </span>
                          )}
                        </div>

                        {/* Title and tagline */}
                        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                          {mod.title}
                        </h3>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {mod.tagline}
                        </p>

                        {/* Tally specific one-line note */}
                        {mod.slug === "tally-integration" && (
                          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
                            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <span>One-way export to Tally Prime desktop accounting software.</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
                        <span>Read documentation</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Closing CTA */}
        <div className="mt-20 p-8 sm:p-10 rounded-3xl border border-border bg-card/60 backdrop-blur-sm text-center max-w-3xl mx-auto shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Ready to organize your entire factory?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto">
            Experience all 21 purpose-built modules designed specifically for Indian SME manufacturers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[44px] rounded-xl text-base font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
