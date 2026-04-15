"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_NAMES, LOCALE_FLAGS, type Locale } from "@/lib/i18n";
import { useAppLocale } from "@/components/LocaleProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

// ─── Compact variant: for navbar ─────────────────────────
export function LanguageSwitcherCompact() {
  const { locale, switchLocale } = useAppLocale();
  const t = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-colors cursor-pointer"
          whileTap={{ scale: 0.9 }}
          title={t("language")}
        >
          <Globe className="h-[18px] w-[18px]" />
          <span className="sr-only">{t("language")}</span>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-[12px] min-w-[180px]">
        <DropdownMenuLabel className="text-[13px] text-[var(--label-secondary)]">
          {t("language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={cn(
              "rounded-[8px] gap-2.5 text-[14px] cursor-pointer",
              locale === loc && "bg-[var(--fill-tertiary)] font-semibold"
            )}
          >
            <span className="text-[16px]">{LOCALE_FLAGS[loc]}</span>
            <span>{LOCALE_NAMES[loc]}</span>
            {locale === loc && (
              <span className="ml-auto text-[var(--ios-blue)] text-[13px] font-bold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Full variant: for Settings page ─────────────────────
export function LanguageSwitcherFull() {
  const { locale, switchLocale } = useAppLocale();
  const t = useTranslations("settings");

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-medium text-[var(--label-secondary)] ml-1">
        {t("currentLanguage")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => {
              if (loc !== locale) switchLocale(loc);
            }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-[16px] border transition-all text-left cursor-pointer",
              locale === loc
                ? "bg-[var(--ios-blue)]/10 border-[var(--ios-blue)]/40 ring-2 ring-[var(--ios-blue)]/20"
                : "bg-[var(--fill-quaternary)] border-[var(--border-card)] hover:bg-[var(--fill-tertiary)]"
            )}
          >
            <span className="text-[24px]">{LOCALE_FLAGS[loc]}</span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-[15px] font-semibold",
                  locale === loc ? "text-[var(--ios-blue)]" : "text-[var(--label-primary)]"
                )}
              >
                {LOCALE_NAMES[loc]}
              </p>
              <p className="text-[12px] text-[var(--label-secondary)]">
                {loc === "en" ? "English" : loc === "hi" ? "Hindi" : loc === "gu" ? "Gujarati" : "Marathi"}
              </p>
            </div>
            {locale === loc && (
              <div className="w-6 h-6 rounded-full bg-[var(--ios-blue)] flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-[var(--label-tertiary)] ml-1 mt-2">
        {t("languageChangeNote")}
      </p>
    </div>
  );
}
