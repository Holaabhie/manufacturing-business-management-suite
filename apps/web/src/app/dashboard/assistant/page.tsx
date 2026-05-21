"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Sparkles,
  Trash2,
  History,
  MessageSquare,
  FileBarChart,
  Settings,
  WifiOff,
  Send,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
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
    <div className="ai-workspace h-[calc(100vh-140px)] flex flex-col rounded-2xl overflow-hidden">
      {/* ═══════════ PREMIUM HEADER ═══════════ */}
      <div className="ai-header flex-shrink-0 mb-4 mx-0">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-3 text-white mb-1">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
                  boxShadow: "0 6px 20px rgba(139, 92, 246, 0.3)",
                }}
              >
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <span>AI Assistant</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34D399",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    Powered by Gemini
                  </span>
                  {isContextLoaded ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400">
                      <WifiOff className="h-3 w-3" /> Loading…
                    </span>
                  )}
                </div>
              </div>
            </h1>

            {/* Mode Toggle */}
            <div
              className="flex mt-3 gap-1 rounded-[10px] p-0.5 w-fit"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={() => setViewMode("chat")}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  viewMode === "chat"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </button>
              <button
                onClick={() => setViewMode("reports")}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  viewMode === "reports"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <FileBarChart className="h-3.5 w-3.5" /> Smart Reports
              </button>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex gap-2 items-center">
            {viewMode === "chat" && (
              <>
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" /> Clear
                </button>
                {userMessageCount > 0 && (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA" }}
                  >
                    <History className="h-3 w-3" /> {userMessageCount} msgs
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ CHAT VIEW ═══════════ */}
      {viewMode === "chat" && (
        <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
          {/* ── Left: Conversation Stream ── */}
          <div className="flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden" style={{ background: "var(--ai-bg-secondary)" }}>
            {/* AI Not Configured Banner */}
            {aiNotConfigured && (
              <div className="flex items-center gap-3 mx-4 mt-4 p-3 rounded-[14px] border border-[var(--ai-border-subtle)]" style={{ background: "rgba(245,158,11,0.06)" }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
                  <Settings className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ai-text-primary)]">AI not configured</p>
                  <p className="text-[11px] text-[var(--ai-text-tertiary)]">Contact your admin to set up the Gemini API key.</p>
                </div>
              </div>
            )}

            {/* Messages Stream */}
            <ScrollArea className="flex-1 px-4 pt-4" ref={scrollRef}>
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
            </ScrollArea>

            {/* Input Bar */}
            <SmartInputBar
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={isLoading}
            />
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
