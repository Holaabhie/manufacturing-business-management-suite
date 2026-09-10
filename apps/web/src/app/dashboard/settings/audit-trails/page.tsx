"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Shield, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettingsHeader } from "../SettingsHeader";

const AuditTrailPanel = dynamic(() => import("@/components/AuditTrailPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#5856D6]" />
    </div>
  ),
});

export default function AuditTrailsSettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-5xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("auditTrailsPage.title")}
        subtitle={t("auditTrailsPage.subtitle")}
        icon={Shield}
        iconColor="#5856D6"
      />

      <div className="w-full min-w-0">
        <AuditTrailPanel />
      </div>
    </div>
  );
}
