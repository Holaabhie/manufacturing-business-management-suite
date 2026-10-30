import { IndianRupee, Clock, Truck, PackageCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatWidget } from "@/components/ui/StatWidget";

interface PurchasingStatsCardsProps {
  totalSpend: number;
  pendingCount: number;
  orderedCount: number;
  receivedCount: number;
}

export function PurchasingStatsCards({
  totalSpend,
  pendingCount,
  orderedCount,
  receivedCount,
}: PurchasingStatsCardsProps) {
  const tKpi = useTranslations("purchasing.kpi");

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0 overflow-hidden">
      <StatWidget
        label={tKpi("totalSpent")}
        value={totalSpend}
        displayValue={totalSpend > 0 ? `₹${totalSpend.toLocaleString("en-IN")}` : "₹0"}
        valueTitle={`₹${totalSpend.toLocaleString("en-IN")}`}
        icon={IndianRupee}
        color="blue"
        delay={0}
      />
      <StatWidget
        label={tKpi("pending")}
        value={pendingCount}
        valueTitle={`${pendingCount} pending orders`}
        icon={Clock}
        color="orange"
        delay={0.05}
      />
      <StatWidget
        label={tKpi("inTransit")}
        value={orderedCount}
        valueTitle={`${orderedCount} orders in transit`}
        icon={Truck}
        color="purple"
        delay={0.1}
      />
      <StatWidget
        label={tKpi("received")}
        value={receivedCount}
        valueTitle={`${receivedCount} orders received`}
        icon={PackageCheck}
        color="green"
        delay={0.15}
      />
    </div>
  );
}
