"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileBarChart,
  Settings,
  Send,
  RefreshCw,
  Lightbulb,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Paperclip,
  Pin,
  BarChart3,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── AI Components (untouched internals) ──
import { AIThinkingLoader } from "@/components/ai/AIThinkingLoader";
import { SmartInputBar } from "@/components/ai/SmartInputBar";
import { ResponseCard } from "@/components/ai/ResponseCard";
import { UserMessageCard } from "@/components/ai/UserMessageCard";
import { AIAssistantIcon } from "@/components/ai/AIAssistantIcon";

// ── Hook (untouched chat logic) ──
import { useAIChat } from "@/hooks/useAIChat";

// ─── 5 Category Cards (Analytics, Inventory, Clients, Payments, Orders) ──
const CATEGORY_CARDS = [
  {
    id: "analytics",
    title: "Analytics",
    description: "Track revenue growth, top products, and monthly sales trends",
    prompt: "Analyze my total revenue, top products by revenue, and month-over-month growth trends.",
    icon: BarChart3,
    color: "#2563EB",
    bg: "rgba(37, 99, 235, 0.10)",
    border: "rgba(37, 99, 235, 0.20)",
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Check stock levels, low-stock reorder alerts, and turnover rates",
    prompt: "Which inventory items are running low and need to be restocked soon?",
    icon: Package,
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.10)",
    border: "rgba(5, 150, 105, 0.20)",
  },
  {
    id: "clients",
    title: "Clients",
    description: "Review client profiles, order history, and payment reliability",
    prompt: "Who are my most valuable clients? Show revenue per client and payment reliability.",
    icon: Users,
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.10)",
    border: "rgba(124, 58, 237, 0.20)",
  },
  {
    id: "payments",
    title: "Payments",
    description: "Monitor incoming payments, pending dues, and cash flow health",
    prompt: "Give me a summary of collected vs outstanding payments this month.",
    icon: CreditCard,
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.10)",
    border: "rgba(217, 119, 6, 0.20)",
  },
  {
    id: "orders",
    title: "Orders",
    description: "Track pending orders, fulfillment progress, and delivery status",
    prompt: "What is the status of all pending and in-progress orders?",
    icon: ShoppingCart,
    color: "#4F46E5",
    bg: "rgba(79, 70, 229, 0.10)",
    border: "rgba(79, 70, 229, 0.20)",
  },
];

// ─── Try Asking Prompts ──────────────────────────────────────
const SUGGESTION_PROMPTS = [
  {
    label: "Show revenue summary",
    prompt: "Give me a summary of my revenue for this month including total collected, pending, and growth trends.",
  },
  {
    label: "Which items have low stock?",
    prompt: "Which inventory items are running low and need to be restocked soon?",
  },
  {
    label: "Pending orders status",
    prompt: "What is the status of all pending and in-progress orders?",
  },
  {
    label: "Outstanding payments this month",
    prompt: "List all clients with outstanding payments and the amounts due.",
  },
  {
    label: "Production efficiency report",
    prompt: "How efficient is my production? Show order completion rate, average delivery time, and bottlenecks.",
  },
];

// ─── Quick Actions (wired to real routes) ────────────────────
const QUICK_ACTIONS = [
  {
    id: "orders",
    label: "View Pending Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    color: "#2563EB",
  },
  {
    id: "inventory",
    label: "Check Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    color: "#059669",
  },
  {
    id: "sales",
    label: "View Sales Report",
    href: "/dashboard/analytics",
    icon: BarChart3,
    color: "#D97706",
  },
  {
    id: "clients",
    label: "Add New Client",
    href: "/dashboard/clients",
    icon: Users,
    color: "#7C3AED",
  },
  {
    id: "payments",
    label: "Record Payment",
    href: "/dashboard/payments",
    icon: CreditCard,
    color: "#DC2626",
  },
];

