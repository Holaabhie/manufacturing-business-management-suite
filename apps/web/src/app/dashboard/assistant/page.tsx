"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  BarChart3,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

// ── AI Components ──
import { ThinkingIndicator } from "@/components/ai/ThinkingIndicator";
import { AIMark } from "@/components/ai/AIMark";
import { SmartInputBar } from "@/components/ai/SmartInputBar";
import { ResponseCard } from "@/components/ai/ResponseCard";
import { UserMessageCard } from "@/components/ai/UserMessageCard";
import { MobileSheet } from "@/components/ui/MobileSheet";

// ── Hook (untouched chat logic) ──
import { useAIChat } from "@/hooks/useAIChat";

// ─── 4 Compact Suggestion Chips ─────────────────────────────
const SUGGESTION_CHIPS = [
  {
    key: "chipOrders",
    prompt: "What is the status of today's orders and pending fulfillment?",
  },
  {
    key: "chipStock",
    prompt: "Which inventory items are running low and need to be restocked soon?",
  },
  {
    key: "chipPayments",
    prompt: "List all pending payments and total outstanding balance.",
  },
  {
    key: "chipProduction",
    prompt: "How is production running? Show active jobs and bottlenecks.",
  },
];

// ─── Quick Actions (wired to real routes) ────────────────────
const QUICK_ACTIONS = [
  {
    id: "orders",
    labelKey: "actionViewPendingOrders",
    label: "View Pending Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    color: "#2563EB",
  },
  {
    id: "inventory",
    labelKey: "actionCheckInventory",
    label: "Check Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    color: "#059669",
  },
  {
    id: "sales",
    labelKey: "actionViewSalesReport",
    label: "View Sales Report",
    href: "/dashboard/analytics",
    icon: BarChart3,
    color: "#D97706",
  },
  {
    id: "clients",
    labelKey: "actionAddNewClient",
    label: "Add New Client",
    href: "/dashboard/clients",
    icon: Users,
    color: "#7C3AED",
  },
  {
    id: "payments",
    labelKey: "actionRecordPayment",
    label: "Record Payment",
    href: "/dashboard/payments",
    icon: CreditCard,
    color: "#DC2626",
  },
];

// ─── Recent Insights (Static Placeholder) ───────────────────
const RECENT_INSIGHTS = [
  {
    id: "insight-revenue",
    titleKey: "insightRevenueTitle",
    descKey: "insightRevenueDesc",
    headline: "Revenue +12.5%",
    subtext: "Monthly collection pacing 12.5% ahead of previous cycle.",
    icon: TrendingUp,
    color: "#059669",
  },
  {
    id: "insight-stock",
    titleKey: "insightStockTitle",
    descKey: "insightStockDesc",
    headline: "3 Low Stock Items",
    subtext: "Raw material stock is below safety replenishment buffer.",
    icon: AlertTriangle,
    color: "#D97706",
  },
  {
    id: "insight-production",
    titleKey: "insightProductionTitle",
    descKey: "insightProductionDesc",
    headline: "8 Orders In Production",
    subtext: "All manufacturing lines running with 94% on-time completion.",
    icon: Clock,
    color: "#7C3AED",
  },
];

