"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
        {/* Left: logo badge + wordmark + caption */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/icons/icon-512.png"
              alt="IND Manager icon"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[17px] tracking-tight">
              <span className="text-foreground">Ind</span>{" "}
              <span className="text-primary">Manager</span>
            </span>
            <span className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mt-0.5">
              Industry · Bookkeeping · Growth
            </span>
          </div>
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
