import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { DocsNavbar } from "@/components/modules/DocsNavbar";
import { Footer } from "@/components/landing/Footer";
import { COMPANY, isFilled } from "@/content/company";
import {
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Instagram,
  ArrowRight,
  Shield,
  CreditCard,
  Headphones,
  FileQuestion,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | IND Manager",
  description:
    "Get in touch with the IND Manager support team for product help, sales questions, billing inquiries, and privacy requests.",
  alternates: {
    canonical: "/contact",
  },
};

const CONTACT_FAQS = [
  {
    question: "Can I use IND Manager for free?",
    answer:
      "Yes. Our Starter plan is free forever and does not require entering a credit card. It allows you to test and operate core modules with up to 5 inventory items, 5 orders, and 5 clients.",
  },
  {
    question: "Which Indian languages are currently supported?",
    answer:
      "IND Manager is localized in 4 languages: English, हिन्दी (Hindi), ગુજરાતી (Gujarati), and मराठी (Marathi). You can switch languages anytime from the dashboard settings or bottom navigation.",
  },
  {
    question: "How does Tally integration work?",
    answer:
      "IND Manager generates standard Tally Prime-compatible XML export files. You can export sales vouchers, party ledgers, and inventory deductions to import directly into your Tally Prime desktop software.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your paid Pro subscription at any time under Dashboard > Upgrade. You will retain full access to Pro features until the end of your prepaid billing period, with no further renewals.",
  },
  {
    question: "How do I download or delete my factory data?",
    answer:
      "You can export all inventory, orders, clients, and staff ledgers to an Excel file at any time via Settings > Data. For complete account deletion, submit a verified request to our support desk.",
  },
  {
    question: "Does IND Manager provide formal tax or accounting advice?",
    answer:
      "No. IND Manager provides automated tools to generate GST-compliant invoices and compute CGST/SGST/IGST tax rates based on your inputs. All statutory filings and tax assessments must be reviewed by your qualified Chartered Accountant.",
  },
];

export default function ContactPage() {
  const hasEmail = isFilled(COMPANY.supportEmail);
  const hasPhone = isFilled(COMPANY.phone);
  const hasAddress = isFilled(COMPANY.address);
  const hasInstagram = isFilled(COMPANY.instagramUrl);
  const hasResponseTime = isFilled(COMPANY.responseTime);
  const hasGrievance =
    isFilled(COMPANY.grievanceOfficer?.name) || isFilled(COMPANY.grievanceOfficer?.email);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full min-w-0 overflow-x-hidden">
      {/* Top Navbar */}
      <DocsNavbar backHref="/" backLabel="Home" currentTitle="Contact Us" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        {/* ─── Hero Section ───────────────────────────────────── */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs sm:text-sm font-semibold text-primary mb-4">
            <Headphones className="h-3.5 w-3.5" />
            Direct Support &amp; Assistance
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
            We’re Here to Help Your Factory Grow
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Have questions about our manufacturing modules, subscription plans, data privacy, or
            need technical assistance? Connect directly with our team through the options below.
          </p>

          {hasResponseTime && (
            <div className="flex items-center gap-2 mt-4 text-xs sm:text-sm text-muted-foreground font-medium">
              <Clock className="h-4 w-4 text-primary" />
              <span>
                Standard response time: <strong className="text-foreground">{COMPANY.responseTime}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ─── Contact Cards (Show Only Filled Values) ─────────── */}
        <section className="mb-16 sm:mb-20" aria-label="Direct Communication Channels">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Email Card (if filled) */}
            {hasEmail && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Email Support</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For general support, feedback, and sales inquiries.
                  </p>
                </div>
                <a
                  href={`mailto:${COMPANY.supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all min-h-[44px]"
                >
                  <span>{COMPANY.supportEmail}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            )}

            {/* WhatsApp / Phone Card (if filled) */}
            {hasPhone && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Phone &amp; WhatsApp</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direct phone assistance during business hours.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href={`tel:${COMPANY.phone}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline min-h-[38px]"
                  >
                    <span>{COMPANY.phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${(COMPANY.phone || "").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <span>Chat on WhatsApp</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {/* Instagram Card (always filled per config) */}
            {hasInstagram && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Instagram</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direct messages, platform previews, and announcements.
                  </p>
                </div>
                <a
                  href={COMPANY.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 dark:text-pink-400 hover:underline min-h-[44px]"
                >
                  <span>{COMPANY.handle}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            )}

            {/* Physical Address Card (if filled) */}
            {hasAddress && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Office Address</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our registered business location.
                  </p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {COMPANY.address}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ─── "How Can We Help?" Topic Guidance Cards ────────── */}
        <section className="mb-16 sm:mb-20 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How Can We Help You?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Find the most efficient channel for your specific query.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Topic 1: Sales / Demo */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-colors space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Sales &amp; Product Demo</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Looking to evaluate our 15+ manufacturing modules for your shop floor? Learn more on our modules directory.
              </p>
              <Link
                href="/modules"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <span>View Modules</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Topic 2: Product Support */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-colors space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Headphones className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Product Support</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need help with inventory deductions, order stages, or Tally XML imports? Reach out directly via Instagram or email.
              </p>
              <a
                href={COMPANY.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <span>Message on Instagram</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>

            {/* Topic 3: Billing & Refunds */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-colors space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Billing &amp; Refunds</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Questions about Pro plans, invoice receipts, or our 7-day first purchase money-back guarantee?
              </p>
              <Link
                href="/refund"
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline pt-1"
              >
                <span>Refund Policy</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Topic 4: Privacy & Grievances */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-colors space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Data &amp; Privacy Rights</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit DPDP access, correction, data export assistance, or account erasure requests under our privacy policy.
              </p>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-1"
              >
                <span>Privacy Policy</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Grievance Officer Notice (if filled) ────────────── */}
        {hasGrievance && (
          <section className="mb-16 sm:mb-20 p-6 rounded-2xl border border-border bg-muted/20 space-y-2">
            <h3 className="text-base font-bold text-foreground">Grievance Redressal Mechanism</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              In accordance with the Information Technology Act, 2000 and the Digital Personal Data
              Protection Act, 2023, you may contact our designated Grievance Officer:
            </p>
            <div className="text-xs sm:text-sm text-foreground pt-1 space-y-1">
              {isFilled(COMPANY.grievanceOfficer?.name) && (
                <div>
                  <strong>Officer:</strong> {COMPANY.grievanceOfficer.name}
                </div>
              )}
              {isFilled(COMPANY.grievanceOfficer?.email) && (
                <div>
                  <strong>Email:</strong>{" "}
                  <a
                    href={`mailto:${COMPANY.grievanceOfficer.email}`}
                    className="text-primary hover:underline"
                  >
                    {COMPANY.grievanceOfficer.email}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Verified Facts FAQ ──────────────────────────────── */}
        <section className="space-y-6 pt-4 border-t border-border" aria-label="FAQ">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {CONTACT_FAQS.map((faq, idx) => (
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
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
