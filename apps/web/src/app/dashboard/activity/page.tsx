"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  IndianRupee,
  FileText,
  Users,
  Package,
  Activity,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { IOSCard, IOSCardHeader, IOSCardContent } from "@/components/ui/ios/IOSCard";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/styles/animations";

// Types matching the updated API response
interface ActivityItem {
  type: string;
  title: string;
  subtitle: string;
  amount: number | null;
  message: string;
  entityId: string;
  href: string;
  createdAt: string;
}

const activityIcons: Record<string, any> = {
  order: ShoppingCart,
  production: Activity,
  inventory: Package,
  payment: IndianRupee,
  client: Users,
  invoice: FileText,
};

const activityColors: Record<string, string> = {
  order: "bg-[rgba(10,132,255,0.12)] text-[var(--ios-blue)]",
  production: "bg-[rgba(142,142,147,0.12)] text-[var(--ios-gray)]",
  inventory: "bg-[rgba(255,149,0,0.12)] text-[var(--ios-orange)]",
  payment: "bg-[rgba(52,199,89,0.12)] text-[var(--ios-green)]",
  client: "bg-[rgba(175,82,222,0.12)] text-[var(--ios-purple)]",
  invoice: "bg-[rgba(255,45,85,0.12)] text-[var(--ios-red)]",
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const t = useTranslations("dashboard");

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const url = filter === "all"
          ? "/api/dashboard/activity?limit=50"
          : `/api/dashboard/activity?limit=50&type=${filter}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (error) {
        console.error("Failed to fetch activity log:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [filter]);

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  };

  const filterOptions = [
    { value: "all", label: "All Activity" },
    { value: "order", label: "Orders" },
    { value: "payment", label: "Payments" },
    { value: "inventory", label: "Inventory" },
    { value: "client", label: "Clients" },
    { value: "production", label: "Production" },
  ];

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-[34px] w-[200px] rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
        <div className="h-[40px] w-full max-w-md rounded-[10px] bg-[var(--fill-tertiary)] shimmer" />
        <div className="h-[500px] w-full rounded-[16px] bg-[var(--fill-tertiary)] shimmer" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 hero-glow max-w-4xl mx-auto"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
          Activity Log
        </h1>
        <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px]">
          All recent actions across your workspace
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={staggerItem} className="flex overflow-x-auto hide-scrollbar pb-2">
        <div className="flex gap-2 p-1 bg-[var(--fill-quaternary)] rounded-[12px] border border-[var(--border-card)]">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all whitespace-nowrap",
                filter === opt.value
                  ? "bg-white dark:bg-[#2C2C2E] text-[var(--label-primary)] shadow-sm"
                  : "text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--label-primary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={staggerItem}>
        <IOSCard className="bg-white dark:bg-[#1C1C1E] !rounded-2xl shadow-md border-0 dark:border dark:border-[var(--border-card)] dark:shadow-none overflow-hidden">
          <div className="flex flex-col">
            {activities.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--fill-quaternary)] flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-[var(--label-tertiary)]" />
                </div>
                <h3 className="text-[17px] font-medium text-[var(--label-primary)]">No activity found</h3>
                <p className="text-[14px] text-[var(--label-secondary)] mt-1">Try changing the filter or check back later.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || Activity;
                  const colorClass = activityColors[activity.type] || activityColors.production;

                  return (
                    <motion.div
                      key={`${activity.type}-${activity.entityId}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link href={activity.href || "#"} className="block group">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-[var(--border-divider)] group-hover:bg-[var(--fill-quaternary)] transition-colors">

                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0", colorClass)}>
                              <Icon className="h-[20px] w-[20px]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-medium text-[var(--label-primary)] truncate">
                                {activity.title}
                              </p>
                              {activity.subtitle && (
                                <p className="text-[14px] text-[var(--label-secondary)] truncate">
                                  {activity.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-[200px] flex-shrink-0 ml-14 sm:ml-0">
                            {activity.amount !== null && (
                              <p className="text-[15px] font-medium text-[var(--label-primary)]">
                                ₹{activity.amount.toLocaleString("en-IN")}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-[13px] text-[var(--label-secondary)] font-medium">
                                  {formatTimeAgo(activity.createdAt)}
                                </span>
                                <span className="text-[11px] text-[var(--label-tertiary)]">
                                  {formatDateTime(activity.createdAt)}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-[var(--label-quaternary)] group-hover:text-[var(--label-secondary)] transition-colors" />
                            </div>
                          </div>

                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </IOSCard>
      </motion.div>
    </motion.div>
  );
}
