import React from "react";
import Link from "next/link";
import { LegalDocument, AccentColor } from "@/content/legal/types";
import { DocsNavbar } from "@/components/modules/DocsNavbar";
import { Footer } from "@/components/landing/Footer";
import { DesktopLegalTOC, MobileLegalTOC } from "./LegalTOC";
import { PrintButton, BackToTopButton } from "./LegalActions";
import {
  ShieldAlert,
  Info,
  ChevronRight,
  HelpCircle,
  Mail,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalLayoutProps {
  doc: LegalDocument;
}

const ACCENT_STYLES: Record<
  AccentColor,
  {
    badge: string;
    heroGlow: string;
    sectionNumber: string;
    contactIcon: string;
  }
> = {
  blue: {
    badge: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    heroGlow: "from-blue-500/10 via-transparent to-transparent",
    sectionNumber: "text-blue-600 dark:text-blue-400",
    contactIcon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  green: {
    badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    heroGlow: "from-emerald-500/10 via-transparent to-transparent",
    sectionNumber: "text-emerald-600 dark:text-emerald-400",
    contactIcon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    badge: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    heroGlow: "from-purple-500/10 via-transparent to-transparent",
    sectionNumber: "text-purple-600 dark:text-purple-400",
    contactIcon: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};

export function LegalLayout({ doc }: LegalLayoutProps) {
  const accent = ACCENT_STYLES[doc.accentColor];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full min-w-0 overflow-x-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm 8mm 10mm;
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-size: 7.8pt !important;
                line-height: 1.25 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print\\:hidden {
                display: none !important;
              }
              main {
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              header {
                margin-bottom: 6pt !important;
                padding-bottom: 2pt !important;
                border-bottom: 0.5pt solid #cbd5e1 !important;
              }
              header h1 {
                font-size: 13pt !important;
                line-height: 1.1 !important;
                margin-bottom: 2pt !important;
                color: #0f172a !important;
              }
              header p {
                font-size: 7.6pt !important;
                line-height: 1.18 !important;
                color: #475569 !important;
                max-width: 100% !important;
              }
              article {
                column-count: 2 !important;
                column-gap: 15pt !important;
                column-rule: 0.5pt solid #e2e8f0 !important;
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
              }
              article > :not([hidden]) ~ :not([hidden]) {
                margin-top: 0 !important;
              }
              article > section {
                margin-bottom: 6pt !important;
                padding-bottom: 0 !important;
              }
              article > section > div.flex {
                padding-bottom: 1pt !important;
                margin-bottom: 2pt !important;
                border-bottom: 0.5pt solid #e2e8f0 !important;
              }
              article h2 {
                font-size: 8.8pt !important;
                line-height: 1.15 !important;
                margin-bottom: 2pt !important;
                break-after: avoid;
                color: #0f172a !important;
              }
              article p, article li {
                font-size: 7.8pt !important;
                line-height: 1.25 !important;
                margin-bottom: 2.8pt !important;
                color: #334155 !important;
              }
              article table {
                font-size: 6.8pt !important;
                line-height: 1.15 !important;
                width: 100% !important;
                border-collapse: collapse !important;
                break-inside: avoid;
                margin: 3pt 0 !important;
              }
              article th, article td {
                padding: 1.5pt 3pt !important;
                border: 0.5pt solid #cbd5e1 !important;
                color: #1e293b !important;
              }
              article th {
                background-color: #f1f5f9 !important;
                font-weight: 600 !important;
              }
            }
          `,
        }}
      />
      {/* Sticky Top Header */}
      <div className="print:hidden">
        <DocsNavbar backHref="/" backLabel="Home" currentTitle={doc.title} />
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        {/* ─── Hero Band ────────────────────────────────────────── */}
        <header className="relative mb-12 sm:mb-16 pb-8 border-b border-border">
          <div
            className={cn(
              "absolute inset-0 -top-12 -z-10 bg-gradient-to-b opacity-50 blur-2xl pointer-events-none print:hidden",
              accent.heroGlow
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border",
                accent.badge
              )}
            >
              {doc.badgeLabel}
            </span>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Last updated: <strong className="text-foreground">{doc.lastUpdated}</strong>
              </span>
              <PrintButton />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            {doc.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {doc.summary}
          </p>
        </header>

        {/* ─── "At a Glance" Summary Cards ──────────────────────── */}
        <section className="mb-12 sm:mb-16 print:hidden" aria-label="Summary overview">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            At a Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {doc.atAGlance.map((card, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs space-y-2"
              >
                {card.badge && (
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.badge}
                  </span>
                )}
                <h3 className="text-sm font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Mobile Collapsible TOC */}
        <MobileLegalTOC sections={doc.sections} accentColor={doc.accentColor} />

        {/* ─── Content Grid: Main Sections + Sticky Desktop TOC ── */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          {/* Main Document Body */}
          <article className="flex-1 min-w-0 space-y-12 sm:space-y-16">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 space-y-4 print:space-y-3"
              >
                <div className="flex items-baseline gap-3 pb-2 border-b border-border/60">
                  <span
                    className={cn(
                      "font-mono text-base sm:text-lg font-bold shrink-0",
                      accent.sectionNumber
                    )}
                  >
                    {section.number.toString().padStart(2, "0")}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                </div>

                {/* Paragraphs */}
                <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {/* Optional Callout */}
                {section.callout && (
                  <div
                    className={cn(
                      "p-4 rounded-xl border text-xs sm:text-sm leading-relaxed my-4 flex items-start gap-3",
                      section.callout.type === "important"
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-950 dark:text-amber-200"
                        : "bg-blue-500/10 border-blue-500/25 text-blue-950 dark:text-blue-200"
                    )}
                  >
                    {section.callout.type === "important" ? (
                      <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      {section.callout.title && (
                        <strong className="block font-semibold">
                          {section.callout.title}
                        </strong>
                      )}
                      <span>{section.callout.text}</span>
                    </div>
                  </div>
                )}

                {/* Optional Table */}
                {section.table && (
                  <div className="my-6 rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
                    {section.table.caption && (
                      <div className="px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold text-foreground">
                        {section.table.caption}
                      </div>
                    )}
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            {section.table.headers.map((h, hIdx) => (
                              <th
                                key={hIdx}
                                className="px-4 py-3 font-semibold text-foreground whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="px-4 py-3 text-muted-foreground align-top leading-relaxed"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            ))}

            {/* ─── Frequently Asked Questions (Native Accordion) ─ */}
            {doc.faqs && doc.faqs.length > 0 && (
              <section className="pt-8 border-t border-border space-y-6 print:hidden" aria-label="FAQ">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Frequently Asked Questions
                  </h2>
                </div>

                <div className="space-y-3">
                  {doc.faqs.map((faq, idx) => (
                    <details
                      key={idx}
                      className="group border border-border/80 bg-card rounded-2xl overflow-hidden shadow-2xs transition-colors"
                    >
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm sm:text-base font-semibold text-foreground select-none hover:bg-muted/30 transition-colors list-none">
                        <span className="pr-4">{faq.question}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90 shrink-0" />
                      </summary>
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* ─── "Questions? Contact Us" Card ────────────────── */}
            <div className="p-6 rounded-2xl border border-border bg-card/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "p-3 rounded-xl shrink-0 mt-0.5",
                    accent.contactIcon
                  )}
                >
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Have questions about this policy?
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Our team is here to assist with billing, privacy requests, and operational queries.
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shrink-0"
              >
                <span>Contact Us</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* Sticky Desktop TOC Sidebar */}
          <DesktopLegalTOC sections={doc.sections} accentColor={doc.accentColor} />
        </div>
      </main>

      {/* Floating Back to Top Button */}
      <BackToTopButton />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
