"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      <motion.div
        className="text-5xl mb-4"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-bold text-[var(--label-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--label-tertiary)] mb-6 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={{
            background: "rgba(167,139,250,0.2)",
            border: "1px solid rgba(167,139,250,0.4)",
            color: "#a78bfa",
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
