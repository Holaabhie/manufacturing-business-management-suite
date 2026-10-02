"use client";

import { useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SmartInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function SmartInputBar({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder,
}: SmartInputBarProps) {
  const t = useTranslations("assistant");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolvedPlaceholder = placeholder ?? t("inputPlaceholder");

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(value.trim());
      }
    }
  };

  return (
    <div className="w-full flex-shrink-0">
      <form onSubmit={handleSubmit} className="max-w-[900px] mx-auto">
        <div className="ai-input-bar flex items-end gap-3">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 min-h-[24px] max-h-[140px]",
              "disabled:opacity-50"
            )}
            style={{ maxHeight: 140 }}
          />

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={isLoading || !value.trim()}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white",
              "transition-all duration-200",
              value.trim()
                ? "bg-primary shadow-sm hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {/* Hints (desktop only to preserve mobile screen real estate) */}
        <div className="hidden sm:flex items-center justify-center gap-3 mt-2">
          <span className="text-[10px] text-[var(--ai-text-tertiary)]">
            {t("inputHintPress")}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[9px] border border-gray-200 dark:border-white/8 font-mono">
              Enter
            </kbd>
            {t("inputHintToSend")}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[9px] border border-gray-200 dark:border-white/8 font-mono">
              Shift+Enter
            </kbd>
            {t("inputHintForNewline")}
          </span>
        </div>
      </form>
    </div>
  );
}
