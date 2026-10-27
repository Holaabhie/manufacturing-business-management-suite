"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";
import { useLocale } from "next-intl";

interface UserMessageCardProps {
  content: string;
  timestamp: string;
  hasReplied?: boolean;
}

export function UserMessageCard({
  content,
  timestamp,
  hasReplied = false,
}: UserMessageCardProps) {
  const locale = useLocale();

  let formattedTime = "";
  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      formattedTime = d.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  } catch {
    formattedTime = "";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-end w-full"
    >
      <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-br-[4px] bg-primary text-primary-foreground px-4 py-2.5 shadow-xs">
        <p className="whitespace-pre-wrap break-words text-[13.5px] sm:text-sm leading-relaxed text-white">
          {content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-[11px] text-white/75 select-none">
          {formattedTime && <span>{formattedTime}</span>}
          {hasReplied ? (
            <CheckCheck className="w-3.5 h-3.5 shrink-0 text-white/80" aria-hidden="true" />
          ) : (
            <Check className="w-3.5 h-3.5 shrink-0 text-white/80" aria-hidden="true" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
