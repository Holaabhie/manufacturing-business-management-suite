"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AIMark } from "@/components/ai/AIMark";

export function ThinkingIndicator() {
  const t = useTranslations("assistant");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="flex gap-2.5 items-start w-full max-w-full"
    >
      {/* AIMark Avatar with thinking animation */}
      <AIMark size={28} thinking={true} className="mt-0.5" />

      {/* Bubble */}
      <div className="rounded-2xl rounded-tl-[4px] bg-card border border-border text-foreground px-4 py-3 flex items-center gap-2.5 shadow-xs">
        <span className="text-xs sm:text-[13px] text-muted-foreground font-medium">
          {t("thinking")}
        </span>
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/80"
              animate={{
                opacity: [0.3, 1, 0.3],
                y: [0, -3, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
