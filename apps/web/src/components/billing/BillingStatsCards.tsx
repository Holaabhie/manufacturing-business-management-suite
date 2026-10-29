"use client";

import { useTranslations } from "next-intl";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios";
import type { BillingStats } from "./types";

interface BillingStatsCardsProps {
  stats: BillingStats;
  dateLocale: string;
}

export function BillingStatsCards({ stats, dateLocale }: BillingStatsCardsProps) {
  const t = useTranslations("billing");

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <IOSCard
        variant="elevated"
        className="!bg-gradient-to-br from-[var(--erp-success)]/10 to-[var(--erp-success)]/5 dark:from-[var(--erp-success)]/20 dark:to-[var(--erp-success)]/10 border border-[var(--erp-success)]/20"
      >
        <IOSCardHeader
          title={t("cardTotalInvoiced")}
          className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--erp-success)] pb-0"
        />
        <IOSCardContent className="pt-2">
          <div className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">
            {"\u20B9"}{stats.totalValue.toLocaleString(dateLocale)}
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">
            {t("invoicesGenerated", { count: stats.total })}
          </p>
        </IOSCardContent>
      </IOSCard>

      <IOSCard variant="elevated">
        <IOSCardHeader
          title={t("cardPaid")}
          className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--muted-foreground)] pb-0"
        />
        <IOSCardContent className="pt-2">
          <div className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">
            {stats.paid}
          </div>
          <p className="text-[13px] text-[var(--erp-success)] font-medium mt-1">
            {t("collected", { amount: stats.paidValue.toLocaleString(dateLocale) })}
          </p>
        </IOSCardContent>
      </IOSCard>

      <IOSCard variant="elevated">
        <IOSCardHeader
          title={t("cardPending")}
          className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--erp-warning)] pb-0"
        />
        <IOSCardContent className="pt-2">
          <div className="text-[28px] font-bold tracking-tight text-[var(--erp-warning)]">
            {stats.sent}
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">
            {t("awaitingPayment")}
          </p>
        </IOSCardContent>
      </IOSCard>

      <IOSCard variant="elevated">
        <IOSCardHeader
          title={t("cardDrafts")}
          className="[&_h3]:text-[11px] [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-[var(--muted-foreground)] pb-0"
        />
        <IOSCardContent className="pt-2">
          <div className="text-[28px] font-bold tracking-tight text-[var(--muted-foreground)]">
            {stats.draft}
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">
            {t("readyToSend")}
          </p>
        </IOSCardContent>
      </IOSCard>
    </div>
  );
}

