"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

import { useTranslations } from "next-intl";

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  iconColor: string;
  badgeBg?: string;
  children?: React.ReactNode;
}

export function SettingsHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  badgeBg,
  children,
}: SettingsHeaderProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <div className="w-full min-w-0 space-y-4 pt-2 sm:pt-4">
      {/* Back Button / Breadcrumb */}
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => router.push("/dashboard/settings")}
          className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-1 px-2 -ml-2 rounded-[8px] hover:bg-[var(--muted)] cursor-pointer"
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} className="text-[var(--primary)]" />
          <span>{tCommon("settings")}</span>
        </motion.button>
      </div>

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)] w-full min-w-0 overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0 w-full overflow-hidden">
          <div
            className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 shadow-sm"
            style={{
              backgroundColor: badgeBg || `${iconColor}15`,
              border: `1px solid ${iconColor}25`,
            }}
          >
            <Icon size={24} style={{ color: iconColor }} />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--foreground)] truncate">
              {title}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-snug break-words">
              {subtitle}
            </p>
          </div>
        </div>

        {children && (
          <div className="flex items-center gap-3 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
