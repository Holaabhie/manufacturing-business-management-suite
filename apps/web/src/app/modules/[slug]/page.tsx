import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  MODULES,
  getModuleBySlug,
  type ModuleSlug,
  type ModuleContent,
} from "@/content/modules";
import { DocsNavbar } from "@/components/modules/DocsNavbar";
import { DocsSidebar } from "@/components/modules/DocsSidebar";
import { ModuleIcon } from "@/components/modules/ModuleIcon";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  Link as LinkIcon,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export function generateStaticParams() {
  return MODULES.map((mod) => ({
    slug: mod.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const mod = getModuleBySlug(resolvedParams.slug);
  if (!mod) {
    return {
      title: "Module Not Found | IND Manager",
    };
  }
  return {
    title: `${mod.title} | IND Manager`,
    description: mod.tagline,
  };
}

export default async function ModuleDocPage({ params }: PageProps) {
  const resolvedParams = await params;
  const mod = getModuleBySlug(resolvedParams.slug);

  if (!mod) {
    notFound();
  }

  // Find previous and next modules in canonical suite order
  const currentIndex = MODULES.findIndex((m) => m.slug === mod.slug);
  const prevMod: ModuleContent | null =
    currentIndex > 0 ? MODULES[currentIndex - 1] : null;
  const nextMod: ModuleContent | null =
    currentIndex < MODULES.length - 1 ? MODULES[currentIndex + 1] : null;

  // Resolve related connectsWith modules
  const connectedModules = mod.connectsWith
    .map((slug) => getModuleBySlug(slug))
    .filter((m): m is ModuleContent => !!m);

  return (
    <div className="min-h-screen bg-background text-foreground w-full min-w-0 overflow-x-hidden flex flex-col">
      {/* Sticky top bar with logo and back link */}
      <DocsNavbar
        backHref="/modules"
        backLabel="All Modules"
        currentTitle={mod.title}
      />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8 xl:gap-12">
        {/* Desktop Left Sticky Sidebar */}
        <DocsSidebar
          currentSlug={mod.slug}
          className="hidden lg:block sticky top-[80px] h-[calc(100vh-100px)]"
        />

        {/* Content Column */}
        <main className="flex-1 min-w-0 max-w-3xl xl:max-w-4xl space-y-12 pb-[calc(3rem+env(safe-area-inset-bottom))]">
          {/* 1. Header (Icon, Title, Status badge, Tagline) */}
          <header className="space-y-4 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1 rounded-md bg-muted">
                {mod.group}
              </span>

              {mod.status === "beta" ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Beta
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live
                </span>
              )}
            </div>

            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: mod.color.iconBg }}
              >
                <ModuleIcon
                  name={mod.iconName}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  style={{ color: mod.color.iconColor }}
                />
              </div>

              <div className="space-y-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {mod.title}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {mod.tagline}
                </p>
              </div>
            </div>

            {/* Special note for Tally Integration */}
            {mod.slug === "tally-integration" && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm font-medium">
                <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Outward one-way export to Tally Prime desktop accounting software.
                </span>
              </div>
            )}
          </header>

          {/* 2. "On this page" Anchor Chips */}
          <nav
            aria-label="Table of contents"
            className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mt-4"
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "uses", label: "What you can do" },
              { id: "how-it-works", label: "How it works" },
              { id: "features", label: "Key features" },
              { id: "details", label: "Details" },
              { id: "faqs", label: "FAQs" },
              { id: "works-with", label: "Works with" },
            ].map((chip) => (
              <a
                key={chip.id}
                href={`#${chip.id}`}
                className="shrink-0 min-h-[44px] flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                {chip.label}
              </a>
            ))}
          </nav>

          {/* 3. Overview */}
          <section id="overview" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary shrink-0" />
              Overview
            </h2>
            <div className="p-6 rounded-2xl border border-border bg-card text-foreground/90 leading-relaxed text-base">
              {mod.docs.overview}
            </div>
          </section>

          {/* 4. What you can do (uses) */}
          <section id="uses" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              What you can do
            </h2>
            <ul className="grid grid-cols-1 gap-3">
              {mod.uses.map((use, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-sm sm:text-base leading-relaxed"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{use}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 5. How it works (numbered steps) */}
          <section id="how-it-works" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary shrink-0" />
              How it works
            </h2>
            <div className="space-y-3">
              {mod.howItWorks.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card"
                >
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-base">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Key features */}
          <section id="features" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              Key features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mod.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3.5 rounded-xl border border-border bg-card text-sm leading-relaxed"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Details (docs.sections) */}
          <section id="details" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary shrink-0" />
              Detailed capabilities
            </h2>
            <div className="space-y-4">
              {mod.docs.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-2"
                >
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {section.heading}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. FAQs (native <details>/<summary>, no JS) */}
          <section id="faqs" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {mod.docs.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group border border-border rounded-xl p-4 sm:p-5 bg-card transition-colors open:bg-card/90"
                >
                  <summary className="font-semibold text-foreground flex items-center justify-between min-h-[44px] cursor-pointer select-none list-none text-sm sm:text-base">
                    <span>{faq.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 ml-2" />
                  </summary>
                  <p className="mt-3 pt-3 border-t border-border/50 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* 9. Works with (links to related module pages) */}
          <section id="works-with" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary shrink-0" />
              Works with
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {connectedModules.map((related) => (
                <Link
                  key={related.slug}
                  href={`/modules/${related.slug}`}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all min-h-[44px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: related.color.iconBg }}
                    >
                      <ModuleIcon
                        name={related.iconName}
                        className="h-5 w-5"
                        style={{ color: related.color.iconColor }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {related.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {related.tagline}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </section>

          {/* 10. Previous / Next module navigation */}
          <div className="pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevMod ? (
              <Link
                href={`/modules/${prevMod.slug}`}
                className="group flex flex-col p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all min-h-[44px]"
              >
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  Previous Module
                </span>
                <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {prevMod.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextMod ? (
              <Link
                href={`/modules/${nextMod.slug}`}
                className="group flex flex-col items-end text-right p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all min-h-[44px]"
              >
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  Next Module
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {nextMod.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* 11. Closing CTA (Reusing Landing Hero primary CTA label and href) */}
          <div className="mt-12 p-8 sm:p-10 rounded-3xl border border-border bg-card/70 backdrop-blur-sm text-center shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Ready to run {mod.title} in your factory?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto">
              Join Indian manufacturers who manage their orders, production, and finances seamlessly with IND Manager.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
      </div>
    </div>
  );
}
