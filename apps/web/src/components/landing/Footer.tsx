"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Instagram } from "lucide-react";
import { COMPANY } from "@/content/company";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-12 sm:py-16 px-4 sm:px-6 bg-card/30 w-full min-w-0 overflow-x-hidden print:hidden">
      <div className="mx-auto max-w-6xl w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand & Socials */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="inline-block" aria-label="IND Manager Home">
              <BrandLogo
                variant="full"
                width={130}
                height={32}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manufacturing &amp; business management for Indian SMEs.
            </p>

            {/* Instagram Social Button */}
            <div className="pt-1">
              <a
                href={COMPANY.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="IND Manager on Instagram"
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200 border border-border/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Instagram className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
                <span className="sr-only">IND Manager on Instagram</span>
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/modules"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Modules
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Get Started / Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-1"
                >
                  Refund &amp; Cancellation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            &copy; {currentYear} IND Manager. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
