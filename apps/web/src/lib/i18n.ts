// ─── Internationalization Constants ──────────────────────
export const LOCALES = ["en", "hi", "gu", "mr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "ind-manager-locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
  mr: "मराठी",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  gu: "🇮🇳",
  mr: "🇮🇳",
};

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
