"use client";

import { motion } from "framer-motion";

interface UserMessageCardProps {
  content: string;
  timestamp: string;
}

export function UserMessageCard({ content, timestamp }: UserMessageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="flex justify-end"
    >
      <div className="ai-user-msg">
        <p className="whitespace-pre-wrap">{content}</p>
        <span className="block text-[10px] text-white/50 mt-1.5 text-right">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </motion.div>
  );
}
