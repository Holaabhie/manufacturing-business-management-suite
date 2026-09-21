"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Check,
  X,
  Loader2,
  Sparkles,
  Zap,
  Users,
  BarChart3,
  Download,
  Package,
  ShoppingCart,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Bot,
  ShieldCheck,
  Building2,
  Clock,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import {
  IOSCard,
  IOSButton,
  IOSBadge
} from "@/components/ui/ios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PLAN_LIMITS } from "@/lib/entitlements/limits";

// Enforced limits on Starter tier across production code
const STARTER_LIMITS = PLAN_LIMITS.starter;

export default function UpgradePage() {
  const t = useTranslations("upgrade");
  const tStarter = useTranslations("upgrade.starter");
  const tPro = useTranslations("upgrade.pro");
  const tHighlights = useTranslations("upgrade.highlights");
  const tTrust = useTranslations("upgrade.trust");
  const tCheckout = useTranslations("upgrade.checkoutModal");
  const tCancel = useTranslations("upgrade.cancelModal");
  const tToasts = useTranslations("upgrade.toasts");

  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Usage counts
  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [clientsCount, setClientsCount] = useState<number>(0);

  // Billing toggle: 'yearly' (default, with savings) or 'monthly'
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");

  // Upgrade placeholder dialog
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Cancel subscription dialog (for active Pro users)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user session
      const resUser = await fetch("/api/auth/me");
      const userData = await resUser.json();
      const currentUser = userData?.user || userData;
      setUser(currentUser);

      const userId = currentUser?._id || currentUser?.id;

      // 2. Fetch subscription status & real usage data in parallel
      const [subRes, invRes, ordRes, cliRes] = await Promise.all([
        userId ? fetch(`/api/stripe/subscription?userId=${userId}`).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
        fetch("/api/inventory").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/orders").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/clients").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (subRes) setSubscription(subRes);
      if (Array.isArray(invRes)) setInventoryCount(invRes.filter((i: any) => i.is_sample !== true).length);
      if (Array.isArray(ordRes)) setOrdersCount(ordRes.filter((o: any) => o.is_sample !== true).length);
      if (Array.isArray(cliRes)) setClientsCount(cliRes.filter((c: any) => c.is_sample !== true).length);
    } catch (error) {
      console.error("Error fetching upgrade page data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (immediately = false) => {
    if (!user) return;
    setCanceling(true);
    try {
      const userId = user._id || user.id;
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cancelImmediately: immediately,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tToasts("cancelFailed"));
      }

      toast.success(
        immediately
          ? tToasts("cancelImmediateSuccess")
          : tToasts("cancelPeriodEndSuccess")
      );
      setCancelDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || tToasts("cancelFailed"));
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-[14px] text-[var(--muted-foreground)]">{t("loading")}</p>
      </div>
    );
  }

  // Tier resolution (strictly from auth/me user.subscription_tier)
  const userTier = user?.subscription_tier || "starter";
  const isPro = userTier === "pro";

  // Pricing calculations
  const monthlyPrice = 999;
  const yearlyPrice = 9999;
  const yearlyMonthlyEquivalent = 833; // Math.round(9999 / 12)
  const yearlySavings = 1989; // (12 * 999) - 9999

  const activeProPrice = billingInterval === "yearly" ? yearlyMonthlyEquivalent : monthlyPrice;
  const activeProBilledText = billingInterval === "yearly"
    ? t("billedAnnually", { price: yearlyPrice.toLocaleString("en-IN"), savings: yearlySavings.toLocaleString("en-IN") })
    : t("billedMonthly");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 w-full min-w-0 overflow-x-hidden"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header section with profile return */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard/profile" aria-label={t("backToProfile")}>
            <IOSButton
              variant="plain"
              className="w-[42px] h-[42px] rounded-full p-0 flex items-center justify-center border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--primary)]" />
            </IOSButton>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold tracking-wider uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full">
                {t("badgePlans")}
              </span>
              {isPro && (
                <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {t("badgeProActive")}
                </span>
              )}
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[var(--foreground)] mt-1">
              {t("title")}
            </h1>
          </div>
        </div>

        {/* Monthly / Yearly Billing Toggle */}
        <div className="flex items-center bg-[var(--muted)] p-1 rounded-full border border-[var(--border)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200",
              billingInterval === "monthly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {t("toggleMonthly")}
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 flex items-center gap-1.5",
              billingInterval === "yearly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <span>{t("toggleAnnually")}</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {t("savePercent")}
            </span>
          </button>
        </div>
      </div>

      {/* Subscription ending notification banner for scheduled cancellations */}
      {isPro && subscription?.cancelAtPeriodEnd && (
        <IOSCard className="border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-amber-700 dark:text-amber-400">
                {t("subscriptionEnding.title")}
              </h3>
              <p className="text-[14px] text-amber-800/80 dark:text-amber-300/80">
                {t("subscriptionEnding.description", {
                  date: subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : t("subscriptionEnding.periodEndFallback")
                })}
              </p>
            </div>
          </div>
        </IOSCard>
      )}

      {/* Plan Cards Grid: side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
        
        {/* ── 1. STARTER PLAN CARD ── */}
        <div className="min-w-0 w-full overflow-hidden flex flex-col">
          <IOSCard
            className={cn(
              "h-full flex flex-col relative border transition-all duration-200 p-6 sm:p-7",
              !isPro
                ? "border-[var(--primary)]/40 shadow-[0_4px_24px_rgba(37,99,235,0.08)] bg-[var(--card)]"
                : "border-[var(--border)] bg-[var(--card)]/80"
            )}
          >
            {!isPro && (
              <div className="absolute top-0 right-0 bg-[var(--primary)] text-white text-[11px] font-bold px-3 py-1 rounded-bl-[14px]">
                {tStarter("currentBadge")}
              </div>
            )}

            {/* Plan Title & Subtitle */}
            <div className="mb-5">
              <div className="w-12 h-12 rounded-[16px] bg-[var(--muted)] flex items-center justify-center mb-4 text-[var(--foreground)]">
                <Package className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <h2 className="text-[24px] font-bold text-[var(--foreground)]">{tStarter("title")}</h2>
              <p className="text-[14px] text-[var(--muted-foreground)] mt-1">
                {tStarter("subtitle")}
              </p>
            </div>

            {/* Price block */}
            <div className="mb-6 pb-6 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-1">
                <span className="text-[38px] font-bold text-[var(--foreground)]">₹0</span>
                <span className="text-[15px] text-[var(--muted-foreground)]">{t("perMonth")}</span>
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)] mt-1">{t("freeForever")}</p>
            </div>

            {/* ── Active Usage Indicators (Shown for Starter users) ── */}
            <div className="mb-6 p-4 rounded-[16px] bg-[var(--muted)]/60 border border-[var(--border)] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted-foreground)]">
                  {tStarter("usageTitle")}
                </span>
                <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                  {tStarter("usageEnforced")}
                </span>
              </div>

              {/* Usage item: Inventory */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> {tStarter("inventoryItems")}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    inventoryCount >= STARTER_LIMITS.inventory ? "text-red-500" : "text-[var(--foreground)]"
                  )}>
                    {inventoryCount} / {STARTER_LIMITS.inventory}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      inventoryCount >= STARTER_LIMITS.inventory ? "bg-red-500" : inventoryCount >= 4 ? "bg-amber-500" : "bg-[var(--primary)]"
                    )}
                    style={{ width: `${Math.min(100, Math.round((inventoryCount / STARTER_LIMITS.inventory) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Usage item: Orders */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> {tStarter("productionOrders")}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    ordersCount >= STARTER_LIMITS.orders ? "text-red-500" : "text-[var(--foreground)]"
                  )}>
                    {ordersCount} / {STARTER_LIMITS.orders}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      ordersCount >= STARTER_LIMITS.orders ? "bg-red-500" : ordersCount >= 4 ? "bg-amber-500" : "bg-[var(--primary)]"
                    )}
                    style={{ width: `${Math.min(100, Math.round((ordersCount / STARTER_LIMITS.orders) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Usage item: Clients */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> {tStarter("crmClients")}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    clientsCount >= STARTER_LIMITS.clients ? "text-red-500" : "text-[var(--foreground)]"
                  )}>
                    {clientsCount} / {STARTER_LIMITS.clients}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      clientsCount >= STARTER_LIMITS.clients ? "bg-red-500" : clientsCount >= 4 ? "bg-amber-500" : "bg-[var(--primary)]"
                    )}
                    style={{ width: `${Math.min(100, Math.round((clientsCount / STARTER_LIMITS.clients) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-3.5 flex-1 mb-8">
              <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted-foreground)] block">
                {tStarter("includedTitle")}
              </span>
              
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{tStarter("featInventory")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{tStarter("featOrders")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{tStarter("featClients")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{tStarter("featTeam")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{tStarter("featReports")}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-2.5">
                  <div className="flex items-start gap-2.5 text-[14px] text-[var(--muted-foreground)]">
                    <X className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                    <span className="line-through opacity-80">{tStarter("exclUnlimited")}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[14px] text-[var(--muted-foreground)]">
                    <X className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                    <span className="line-through opacity-80">{tStarter("exclAI")}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[14px] text-[var(--muted-foreground)]">
                    <X className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                    <span className="line-through opacity-80">{tStarter("exclExport")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-auto">
              <IOSButton
                variant="gray"
                className="w-full h-[48px] text-[15px] font-semibold text-[var(--muted-foreground)] bg-[var(--muted)] border border-[var(--border)] cursor-default opacity-85"
                disabled
              >
                {!isPro ? tStarter("btnCurrent") : tStarter("btnIncluded")}
              </IOSButton>
            </div>
          </IOSCard>
        </div>

        {/* ── 2. PRO PLAN CARD ── */}
        <div className="min-w-0 w-full overflow-hidden flex flex-col">
          <IOSCard
            className={cn(
              "h-full flex flex-col relative border-2 transition-all duration-200 p-6 sm:p-7",
              "border-indigo-500/40 dark:border-indigo-500/50 shadow-[0_8px_32px_rgba(99,102,241,0.12)] bg-[var(--card)]"
            )}
          >
            {/* "Most Popular" Accent Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-bl-[14px] flex items-center gap-1 shadow-sm">
              <Sparkles className="h-3 w-3" />
              {tPro("popularBadge")}
            </div>

            {/* Plan Title & Subtitle */}
            <div className="mb-5">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-4 text-white shadow-md shadow-indigo-500/20">
                <Crown className="h-6 w-6" />
              </div>
              <h2 className="text-[24px] font-bold text-[var(--foreground)] flex items-center gap-2">
                {tPro("title")}
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {tPro("badgeFullPower")}
                </span>
              </h2>
              <p className="text-[14px] text-[var(--muted-foreground)] mt-1">
                {tPro("subtitle")}
              </p>
            </div>

            {/* Price block */}
            <div className="mb-6 pb-6 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-1">
                <span className="text-[38px] font-bold text-[var(--foreground)]">
                  ₹{activeProPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[15px] text-[var(--muted-foreground)]">{t("perMonth")}</span>
              </div>
              <p className="text-[13px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                {activeProBilledText}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-4 flex-1 mb-8">
              <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted-foreground)] block">
                {tPro("includedTitle")}
              </span>

              {/* Actively enforced Pro features */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featInventory")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featOrders")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featClients")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featAI")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featAnalytics")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featExport")}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[14px] text-[var(--foreground)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{tPro("featTeam")}</span>
                </div>
              </div>

              {/* ── Coming Soon Subsection (Visually Separated) ── */}
              <div className="pt-3.5 border-t border-[var(--border)] mt-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold tracking-wide uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {tPro("comingSoonTitle")}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-[13px] text-[var(--muted-foreground)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 mt-1.5 flex-shrink-0" />
                    <span>{tPro("comingSoonBrand")}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[13px] text-[var(--muted-foreground)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 mt-1.5 flex-shrink-0" />
                    <span>{tPro("comingSoonSla")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-auto">
              {isPro ? (
                <IOSButton
                  variant="gray"
                  className="w-full h-[48px] text-[15px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={subscription?.cancelAtPeriodEnd}
                >
                  {subscription?.cancelAtPeriodEnd
                    ? tPro("btnCancelScheduled")
                    : tPro("btnManage")}
                </IOSButton>
              ) : (
                <IOSButton
                  variant="filled"
                  className="w-full h-[48px] text-[15px] font-bold bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 border-0 flex items-center justify-center gap-2"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Zap className="h-4 w-4" />
                  {tPro("btnUpgrade")}
                </IOSButton>
              )}
            </div>
          </IOSCard>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <IOSCard className="border-[var(--border)] p-6 sm:p-8 bg-[var(--card)]">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[var(--foreground)]">
            {tHighlights("title")}
          </h3>
          <p className="text-[14px] text-[var(--muted-foreground)] mt-1">
            {tHighlights("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2.5 p-4 rounded-[16px] bg-[var(--muted)]/50 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-[12px] bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
            <h4 className="text-[16px] font-bold text-[var(--foreground)]">{tHighlights("card1Title")}</h4>
            <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              {tHighlights("card1Desc")}
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-[16px] bg-[var(--muted)]/50 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-[12px] bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h4 className="text-[16px] font-bold text-[var(--foreground)]">{tHighlights("card2Title")}</h4>
            <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              {tHighlights("card2Desc")}
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-[16px] bg-[var(--muted)]/50 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h4 className="text-[16px] font-bold text-[var(--foreground)]">{tHighlights("card3Title")}</h4>
            <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              {tHighlights("card3Desc")}
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-[16px] bg-[var(--muted)]/50 border border-[var(--border)]">
            <div className="w-10 h-10 rounded-[12px] bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Bot className="h-5 w-5" />
            </div>
            <h4 className="text-[16px] font-bold text-[var(--foreground)]">{tHighlights("card4Title")}</h4>
            <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              {tHighlights("card4Desc")}
            </p>
          </div>
        </div>
      </IOSCard>

      {/* Trust & Reassurance Footer */}
      <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-[13px] text-[var(--muted-foreground)] text-center px-4 py-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" /> {tTrust("cancelAnytime")}
        </span>
        <span className="inline-block w-1 h-1 rounded-full bg-[var(--border)]" />
        <span>{tTrust("instantActivation")}</span>
        <span className="inline-block w-1 h-1 rounded-full bg-[var(--border)]" />
        <span>{tTrust("transparentPricing")}</span>
        <span className="inline-block w-1 h-1 rounded-full bg-[var(--border)]" />
        <span>{tTrust("noHiddenFees")}</span>
      </div>

      {/* ── Placeholder Upgrade Confirmation Dialog (Phase 2 Roadmap) ── */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent fullScreenMobile className="sm:max-w-[460px] p-6 bg-[var(--card)] border border-[var(--border)] rounded-[24px]">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-3 text-white shadow-md shadow-indigo-500/20">
              <Crown className="h-6 w-6" />
            </div>
            <DialogTitle className="text-[20px] font-bold text-[var(--foreground)]">
              {tCheckout("title", { interval: billingInterval === "yearly" ? tCheckout("intervalYearly") : tCheckout("intervalMonthly") })}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[var(--muted-foreground)] mt-1.5">
              {tCheckout("subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 p-4 rounded-[16px] bg-[var(--muted)]/70 border border-[var(--border)] space-y-3">
            <div className="flex justify-between items-center text-[14px]">
              <span className="text-[var(--muted-foreground)]">{tCheckout("selectedPlan")}</span>
              <span className="font-semibold text-[var(--foreground)]">
                {billingInterval === "yearly" ? tCheckout("tierYearly") : tCheckout("tierMonthly")}
              </span>
            </div>
            <div className="flex justify-between items-center text-[14px]">
              <span className="text-[var(--muted-foreground)]">{tCheckout("planAmount")}</span>
              <span className="font-bold text-[var(--foreground)]">
                ₹{billingInterval === "yearly" ? yearlyPrice.toLocaleString("en-IN") : monthlyPrice.toLocaleString("en-IN")}
                <span className="text-[12px] font-normal text-[var(--muted-foreground)] ml-1">
                  {billingInterval === "yearly" ? t("perYear") : t("perMonth")}
                </span>
              </span>
            </div>
            {billingInterval === "yearly" && (
              <div className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                {tCheckout("discountNotice", { savings: yearlySavings.toLocaleString("en-IN") })}
              </div>
            )}
          </div>

          <div className="p-4 rounded-[16px] bg-blue-500/10 border border-blue-500/20 text-[13px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Info className="h-4 w-4 flex-shrink-0" />
              {tCheckout("gatewayTitle")}
            </p>
            {tCheckout("gatewayDesc")}
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <IOSButton
              variant="gray"
              className="w-full h-[44px] text-[14px] font-semibold"
              onClick={() => setShowUpgradeModal(false)}
            >
              {tCheckout("btnGotIt")}
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Subscription Dialog (Preserved for existing Pro users) ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent fullScreenMobile className="sm:max-w-[440px] p-6 bg-[var(--card)] border border-[var(--border)] rounded-[24px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[20px] font-bold text-[var(--foreground)]">
              {tCancel("title")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[var(--muted-foreground)] mt-1.5">
              {tCancel("subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-[16px] bg-[var(--muted)]/60 border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="font-semibold text-[14px] text-[var(--foreground)]">{tCancel("optPeriodEndTitle")}</span>
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {tCancel("optPeriodEndDesc", {
                  date: subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : t("subscriptionEnding.periodEndFallback")
                })}
              </p>
              <IOSButton
                variant="gray"
                className="w-full mt-2 h-[42px] text-[14px] font-semibold"
                onClick={() => handleCancel(false)}
                disabled={canceling}
              >
                {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tCancel("btnCancelPeriodEnd")}
              </IOSButton>
            </div>

            <div className="p-4 rounded-[16px] border border-red-500/20 bg-red-500/5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-semibold text-[14px] text-red-500">{tCancel("optImmediateTitle")}</span>
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {tCancel("optImmediateDesc")}
              </p>
              <IOSButton
                variant="destructive"
                className="w-full mt-2 h-[42px] text-[14px] font-semibold"
                onClick={() => handleCancel(true)}
                disabled={canceling}
              >
                {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tCancel("btnCancelImmediate")}
              </IOSButton>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <IOSButton
              variant="plain"
              className="w-full h-[44px] text-[14px] font-semibold text-[var(--primary)]"
              onClick={() => setCancelDialogOpen(false)}
              disabled={canceling}
            >
              {tCancel("btnKeep")}
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
