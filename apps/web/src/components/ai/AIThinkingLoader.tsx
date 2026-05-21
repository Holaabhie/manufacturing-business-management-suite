"use client";

import { motion } from "framer-motion";

interface AIThinkingLoaderProps {
  message?: string;
}

export function AIThinkingLoader({ message = "Analyzing your data..." }: AIThinkingLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="ai-thinking"
    >
      {/* Gradient orb indicator */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
            boxShadow: "0 4px 16px rgba(139, 92, 246, 0.3)",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
        </div>
      </div>

      {/* Thinking content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="ai-thinking__orbs">
            <div className="ai-thinking__orb" />
            <div className="ai-thinking__orb" />
            <div className="ai-thinking__orb" />
          </div>
          <span className="ai-thinking__text">{message}</span>
        </div>
      </div>
    </motion.div>
  );
}
