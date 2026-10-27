"use client";

import React, { useEffect, useState } from "react";
import { Printer, ArrowUp } from "lucide-react";

export function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs sm:text-sm font-medium text-foreground transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[38px] print:hidden cursor-pointer"
      aria-label="Print or save as PDF"
    >
      <Printer className="h-4 w-4 text-muted-foreground" />
      <span>Print / PDF</span>
    </button>
  );
}

export function BackToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-card border border-border text-foreground hover:bg-muted shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 print:hidden cursor-pointer"
      aria-label="Scroll back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
