import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { LandingThemeToggle } from "@/components/LandingThemeToggle";

interface DocsNavbarProps {
  backHref?: string;
  backLabel?: string;
  currentTitle?: string;
}

export function DocsNavbar({
  backHref = "/modules",
  backLabel = "All Modules",
  currentTitle,
}: DocsNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 h-[64px]">
        {/* Left: Back button + Brand logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={backHref}
            className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0"
            aria-label={`Back to ${backLabel}`}
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>

          <span className="text-border hidden sm:inline" aria-hidden="true">
            /
          </span>

          <Link
            href="/"
            className="flex items-center group shrink-0 transition-opacity hover:opacity-85"
            aria-label="IND Manager Home"
          >
            <BrandLogo
              variant="full"
              width={128}
              height={32}
              className="h-6 sm:h-7 w-auto object-contain"
              priority
            />
          </Link>

          {currentTitle && (
            <>
              <span className="text-border hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden md:inline text-sm font-medium text-foreground truncate max-w-[200px] lg:max-w-[260px]">
                {currentTitle}
              </span>
            </>
          )}
        </div>

        {/* Right: Theme toggle + Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LandingThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.3)] active:scale-[0.98]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </header>
  );
}
