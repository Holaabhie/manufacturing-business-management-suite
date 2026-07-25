"use client";

import { useRef, useEffect } from "react";
import { Send, Sparkles, Paperclip, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  placeholder = "Ask anything about your business...",
}: SmartInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-white/[0.06]">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="ai-input-bar flex items-end gap-3">
          {/* Attachment button */}
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ai-text-tertiary)] hover:text-[var(--ai-text-secondary)] hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 min-h-[24px] max-h-[140px]",
              "disabled:opacity-50"
            )}
            style={{ maxHeight: 140 }}
          />

          {/* Mic button */}
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ai-text-tertiary)] hover:text-[var(--ai-text-secondary)] hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            title="Voice input"
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={isLoading || !value.trim()}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white",
              "transition-all duration-200",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            style={{
              background: value.trim()
                ? "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)"
                : "var(--ai-bg-surface-elevated)",
              boxShadow: value.trim()
                ? "0 4px 14px rgba(139, 92, 246, 0.3)"
                : "none",
            }}
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

        {/* Hints */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-[10px] text-[var(--ai-text-tertiary)]">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[9px] border border-gray-200 dark:border-white/8 font-mono">
              Enter
            </kbd>{" "}
            to send ·{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[9px] border border-gray-200 dark:border-white/8 font-mono">
              Shift+Enter
            </kbd>{" "}
            for new line
          </span>
        </div>
      </form>
    </div>
  );
}
