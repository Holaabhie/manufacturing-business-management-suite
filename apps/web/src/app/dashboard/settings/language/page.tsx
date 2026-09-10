"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard } from "@/components/ui/ios";
import { LanguageSwitcherFull } from "@/components/LanguageSwitcher";
import { SettingsHeader } from "../SettingsHeader";

export default function LanguageSettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("languagePage.title")}
        subtitle={t("languagePage.subtitle")}
        icon={Globe}
        iconColor="#007AFF"
      />

      <IOSCard className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Globe className="h-5 w-5 text-[#007AFF]" />
          {t("languagePage.regionalLanguage")}
        </h3>
        <p className="text-[13px] text-[var(--muted-foreground)] -mt-2">
          {t("languagePage.regionalLanguageDesc")}
        </p>

        <div className="pt-2">
          <LanguageSwitcherFull />
        </div>
      </IOSCard>
    </div>
  );
}
