"use client";

import React from "react";
import {
  Puzzle,
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
  Lock,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard } from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useModules,
  MODULE_META,
  type ModuleConfig,
} from "@/hooks/useModules";
import { SettingsHeader } from "../SettingsHeader";

const MODULE_ICON_MAP: Record<string, any> = {
  Cog,
  Cpu,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Users,
  LayoutDashboard,
  Bot,
  UserCog,
};

export default function ModulesSettingsPage() {
  const t = useTranslations("settings");
  const { modules: enabledModules, updateModule: toggleModule } = useModules();

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("modulesPage.title")}
        subtitle={t("modulesPage.subtitle")}
        icon={Puzzle}
        iconColor="#FF9500"
      />

      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-[#FF9500]" />
          {t("modulesPage.featuresTitle")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("modulesPage.featuresSubtitle")}
        </p>

        <div className="space-y-3 pt-1">
          {(["production", "machines", "inventory", "orders", "billing", "payments", "clients"] as (keyof ModuleConfig)[]).map((key) => {
            const meta = MODULE_META[key];
            const IconComponent = MODULE_ICON_MAP[meta.icon];
            const isEnabled = enabledModules[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted)]/80 transition-all"
              >
                <div className="flex items-center gap-4 pr-3">
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}18` }}
                  >
                    {IconComponent && <IconComponent className="h-5 w-5" style={{ color: meta.color }} />}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--foreground)]">{t(`modulesPage.modules.${key}.label`)}</p>
                    <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">{t(`modulesPage.modules.${key}.description`)}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    toggleModule(key, checked);
                    const label = t(`modulesPage.modules.${key}.label`);
                    const state = checked ? t("modulesPage.enabled") : t("modulesPage.disabled");
                    toast.success(`${label} ${state}`);
                  }}
                />
              </div>
            );
          })}

          <div className="border-t border-[var(--border)] my-4" />

          {/* Locked modules */}
          {(["dashboard", "ai_assistant", "staff_roles"] as (keyof ModuleConfig)[]).map((key) => {
            const meta = MODULE_META[key];
            const IconComponent = MODULE_ICON_MAP[meta.icon];

            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--muted)] border border-[var(--border)] opacity-60"
              >
                <div className="flex items-center gap-4 pr-3">
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}18` }}
                  >
                    {IconComponent && <IconComponent className="h-5 w-5" style={{ color: meta.color }} />}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--foreground)]">{t(`modulesPage.modules.${key}.label`)}</p>
                    <p className="text-[13px] text-[var(--muted-foreground)] pt-0.5">{t(`modulesPage.modules.${key}.description`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                    <Lock className="h-3 w-3" />
                    {t("modulesPage.essential")}
                  </span>
                  <Switch checked={true} disabled />
                </div>
              </div>
            );
          })}
        </div>
      </IOSCard>

      {/* Info Card */}
      <IOSCard className="p-4 sm:p-5 border border-[#007AFF]/25 bg-[#007AFF]/5 dark:bg-[#007AFF]/10">
        <div className="flex items-start gap-3.5">
          <Info className="h-5 w-5 text-[#007AFF] shrink-0 mt-0.5" />
          <div className="text-[14px]">
            <p className="font-semibold text-[var(--foreground)]">{t("modulesPage.dataSafeTitle")}</p>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
              {t("modulesPage.dataSafeDescription")}
            </p>
          </div>
        </div>
      </IOSCard>
    </div>
  );
}
