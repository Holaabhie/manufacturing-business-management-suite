"use client";

import { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SmartInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SmartInputBar({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder,
  onFocus,
  onBlur,
}: SmartInputBarProps) {
  const t = useTranslations("assistant");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolvedPlaceholder = placeholder ?? t("inputPlaceholder");

  // Auto-resize textarea (min 1 line ~24px, max 4 lines ~112px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 24), 112)}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches;

    // On desktop: Enter sends, Shift+Enter creates a new line
    // On mobile: Enter creates a new line, send button sends
    if (!isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(value.trim());
      }
    }
  };

  const canSubmit = Boolean(value.trim()) && !isLoading;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={cn(
            "flex items-end gap-2.5 p-2 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-xs transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary"
          )}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={resolvedPlaceholder}
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 bg-transparent border-0 outline-none resize-none leading-relaxed",
              "text-[16px] text-foreground placeholder:text-muted-foreground/60",
              "min-h-[26px] max-h-[112px] py-1 px-1.5 scrollbar-hide",
              "disabled:opacity-50"
            )}
          />

          {/* 40px Circular Send button */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileTap={{ scale: canSubmit ? 0.92 : 1 }}
            aria-label={t("btnSend", { defaultValue: "Send" } as any)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-150",
              canSubmit
                ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-40"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

export default SmartInputBar;
