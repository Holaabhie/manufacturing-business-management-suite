"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AIMark } from "@/components/ai/AIMark";

export function AIThinkingBubble() {
  const t = useTranslations("assistant");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="flex gap-2.5 items-start w-full max-w-full"
    >
      <AIMark size={28} thinking={true} className="mt-0.5 shrink-0" />
      <div className="rounded-2xl rounded-tl-[4px] px-3.5 py-2.5 bg-card border border-border text-foreground shadow-xs inline-flex items-center gap-2.5 select-none">
        <span className="text-[13.5px] font-medium text-muted-foreground">
          {t("thinking")}
        </span>
        <div className="inline-flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
              animate={{
                opacity: [0.35, 1, 0.35],
                y: [0, -3, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default AIThinkingBubble;
