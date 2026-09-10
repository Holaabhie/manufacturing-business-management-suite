"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Receipt,
  Globe,
  Shield,
  Bell,
  Puzzle,
  Users,
  Link2,
  Database,
  ChevronRight,
} from "lucide-react";
import { IOSCard } from "@/components/ui/ios";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");

  const settingsGroups = [
    {
      label: t("hub.groupBusiness"),
      items: [
        {
          id: "company-info",
          title: t("hub.companyInfoTitle"),
          subtitle: t("hub.companyInfoSubtitle"),
          icon: Building2,
          iconColor: "#FF9500",
          href: "/dashboard/settings/company-info",
        },
        {
          id: "tax",
          title: t("hub.taxTitle"),
          subtitle: t("hub.taxSubtitle"),
          icon: Receipt,
          iconColor: "#00C7BE",
          href: "/dashboard/settings/tax",
        },
      ],
    },
    {
      label: t("hub.groupPreferences"),
      items: [
        {
          id: "language",
          title: t("hub.languageTitle"),
          subtitle: t("hub.languageSubtitle"),
          icon: Globe,
          iconColor: "#007AFF",
          href: "/dashboard/settings/language",
        },
        {
          id: "security",
          title: t("hub.securityTitle"),
          subtitle: t("hub.securitySubtitle"),
          icon: Shield,
          iconColor: "#34C759",
          href: "/dashboard/settings/security",
        },
        {
          id: "notifications",
          title: t("hub.notificationsTitle"),
          subtitle: t("hub.notificationsSubtitle"),
          icon: Bell,
          iconColor: "#FF2D55",
          href: "/dashboard/settings/notifications",
        },
        {
          id: "modules",
          title: t("hub.modulesTitle"),
          subtitle: t("hub.modulesSubtitle"),
          icon: Puzzle,
          iconColor: "#FF9500",
          href: "/dashboard/settings/modules",
        },
      ],
    },
    {
      label: t("hub.groupTeam"),
      items: [
        {
          id: "team",
          title: t("hub.teamTitle"),
          subtitle: t("hub.teamSubtitle"),
          icon: Users,
          iconColor: "#0A84FF",
          href: "/dashboard/settings/team",
        },
        {
          id: "audit-trails",
          title: t("hub.auditTrailsTitle"),
          subtitle: t("hub.auditTrailsSubtitle"),
          icon: Shield,
          iconColor: "#5856D6",
          href: "/dashboard/settings/audit-trails",
        },
        {
          id: "tally-integration",
          title: t("hub.tallyTitle"),
          subtitle: t("hub.tallySubtitle"),
          icon: Link2,
          iconColor: "#FF9500",
          href: "/dashboard/settings/tally-integration",
        },
        {
          id: "data",
          title: t("hub.dataTitle"),
          subtitle: t("hub.dataSubtitle"),
          icon: Database,
          iconColor: "#FF3B30",
          href: "/dashboard/settings/data",
        },
      ],
    },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 pt-4 sm:pt-6">
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">
          {t("hub.title")}
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[var(--muted-foreground)]">
          {t("hub.subtitle")}
        </p>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {settingsGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            {group.label && (
              <p className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-1">
                {group.label}
              </p>
            )}

            <IOSCard className="p-0 overflow-hidden divide-y divide-[var(--border)]">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-[var(--muted)]/60 active:bg-[var(--muted)] transition-colors text-left cursor-pointer group"
                    whileTap={{ scale: 0.995 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${item.iconColor}15`,
                          border: `1px solid ${item.iconColor}25`,
                        }}
                      >
                        <Icon size={20} style={{ color: item.iconColor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[var(--foreground)] leading-snug truncate">
                          {item.title}
                        </p>
                        <p className="text-[12.5px] text-[var(--muted-foreground)] truncate pt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors shrink-0">
                      <ChevronRight size={18} strokeWidth={2} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.button>
                );
              })}
            </IOSCard>
          </div>
        ))}
      </div>
    </div>
  );
}