// ─── Recent Insights (Static Placeholder — TODO: connect to live stats API) ──
const RECENT_INSIGHTS = [
  {
    id: "insight-revenue",
    headline: "Revenue +12.5%",
    subtext: "Monthly collection pacing 12.5% ahead of previous cycle.",
    icon: TrendingUp,
    color: "#059669",
  },
  {
    id: "insight-stock",
    headline: "3 Low Stock Items",
    subtext: "Raw material stock is below safety replenishment buffer.",
    icon: AlertTriangle,
    color: "#D97706",
  },
  {
    id: "insight-production",
    headline: "8 Orders In Production",
    subtext: "All manufacturing lines running with 94% on-time completion.",
    icon: Clock,
    color: "#7C3AED",
  },
];

// ─── Smart Reports Types ─────────────────────────────────────
interface ReportEntry {
  question: string;
  response: Record<string, unknown>;
  timestamp: string;
}

const REPORT_PROMPTS = [
  { label: "Revenue Analysis", prompt: "Analyze my total revenue, top products by revenue, and month-over-month growth trends.", icon: "📊" },
  { label: "Inventory Health", prompt: "Give me a full inventory health check — which items need restocking, total inventory value, and turnover rate.", icon: "📦" },
  { label: "Profit Breakdown", prompt: "Break down my profit margins across all orders. What are my highest and lowest margin products?", icon: "💰" },
  { label: "Client Insights", prompt: "Who are my most valuable clients? Show revenue per client and payment reliability.", icon: "👥" },
  { label: "Cash Flow", prompt: "Analyze my cash flow — total collected vs outstanding, overdue payments, and collection rate.", icon: "🏦" },
  { label: "Production Efficiency", prompt: "How efficient is my production? Show order completion rate, average delivery time, and bottlenecks.", icon: "🏭" },
];

