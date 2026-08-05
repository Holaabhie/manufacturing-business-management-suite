"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useCommandPaletteSearch } from "@/hooks/useCommandPaletteSearch";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface InlineMobileSearchProps {
  isActive: boolean;
  onClose: () => void;
  className?: string;
}

export const FOCUS_AUTO_DELAY_MS = 320;

export function getSearchContentMode(query: string, isSearching: boolean): "searching" | "results" | "default" {
  if (isSearching) return "searching";
  if (query.trim().length >= 2) return "results";
  return "default";
}

export function InlineMobileSearch({
  isActive,
  onClose,
  className,
}: InlineMobileSearchProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    quickActions,
    recentItems,
    handleSelect,
    clearSearch,
  } = useCommandPaletteSearch();

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input AFTER expand animation completes (~320ms) to avoid layout jank
  useEffect(() => {
    if (isActive) {
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 320);

      return () => clearTimeout(focusTimer);
    } else {
      clearSearch();
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [isActive, clearSearch]);

  // Handle Escape key to collapse search
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  const handleClose = () => {
    clearSearch();
    setIsFocused(false);
    inputRef.current?.blur();
    onClose();
  };

  const handleItemClick = (href: string) => {
    handleSelect(href, handleClose);
  };

  if (!isActive) return null;

  return (
    <>
      {/* ── Background Scrim (dims page content, captures click-outside) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
        aria-hidden="true"
        className="fixed inset-0 top-[44px] z-40 bg-black/35 backdrop-blur-[1px] md:hidden cursor-pointer"
      />

      {/* ── Inline Header Morph Search Bar Container ── */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{
          duration: 0.32,
          ease: [0.2, 0.9, 0.25, 1],
        }}
        className={cn(
          "relative z-50 flex items-center gap-2 w-full h-full",
          className
        )}
      >
        {/* Back / Chevron (←) Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close search"
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>

        {/* Inline Input Box */}
        <div
          className={cn(
            "relative flex-1 flex items-center h-[34px] rounded-lg bg-muted/80 px-2.5 transition-all duration-200",
            isFocused
              ? "ring-1 ring-primary border border-primary/50 bg-background shadow-sm"
              : "border border-border/60"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search orders, clients, inventory..."
            className="w-full h-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none border-none"
          />

          {/* Clear (X) button */}
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search query"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/40 hover:text-foreground cursor-pointer ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Suggestion Panel Dropdown (Attached directly beneath header) ── */}
        <motion.div
          initial={{ opacity: 0, maxHeight: 0, y: -6 }}
          animate={{ opacity: 1, maxHeight: "calc(80vh - 44px)", y: 0 }}
          exit={{ opacity: 0, maxHeight: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 z-50 overflow-hidden bg-background/95 backdrop-blur-md border-b border-x border-border/50 shadow-2xl rounded-b-2xl mt-0"
        >
          <div className="max-h-[calc(75vh-44px)] overflow-y-auto p-3 space-y-4 scrollbar-thin">
            {/* ── Case 1: Searching state ── */}
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-[13px] font-medium">Searching records...</span>
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              /* ── Case 2: Typed search query results ── */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Search Results ({searchResults.length})
                  </span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Search className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-[13px] font-medium text-foreground">
                      No matching records found
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Try searching for an order number, client name, or item code.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((result) => {
                      const IconComponent = result.icon;
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleItemClick(result.href)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/80 active:bg-muted text-left transition-colors cursor-pointer group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">
                              {result.name}
                            </p>
                            {result.description && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase font-semibold tracking-wider shrink-0"
                          >
                            {result.type}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── Case 3: Empty query default state (Quick Actions + Recent) ── */
              <div className="space-y-4">
                {/* Quick Actions section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Actions
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={action.name}
                          onClick={() => handleItemClick(action.href)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-muted/40 hover:bg-muted hover:border-primary/30 active:scale-[0.98] text-left transition-all cursor-pointer"
                        >
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                            <ActionIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[12px] font-medium text-foreground truncate">
                            {action.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Items section */}
                <div className="space-y-2 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5 px-1 pt-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent Activity
                    </span>
                  </div>
                  <div className="space-y-1">
                    {recentItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleItemClick(item.href)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/70 active:bg-muted text-left transition-colors cursor-pointer"
                        >
                          <ItemIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-[12.5px] font-medium text-foreground flex-1 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono px-1.5 py-0.5 rounded bg-muted">
                            {item.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
