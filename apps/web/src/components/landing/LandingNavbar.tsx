"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowRight } from "lucide-react";
import { LandingThemeToggle } from "@/components/LandingThemeToggle";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          : "border-b border-transparent bg-transparent shadow-none"
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 h-[60px]">
        {/* Left: official full brand logo */}
        <Link href="/" className="flex items-center group flex-shrink-0 transition-transform duration-200 hover:scale-105">
          <BrandLogo
            variant="full"
            width={142}
            height={36}
            className="h-7 sm:h-8 w-auto object-contain"
            priority
          />
        </Link>

        {/* Center: nav links (desktop only) */}
        <div className="hidden md:flex items-center gap-6 text-[14px] font-medium">
          <a
            href="#home"
            className="text-foreground hover:text-primary transition-colors duration-200"
          >
            Home
          </a>
          <a
            href="#features"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Features
          </a>
          <a
            href="#demo"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Demo
          </a>
          <a
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Pricing
          </a>
          <a
            href="#about"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            About
          </a>
        </div>

        {/* Right: theme toggle + Get Started */}
        <div className="flex items-center gap-2.5">
          <LandingThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:scale-[0.98] duration-200"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