// ─── Main Component ─────────────────────────────────────────
export default function AIAssistantPage() {
  const router = useRouter();

  const {
    messages,
    isLoading,
    isContextLoaded,
    aiNotConfigured,
    sendMessage,
    retryLastMessage,
    clearChat,
  } = useAIChat();

  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"chat" | "reports">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Smart Reports State ──
  const [reportQuestion, setReportQuestion] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportEntry[]>([]);

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  // ── Auto-scroll to bottom of page on new message ──
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (userMessageCount > 0) {
      scrollToBottom();
    }
  }, [messages, userMessageCount, scrollToBottom]);

  // ── Handlers ──
  const handleSend = (value: string) => {
    if (!value.trim()) return;
    sendMessage(value);
    setInput("");
  };

  const sendReport = async (question: string) => {
    if (!question.trim() || reportLoading) return;
    setReportLoading(true);
    try {
      const res = await fetch("/api/v1/ai-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          history: reportHistory.slice(-6).map((r) => ({ role: "user", content: r.question })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReportHistory((prev) => [
          { question: question.trim(), response: data.response, timestamp: new Date().toISOString() },
          ...prev,
        ]);
        setReportQuestion("");
      } else {
        toast.error(data.error || "Failed to generate report");
      }
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* ════════════════ SLIM PAGE HEADING ROW (SINGLE HEADER) ════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] shadow-md shadow-purple-500/20">
            <AIAssistantIcon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                AI Assistant
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Your intelligent business advisor
            </p>
          </div>
        </div>

        {/* View Mode Switcher + New Chat Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("chat")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "chat"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("reports")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "reports"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileBarChart className="h-3.5 w-3.5 text-violet-500" />
              <span>Reports</span>
            </button>
          </div>

          {userMessageCount > 0 && viewMode === "chat" && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-muted-foreground text-[12px] font-medium transition-all cursor-pointer"
              title="Reset to Welcome Screen"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ CHAT VIEW ═══════════ */}
      {viewMode === "chat" && (
        <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
          {/* ── Left / Main Content Column ── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* AI Not Configured Banner */}
            {aiNotConfigured && (
              <div className="flex items-center gap-3 p-4 rounded-[16px] border border-amber-500/20 bg-amber-500/10">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-amber-500/20">
                  <Settings className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    AI Not Configured
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Contact your admin to configure the AI webhook in settings.
                  </p>
                </div>
              </div>
            )}

            {/* Welcome Card + Category Cards (shown when userMessageCount === 0) */}
            {userMessageCount === 0 && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <div className="rounded-[20px] p-5 sm:p-6 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)] flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] shadow-md shadow-purple-500/25 ring-2 ring-purple-500/20">
                    <AIAssistantIcon size={24} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug">
                      Welcome to <span className="text-primary">IND Manager</span> ✨
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Your intelligent business advisor. Ask anything about orders, inventory, payments, production, and more.
                    </p>
                  </div>
                </div>

                {/* 5 Category Cards Grid (NO illustration — reflows smoothly) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                    Business Modules
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 w-full min-w-0">
                    {CATEGORY_CARDS.map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleSend(card.prompt)}
                          className="group relative flex flex-col justify-between p-4 rounded-[16px] text-left transition-all duration-150 ease-out cursor-pointer bg-card border border-border hover:border-primary/40 hover:shadow-md min-w-0 w-full overflow-hidden"
                          style={{ boxShadow: "0 4px 20px rgba(15,23,42,0.03)" }}
                        >
                          <div className="flex items-start justify-between gap-2 w-full mb-3">
                            <div
                              className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105"
                              style={{ backgroundColor: card.bg }}
                            >
                              <Icon className="w-5 h-5" style={{ color: card.color }} />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                              {card.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {card.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* "Try asking..." Horizontal Prompt Chips */}
                <div className="w-full min-w-0 space-y-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                    Try asking...
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {SUGGESTION_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.prompt)}
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ease-out cursor-pointer bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Message Stream */}
            {userMessageCount > 0 && (
              <div className="space-y-4 pb-2">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => {
                    if (message.isLoading) {
                      return (
                        <AIThinkingLoader
                          key={message.id}
                          message="Analyzing your data..."
                        />
                      );
                    }

                    if (message.role === "user") {
                      return (
                        <UserMessageCard
                          key={message.id}
                          content={message.displayedContent ?? message.content}
                          timestamp={message.timestamp}
                        />
                      );
                    }

                    return (
                      <ResponseCard
                        key={message.id}
                        id={message.id}
                        content={message.content}
                        displayedContent={message.displayedContent}
                        timestamp={message.timestamp}
                        isTyping={message.isTyping}
                        isError={message.isError}
                        errorMessage={message.errorMessage}
                        onRetry={message.isError ? retryLastMessage : undefined}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Chat Input Bar: SmartInputBar with Option (a) Decorative Wrappers */}
            <div className="sticky bottom-0 z-10 pt-2 pb-2 bg-background/90 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Attach file (coming soon)"
                  className="hidden sm:flex h-10 w-10 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-not-allowed"
                  disabled
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <SmartInputBar
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    isLoading={isLoading}
                  />
                </div>
                <button
                  type="button"
                  title="Quick Prompts"
                  onClick={() => {
                    const randomPrompt =
                      SUGGESTION_PROMPTS[
                        Math.floor(Math.random() * SUGGESTION_PROMPTS.length)
                      ].prompt;
                    setInput(randomPrompt);
                  }}
                  className="hidden sm:flex h-10 w-10 rounded-full items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={bottomRef} />
          </div>

          {/* ── Right Sidebar: Quick Actions + Recent Insights ── */}
          <aside className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4">
            {/* Panel 1: Quick Actions */}
            <div className="flex-1 lg:flex-initial rounded-[20px] p-4 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-1">
                {QUICK_ACTIONS.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => router.push(action.href)}
                      className="w-full flex items-center justify-between p-2 rounded-[12px] hover:bg-muted transition-colors duration-150 text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${action.color}14` }}
                        >
                          <ActionIcon
                            className="w-3.5 h-3.5"
                            style={{ color: action.color }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">
                          {action.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel 2: Recent Insights (Static Placeholder — TODO: connect to live stats API) */}
            <div className="flex-1 lg:flex-initial rounded-[20px] p-4 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Recent Insights
                  </h3>
                </div>
                <Link
                  href="/dashboard/analytics"
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {/* Static Placeholder content flagged as TODO */}
              <div className="space-y-2.5">
                {RECENT_INSIGHTS.map((item) => {
                  const InsightIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-[12px] bg-muted/50 border border-border/50 flex items-start gap-2.5"
                    >
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${item.color}14` }}
                      >
                        <InsightIcon
                          className="w-3.5 h-3.5"
                          style={{ color: item.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {item.headline}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {item.subtext}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ═══════════ REPORTS VIEW ═══════════ */}
      {viewMode === "reports" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Preset Prompts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {REPORT_PROMPTS.map((rp, idx) => (
              <button
                key={idx}
                onClick={() => sendReport(rp.prompt)}
                disabled={reportLoading}
                className="rounded-[16px] p-4 text-left bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all duration-150 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-xl mb-2 block">{rp.icon}</span>
                <span className="text-sm font-semibold block text-foreground">
                  {rp.label}
                </span>
                <span className="text-xs mt-1 block text-muted-foreground line-clamp-2">
                  {rp.prompt.substring(0, 60)}...
                </span>
              </button>
            ))}
          </div>

          {/* Custom Question Input */}
          <div className="rounded-[16px] p-4 bg-card border border-border shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
              Ask a Custom Question
            </p>
            <div className="flex gap-2">
              <input
                value={reportQuestion}
                onChange={(e) => setReportQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendReport(reportQuestion);
                }}
                placeholder="e.g., What's my best performing product category?"
                className="flex-1 h-[40px] rounded-[10px] px-4 text-sm outline-none border border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                disabled={reportLoading}
              />
              <button
                onClick={() => sendReport(reportQuestion)}
                disabled={!reportQuestion.trim() || reportLoading}
                className="flex items-center gap-2 px-4 h-[40px] rounded-[10px] text-sm font-semibold text-white disabled:opacity-40 transition-all cursor-pointer bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] shadow-sm"
              >
                {reportLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Analyze
              </button>
            </div>
          </div>

          {/* Loading State */}
          {reportLoading && <AIThinkingLoader message="Generating report..." />}

          {/* Report History */}
          {reportHistory.map((report, idx) => {
            const r = report.response as Record<string, unknown>;
            return (
              <div key={idx} className="space-y-3">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="ai-user-msg">{report.question}</div>
                </div>

                {/* AI Report Card */}
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6]">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="ai-response-card flex-1">
                    {/* Summary */}
                    {r.summary && (
                      <p className="text-sm font-medium mb-4 text-foreground leading-relaxed">
                        {r.summary as string}
                      </p>
                    )}

                    {/* Data Grid */}
                    {Array.isArray(r.data) && r.data.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        {r.data.map((d: Record<string, unknown>, di: number) => (
                          <div
                            key={di}
                            className="rounded-[10px] p-3 bg-muted/60 border border-border"
                          >
                            <span className="text-[10px] uppercase tracking-wider block text-muted-foreground mb-1">
                              {d.label as string}
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {d.val as string}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Insight */}
                    {r.insight && (
                      <div className="rounded-[10px] p-3 flex items-start gap-2 bg-purple-500/10 border border-purple-500/20">
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                        <p className="text-xs text-foreground leading-relaxed">
                          {r.insight as string}
                        </p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] mt-3 text-muted-foreground">
                      {new Date(report.timestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {!reportLoading && reportHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3 bg-purple-500/10">
                <FileBarChart className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No reports yet
              </p>
              <p className="text-xs text-muted-foreground">
                Click a preset above or ask a custom question
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