// ─── Main Component ─────────────────────────────────────────
export default function AIAssistantPage() {
  const router = useRouter();
  const t = useTranslations("assistant");

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(60);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  // ── Measure composer height with ResizeObserver ──
  useEffect(() => {
    if (!composerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setComposerHeight(Math.round(entry.contentRect.height));
        }
      }
    });
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, []);

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

  return (
    <div className="space-y-4 w-full min-w-0 overflow-x-hidden">
      {/* ════════════════ SLIM PAGE HEADING ROW (Clean, Stable) ════════════════ */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
        {/* Left zone: Title + Live badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground whitespace-nowrap">
                {t("pageTitle")}
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("badgeLive")}
              </span>
            </div>
            <p className="hidden md:block text-xs text-muted-foreground mt-0.5 truncate">
              {t("pageSubtitle")}
            </p>
          </div>
        </div>

        {/* Right zone: Two 40px icon-only buttons ALWAYS (never shifts between states) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={clearChat}
            disabled={userMessageCount === 0}
            aria-label={t("btnNewChat")}
            title={t("titleNewChat")}
            className={cn(
              "w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center transition-all",
              userMessageCount > 0
                ? "hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-muted-foreground cursor-pointer shadow-xs"
                : "opacity-30 cursor-not-allowed text-muted-foreground pointer-events-none"
            )}
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Quick Actions & Insights Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={t("btnActionsInsights")}
            title={t("titleActionsInsights")}
            className="w-10 h-10 rounded-xl border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Zap className="h-4 w-4 text-amber-500" />
          </button>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
        {/* ── Left / Primary Column with Dynamic Clearance ── */}
        <div
          className="flex-1 min-w-0 space-y-4 lg:!pb-6"
          style={{
            paddingBottom: `calc(${composerHeight}px + 4.5rem + env(safe-area-inset-bottom, 0px) + 16px)`,
          }}
        >
          {/* AI Not Configured Banner */}
          {aiNotConfigured && (
            <div className="flex items-center gap-3 p-4 rounded-[16px] border border-amber-500/20 bg-amber-500/10">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-amber-500/20">
                <Settings className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t("notConfiguredTitle")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("notConfiguredDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Compact Empty State (shown ONLY when userMessageCount === 0) */}
          {userMessageCount === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 px-4 max-w-md mx-auto">
              <AIMark size={48} className="mb-3.5" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {t("emptyHeading")}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6 max-w-[280px] sm:max-w-none leading-relaxed">
                {t("emptySubheading")}
              </p>

              {/* 4 small suggestion chips (2x2 grid, ~38px height, one line each) */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => handleSend(chip.prompt)}
                    className="h-10 px-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 text-xs font-medium text-foreground transition-all duration-150 flex items-center justify-center text-center shadow-xs cursor-pointer truncate"
                  >
                    <span className="truncate">{t(chip.key as any)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Message Stream */}
          {userMessageCount > 0 && (
            <div className="space-y-3.5 pb-2">
              <AnimatePresence mode="popLayout">
                {messages.map((message, idx) => {
                  if (message.isLoading) {
                    return <ThinkingIndicator key={message.id} />;
                  }

                  if (message.role === "user") {
                    const nextMsgs = messages.slice(idx + 1);
                    const nextUserIdx = nextMsgs.findIndex((m) => m.role === "user");
                    const turnAssistantMsgs = nextUserIdx >= 0 ? nextMsgs.slice(0, nextUserIdx) : nextMsgs;
                    const reply = turnAssistantMsgs.find((m) => m.role === "assistant");
                    const hasReplied = Boolean(reply && !reply.isLoading && !reply.isError && Boolean(reply.content));

                    return (
                      <UserMessageCard
                        key={message.id}
                        content={message.displayedContent ?? message.content}
                        timestamp={message.timestamp}
                        hasReplied={hasReplied}
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

          {/* Fixed Composer (Clean, Minimal, Non-Overlapping) */}
          <div
            ref={composerRef}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-2 sm:px-6 lg:static lg:bg-transparent lg:border-t-0 lg:p-0 lg:z-10"
          >
            <SmartInputBar
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={isLoading}
            />
          </div>

          <div ref={bottomRef} />
        </div>

        {/* ── Right Sidebar: Quick Actions + Recent Insights (Desktop Only) ── */}
        <aside className="hidden lg:flex w-full lg:w-[280px] xl:w-[320px] shrink-0 flex-col gap-4">
          {/* Panel 1: Quick Actions */}
          <div className="rounded-[20px] p-4 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("quickActions")}
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
                        {action.labelKey ? t(action.labelKey as any) : action.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel 2: Recent Insights (Static Placeholder — TODO: connect to live stats API) */}
          <div className="rounded-[20px] p-4 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <AIMark size={18} />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {t("recentInsights")}
                </h3>
              </div>
              <Link
                href="/dashboard/analytics"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>
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
                        {item.titleKey ? t(item.titleKey as any) : item.headline}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {item.descKey ? t(item.descKey as any) : item.subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ═══════════ MOBILE DRAWER (Quick Actions & Recent Insights) ═══════════ */}
      <MobileSheet
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        maxHeight="80dvh"
        maxWidth="480px"
      >
        <div className="p-4 space-y-5">
          {/* Drawer Panel 1: Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("quickActions")}
              </h3>
            </div>
            <div className="space-y-1">
              {QUICK_ACTIONS.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      router.push(action.href);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[12px] hover:bg-muted transition-colors duration-150 text-left group cursor-pointer"
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
                        {action.labelKey ? t(action.labelKey as any) : action.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Panel 2: Recent Insights */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <AIMark size={18} />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {t("recentInsights")}
                </h3>
              </div>
              <Link
                href="/dashboard/analytics"
                onClick={() => setIsDrawerOpen(false)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>
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
                        {item.titleKey ? t(item.titleKey as any) : item.headline}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {item.descKey ? t(item.descKey as any) : item.subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}
