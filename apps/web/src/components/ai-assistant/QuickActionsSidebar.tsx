"use client";

import {
  OrdersIcon,
  InventoryIcon,
  PaymentsIcon,
  ProductionIcon,
  AnalyticsIcon,
  SparklesIcon,
} from "./icons";

// ─── Quick Action Definitions ────────────────────────────────
interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "qa-orders",
    label: "Orders Status",
    prompt: "मेरे सभी pending orders का status बताओ।",
    icon: OrdersIcon,
    color: "#2563EB",
  },
  {
    id: "qa-inventory",
    label: "Inventory Check",
    prompt: "कौनसे items का stock कम है? Low inventory alert दो।",
    icon: InventoryIcon,
    color: "#059669",
  },
  {
    id: "qa-payments",
    label: "Payment Summary",
    prompt: "इस month की payment summary बताओ — collected vs outstanding।",
    icon: PaymentsIcon,
    color: "#D97706",
  },
  {
    id: "qa-production",
    label: "Production Status",
    prompt: "Production line की current efficiency और pending jobs बताओ।",
    icon: ProductionIcon,
    color: "#7C3AED",
  },
  {
    id: "qa-analytics",
    label: "Revenue Report",
    prompt: "इस month का revenue analysis दो — top products और growth trend।",
    icon: AnalyticsIcon,
    color: "#DC2626",
  },
  {
    id: "qa-insights",
    label: "Business Insights",
    prompt: "मेरे business के लिए top 3 actionable insights बताओ।",
    icon: SparklesIcon,
    color: "#0891B2",
  },
];

// ─── Component ───────────────────────────────────────────────
interface QuickActionsSidebarProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActionsSidebar({
  onAction,
  disabled,
}: QuickActionsSidebarProps) {
  return (
    <aside className="hidden lg:flex w-56 flex-col border-r border-black/[0.06] dark:border-white/[0.06] bg-white/72 dark:bg-[#161B27] overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Quick Actions
        </p>
      </div>

      {/* Actions */}
      <nav className="flex-1 px-3 pb-4 space-y-1">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              id={action.id}
              onClick={() => onAction(action.prompt)}
              disabled={disabled}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${action.color}14` }}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: action.color }}
                />
              </div>
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Quick action पर tap करें — prompt auto-fill होगा
        </p>
      </div>
    </aside>
  );
}
