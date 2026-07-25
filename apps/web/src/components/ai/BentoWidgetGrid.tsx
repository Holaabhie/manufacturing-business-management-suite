"use client";

import {
  FileBarChart,
  History,
  Lightbulb,
  Activity,
  Wifi,
  Bookmark,
  BarChart3,
  Zap,
  ChevronRight,
  TrendingUp,
  Package,
  Users,
  IndianRupee,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

interface BentoWidgetGridProps {
  isContextLoaded: boolean;
  onQuickAction: (prompt: string) => void;
  isLoading: boolean;
  messageCount: number;
  onViewReports: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Revenue Summary",
    prompt: "Give me a summary of my revenue for this month including total collected, pending, and growth trends.",
    category: "Analytics",
  },
  {
    icon: <Package className="h-4 w-4" />,
    label: "Low Stock Alert",
    prompt: "Which inventory items are running low and need to be restocked soon?",
    category: "Inventory",
  },
  {
    icon: <Users className="h-4 w-4" />,
    label: "Top Clients",
    prompt: "Who are my top 5 clients by order value this quarter?",
    category: "Clients",
  },
  {
    icon: <IndianRupee className="h-4 w-4" />,
    label: "Outstanding Payments",
    prompt: "List all clients with outstanding payments and the amounts due.",
    category: "Payments",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    label: "Pending Orders",
    prompt: "What orders are currently pending and when are their delivery dates?",
    category: "Orders",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    label: "Business Insights",
    prompt: "Analyze my business performance and suggest areas for improvement.",
    category: "Analytics",
  },
];

export function BentoWidgetGrid({
  isContextLoaded,
  onQuickAction,
  isLoading,
  messageCount,
  onViewReports,
}: BentoWidgetGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* ── System Status ── */}
      <motion.div variants={itemVariants} className="ai-bento-widget !cursor-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="ai-bento-widget__icon"
              style={{ background: "rgba(16, 185, 129, 0.12)" }}
            >
              <Wifi className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="ai-bento-widget__title">System Status</div>
              <div className="ai-bento-widget__desc">
                {isContextLoaded ? "All systems operational" : "Loading context..."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {isContextLoaded && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{
                  background: isContextLoaded ? "#10B981" : "#F59E0B",
                }}
              />
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: isContextLoaded ? "#10B981" : "#F59E0B" }}
            >
              {isContextLoaded ? "Ready" : "Loading"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Smart Reports ── */}
      <motion.div
        variants={itemVariants}
        className="ai-bento-widget"
        onClick={onViewReports}
      >
        <div className="flex items-center gap-3">
          <div
            className="ai-bento-widget__icon"
            style={{ background: "rgba(139, 92, 246, 0.12)" }}
          >
            <FileBarChart className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="ai-bento-widget__title">Smart Reports</div>
            <div className="ai-bento-widget__desc">AI-generated business analytics</div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--ai-text-tertiary)]" />
        </div>
      </motion.div>

      {/* ── Session Stats ── */}
      <motion.div variants={itemVariants} className="ai-bento-widget !cursor-default">
        <div className="flex items-center gap-3">
          <div
            className="ai-bento-widget__icon"
            style={{ background: "rgba(59, 130, 246, 0.12)" }}
          >
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="ai-bento-widget__title">Session</div>
            <div className="ai-bento-widget__desc">
              {messageCount > 0
                ? `${messageCount} messages this session`
                : "No messages yet"}
            </div>
          </div>
          {messageCount > 0 && (
            <span className="ai-bento-widget__metric text-[16px]">{messageCount}</span>
          )}
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Zap className="h-3.5 w-3.5 text-[var(--ai-accent-purple)]" />
          <span className="text-[12px] font-semibold text-[var(--ai-text-secondary)]">
            Quick Actions
          </span>
        </div>
        <div className="space-y-1.5">
          {QUICK_PROMPTS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onQuickAction(action.prompt)}
              disabled={isLoading}
              className="w-full text-left ai-bento-widget !p-3 disabled:opacity-40 group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 text-[var(--ai-text-tertiary)] group-hover:text-[var(--ai-accent-purple)] transition-colors bg-gray-100 dark:bg-white/[0.04]"
                >
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ai-text-primary)] truncate">
                    {action.label}
                  </p>
                  <p className="text-[10px] text-[var(--ai-text-tertiary)] uppercase tracking-wider">
                    {action.category}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--ai-text-tertiary)] group-hover:text-[var(--ai-accent-purple)] transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Pro Tip ── */}
      <motion.div
        variants={itemVariants}
        className="ai-bento-widget !cursor-default"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)",
          borderColor: "rgba(139,92,246,0.15)",
        }}
      >
        <div className="flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-[var(--ai-accent-purple)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold text-[var(--ai-accent-purple)] mb-1">
              Pro Tip
            </p>
            <p className="text-[11px] text-[var(--ai-text-secondary)] leading-relaxed">
              Your chat history is saved automatically. Ask follow-up questions to drill deeper into any topic!
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
