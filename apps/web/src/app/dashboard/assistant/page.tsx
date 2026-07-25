"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Trash2,
  MessageSquare,
  FileBarChart,
  Settings,
  Send,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── AI Components ──
import { AIThinkingLoader } from "@/components/ai/AIThinkingLoader";
import { SmartInputBar } from "@/components/ai/SmartInputBar";
import { ResponseCard } from "@/components/ai/ResponseCard";
import { UserMessageCard } from "@/components/ai/UserMessageCard";
import { BentoWidgetGrid } from "@/components/ai/BentoWidgetGrid";

// ── Hook ──
import { useAIChat } from "@/hooks/useAIChat";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Smart Reports State ──
  const [reportQuestion, setReportQuestion] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportEntry[]>([]);

  // ── Auto-scroll ──
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Handlers ──
  const handleSend = (value: string) => {
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

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="ai-workspace flex flex-col h-[calc(100dvh-64px-56px)] md:h-[calc(100dvh-64px)] overflow-hidden">
      {/* Flat topbar — flex-shrink-0 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
        {/* Left: tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "chat"
                ? "bg-gray-200/70 text-gray-900 dark:bg-white/10 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/70"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            onClick={() => setViewMode("reports")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "reports"
                ? "bg-gray-200/70 text-gray-900 dark:bg-white/10 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/70"
            }`}
          >
            <FileBarChart className="h-3.5 w-3.5" />
            Smart Reports
          </button>
        </div>

        {/* Right: READY status + Clear button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", isContextLoaded ? "bg-emerald-400" : "bg-amber-400")} />
            <span className={cn("text-xs font-medium", isContextLoaded ? "text-emerald-400" : "text-amber-400")}>
              {isContextLoaded ? "READY" : "LOADING..."}
            </span>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white/70 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            Clear
          </button>
        </div>
      </div>

      {/* ═══════════ CHAT VIEW ═══════════ */}
      {viewMode === "chat" && (
        <div className="flex-1 flex gap-5 min-h-0">
          {/* ── Left: Conversation Stream ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden rounded-2xl" style={{ background: "var(--ai-bg-secondary)" }}>
            {/* AI Not Configured Banner */}
            {aiNotConfigured && (
              <div className="flex items-center gap-3 mx-4 mt-4 p-3 rounded-[14px] border border-[var(--ai-border-subtle)]" style={{ background: "rgba(245,158,11,0.06)" }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
                  <Settings className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ai-text-primary)]">AI not configured</p>
                  <p className="text-[11px] text-[var(--ai-text-tertiary)]">Contact your admin to set up the AI webhook.</p>
                </div>
              </div>
            )}

            {/* Messages Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3" ref={scrollRef}>
              <div className="space-y-4 pb-4 max-w-4xl mx-auto">
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
            </div>

            {/* Input bar — flex-shrink-0, safe-area padding on mobile */}
            <div className="flex-shrink-0 w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <SmartInputBar
                value={input}
                onChange={setInput}
                onSubmit={handleSend}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* ── Right: Bento Sidebar ── */}
          <div className="w-[320px] flex-shrink-0 hidden xl:block overflow-y-auto pr-1">
            <BentoWidgetGrid
              isContextLoaded={isContextLoaded}
              onQuickAction={(prompt) => {
                sendMessage(prompt);
              }}
              isLoading={isLoading}
              messageCount={userMessageCount}
              onViewReports={() => setViewMode("reports")}
            />
          </div>
        </div>
      )}

      {/* ═══════════ REPORTS VIEW ═══════════ */}
      {viewMode === "reports" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 overflow-y-auto space-y-5 px-1"
        >
          {/* Report Header */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)" }}
            >
              <FileBarChart className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[var(--ai-text-primary)]">
                AI-Powered Analytics
              </p>
              <p className="text-[11px] text-[var(--ai-text-tertiary)]">
                Generate structured business reports with data-backed insights
              </p>
            </div>
          </div>

          {/* Preset Prompts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {REPORT_PROMPTS.map((rp, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendReport(rp.prompt)}
                disabled={reportLoading}
                className="ai-bento-widget text-left disabled:opacity-40"
              >
                <span className="text-[20px] mb-2 block">{rp.icon}</span>
                <span className="text-[13px] font-semibold block text-[var(--ai-text-primary)]">
                  {rp.label}
                </span>
                <span className="text-[10px] mt-1 block text-[var(--ai-text-tertiary)] line-clamp-2">
                  {rp.prompt.substring(0, 60)}...
                </span>
              </motion.button>
            ))}
          </div>

          {/* Custom Question Input */}
          <div
            className="rounded-[14px] p-4"
            style={{ background: "var(--ai-bg-surface)", border: "1px solid var(--ai-border-subtle)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-[var(--ai-text-tertiary)]">
              Ask a Custom Question
            </p>
            <div className="flex gap-2">
              <input
                value={reportQuestion}
                onChange={(e) => setReportQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendReport(reportQuestion); }}
                placeholder="e.g., What's my best performing product category?"
                className="flex-1 h-[40px] rounded-[10px] px-4 text-[13px] outline-none border border-[var(--ai-border-subtle)] bg-[var(--ai-bg-surface-elevated)] text-[var(--ai-text-primary)] placeholder:text-[var(--ai-text-tertiary)] focus:border-[var(--ai-border-focus)] transition-colors"
                disabled={reportLoading}
              />
              <button
                onClick={() => sendReport(reportQuestion)}
                disabled={!reportQuestion.trim() || reportLoading}
                className="flex items-center gap-2 px-4 h-[40px] rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-40 transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                  boxShadow: "0 4px 14px rgba(139,92,246,0.25)",
                }}
              >
                {reportLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-3"
              >
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="ai-user-msg">{report.question}</div>
                </div>

                {/* AI Report Card */}
                <div className="flex gap-3 items-start">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="ai-response-card flex-1">
                    {/* Summary */}
                    {r.summary && (
                      <p className="text-[14px] font-medium mb-4 text-[var(--ai-text-primary)] leading-relaxed">
                        {r.summary as string}
                      </p>
                    )}

                    {/* Data Grid */}
                    {Array.isArray(r.data) && r.data.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        {r.data.map((d: Record<string, unknown>, di: number) => (
                          <div
                            key={di}
                            className="rounded-[10px] p-3"
                            style={{ background: "var(--ai-bg-surface-elevated)", border: "1px solid var(--ai-border-subtle)" }}
                          >
                            <span className="text-[10px] uppercase tracking-wider block text-[var(--ai-text-tertiary)] mb-1">
                              {d.label as string}
                            </span>
                            <span className="text-[18px] font-bold text-[var(--ai-text-primary)]">
                              {d.val as string}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Insight */}
                    {r.insight && (
                      <div
                        className="rounded-[10px] p-3 flex items-start gap-2"
                        style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}
                      >
                        <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-[var(--ai-accent-purple)]" />
                        <p className="text-[12px] text-[var(--ai-text-secondary)] leading-relaxed">
                          {r.insight as string}
                        </p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] mt-3 text-[var(--ai-text-tertiary)]">
                      {new Date(report.timestamp).toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Empty State */}
          {!reportLoading && reportHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3"
                style={{ background: "rgba(139,92,246,0.12)" }}
              >
                <FileBarChart className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-[14px] font-medium text-[var(--ai-text-primary)]">
                No reports yet
              </p>
              <p className="text-[12px] text-[var(--ai-text-tertiary)]">
                Click a preset above or ask a custom question
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
