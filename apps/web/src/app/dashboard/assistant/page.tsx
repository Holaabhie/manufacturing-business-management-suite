"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Settings,
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
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

// ── AI Components (untouched internals) ──
import { AIThinkingLoader } from "@/components/ai/AIThinkingLoader";
import { SmartInputBar } from "@/components/ai/SmartInputBar";
import { ResponseCard } from "@/components/ai/ResponseCard";
import { UserMessageCard } from "@/components/ai/UserMessageCard";
import { MobileSheet } from "@/components/ui/MobileSheet";

// ── Hook (untouched chat logic) ──
import { useAIChat } from "@/hooks/useAIChat";

// ─── 5 Category Cards (Analytics, Inventory, Clients, Payments, Orders) ──
const CATEGORY_CARDS = [
  {
    id: "analytics",
    titleKey: "cardAnalyticsTitle",
    descKey: "cardAnalyticsDesc",
    promptKey: "cardAnalyticsPrompt",
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
    titleKey: "cardInventoryTitle",
    descKey: "cardInventoryDesc",
    promptKey: "cardInventoryPrompt",
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
    titleKey: "cardClientsTitle",
    descKey: "cardClientsDesc",
    promptKey: "cardClientsPrompt",
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
    titleKey: "cardPaymentsTitle",
    descKey: "cardPaymentsDesc",
    promptKey: "cardPaymentsPrompt",
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
    titleKey: "cardOrdersTitle",
    descKey: "cardOrdersDesc",
    promptKey: "cardOrdersPrompt",
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
    labelKey: "promptRevenue",
    label: "Show revenue summary",
    prompt: "Give me a summary of my revenue for this month including total collected, pending, and growth trends.",
  },
  {
    labelKey: "promptLowStock",
    label: "Which items have low stock?",
    prompt: "Which inventory items are running low and need to be restocked soon?",
  },
  {
    labelKey: "promptPendingOrders",
    label: "Pending orders status",
    prompt: "What is the status of all pending and in-progress orders?",
  },
  {
    labelKey: "promptOutstandingPayments",
    label: "Outstanding payments this month",
    prompt: "List all clients with outstanding payments and the amounts due.",
  },
  {
    labelKey: "promptProductionEfficiency",
    label: "Production efficiency report",
    prompt: "How efficient is my production? Show order completion rate, average delivery time, and bottlenecks.",
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

// ─── Recent Insights (Static Placeholder — TODO: connect to live stats API) ──
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const welcomeText = t("welcomeTitle", { appName: "IND Manager" });

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* ════════════════ SLIM PAGE HEADING ROW ════════════════ */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {t("pageTitle")}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("badgeLive")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            {t("pageSubtitle")}
          </p>
        </div>

        {/* Right zone: Mobile drawer trigger + New Chat Action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile-only Quick Actions & Insights Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-[12px] font-medium transition-colors shadow-sm cursor-pointer"
            title={t("titleActionsInsights")}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{t("btnActionsInsights")}</span>
          </button>

          {userMessageCount > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-muted-foreground text-[12px] font-medium transition-all cursor-pointer"
              title={t("titleNewChat")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("btnNewChat")}</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
        {/* ── Left / Primary Scrollable Column ── */}
        <div className="flex-1 min-w-0 space-y-6 pb-40 lg:pb-6">
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

          {/* Welcome Card + Category Cards (shown when userMessageCount === 0) */}
          {userMessageCount === 0 && (
            <div className="space-y-6">
              {/* Welcome Card (Clean text-only, no icon, no emoji) */}
              <div className="rounded-[20px] p-5 sm:p-6 bg-card border border-border shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug">
                  {welcomeText.includes("IND Manager") ? (
                    <>
                      {welcomeText.split("IND Manager")[0]}
                      <span className="text-primary">IND Manager</span>
                      {welcomeText.split("IND Manager")[1]}
                    </>
                  ) : (
                    welcomeText
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t("welcomeDesc")}
                </p>
              </div>

              {/* 5 Category Cards Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                  {t("businessModules")}
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
                            {card.titleKey ? t(card.titleKey as any) : card.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {card.descKey ? t(card.descKey as any) : card.description}
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
                  {t("tryAsking")}
                </p>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {SUGGESTION_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ease-out cursor-pointer bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm"
                    >
                      {item.labelKey ? t(item.labelKey as any) : item.label}
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
                        message={t("loaderAnalyzing")}
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

          {/* Pinned/Fixed Chat Input Bar (Mobile fixed above bottom nav, Desktop sticky) */}
          <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 lg:sticky lg:bottom-0 lg:left-auto lg:right-auto lg:z-10 bg-card/95 backdrop-blur-xl border border-border rounded-[20px] p-2 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title={t("tooltipAttach")}
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
                title={t("tooltipQuickPrompts")}
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
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
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
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
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
