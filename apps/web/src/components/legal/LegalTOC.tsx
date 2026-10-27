"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ListCollapse } from "lucide-react";
import { LegalSection, AccentColor } from "@/content/legal/types";
import { cn } from "@/lib/utils";

interface LegalTOCProps {
  sections: LegalSection[];
  accentColor: AccentColor;
}

const ACCENT_ACTIVE_CLASSES: Record<AccentColor, string> = {
  blue: "text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-400 bg-blue-500/5",
  green: "text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-600 dark:border-emerald-400 bg-emerald-500/5",
  purple: "text-purple-600 dark:text-purple-400 font-semibold border-l-2 border-purple-600 dark:border-purple-400 bg-purple-500/5",
};

export function DesktopLegalTOC({ sections, accentColor }: LegalTOCProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const offset = 180;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(sections[i].id);
        if (sec && sec.offsetTop - offset <= scrollY) {
          setActiveId(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  return (
    <aside className="hidden lg:block w-64 shrink-0 print:hidden">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide pr-2 space-y-3">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ListCollapse className="h-3.5 w-3.5" />
          <span>On this page</span>
        </div>
        <nav className="space-y-0.5" aria-label="Table of contents">
          {sections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "block px-3 py-1.5 text-xs rounded-r-lg transition-colors duration-150 leading-relaxed border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isActive && ACCENT_ACTIVE_CLASSES[accentColor]
                )}
              >
                <span className="opacity-60 mr-1.5">{section.number}.</span>
                {section.title}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobileLegalTOC({ sections, accentColor }: LegalTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const offset = 180;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(sections[i].id);
        if (sec && sec.offsetTop - offset <= scrollY) {
          setActiveId(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const activeSection = sections.find((s) => s.id === activeId) || sections[0];

  return (
    <div className="lg:hidden w-full mb-8 border border-border/80 bg-card rounded-2xl overflow-hidden shadow-sm print:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left text-sm font-medium hover:bg-muted/40 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <ListCollapse className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider shrink-0">
            On this page:
          </span>
          <span className="truncate text-foreground font-medium text-xs sm:text-sm">
            {activeSection ? `${activeSection.number}. ${activeSection.title}` : "Sections"}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-border/80 bg-muted/20 space-y-1 max-h-64 overflow-y-auto">
          {sections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-card",
                  isActive && "font-semibold text-foreground bg-card shadow-xs"
                )}
              >
                <span className="opacity-60 mr-2">{section.number}.</span>
                {section.title}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
