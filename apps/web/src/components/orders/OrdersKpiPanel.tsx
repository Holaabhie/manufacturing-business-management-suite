"use client";

import React from "react";
import { Box, IndianRupee, AlertCircle, CheckCircle2 } from "lucide-react";
import { StatWidget } from "@/components/ui/StatWidget";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import type { OrderStats } from "./types";

interface OrdersKpiPanelProps {
  stats: OrderStats;
}

export function OrdersKpiPanel({ stats }: OrdersKpiPanelProps) {
  const t = useTranslations("orders");
  const { formatINR } = useFormatters();

  return (
    <div className="kpi-panel">
      <div className="kpi-panel__glow"></div>
      <div className="kpi-grid">
        <StatWidget
          label={t("kpi.totalOrders")}
          value={stats.total}
          change={0}
          icon={Box}
          color="blue"
          delay={0}
        />
        <StatWidget
          label={t("kpi.totalRevenue")}
          value={stats.revenue}
          displayValue={formatINR(stats.revenue)}
          change={0}
          icon={IndianRupee}
          color="green"
          delay={1}
        />
        <StatWidget
          label={t("kpi.pendingPayment")}
          value={stats.pendingPayment}
          change={0}
          icon={AlertCircle}
          color="orange"
          delay={2}
        />
        <StatWidget
          label={t("kpi.completed")}
          value={stats.completed}
          change={0}
          icon={CheckCircle2}
          color="green"
          delay={3}
        />
      </div>
    </div>
  );
}
