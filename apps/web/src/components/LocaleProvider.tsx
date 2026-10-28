"use client";

import { NextIntlClientProvider } from "next-intl";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { type Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALES } from "@/lib/i18n";

// Statically import default locale (en) for instant zero-latency SSR & initial hydration
import enMessages from "@/messages/en";

// Dynamic chunk loaders for non-default locales (~280KB each)
// This ensures that English visitors never download Hindi, Gujarati, or Marathi bundles
const dynamicLocaleLoaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Record<string, any> }>> = {
  hi: () => import("@/messages/hi"),
  gu: () => import("@/messages/gu"),
  mr: () => import("@/messages/mr"),
};

// ─── Locale Context ──────────────────────────────────────
interface LocaleContextType {
  locale: Locale;
  switchLocale: (newLocale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  switchLocale: () => {},
});

export function useAppLocale() {
  return useContext(LocaleContext);
}

// ─── Provider Component ──────────────────────────────────
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, any>>(enMessages);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Read locale from localStorage on mount (with cookie fallback)
    let stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!stored && typeof document !== "undefined") {
      const match = document.cookie.match(
        new RegExp(`(?:^|; )${LOCALE_STORAGE_KEY}=([^;]*)`)
      );
      if (match) stored = decodeURIComponent(match[1]);
    }

    if (stored && LOCALES.includes(stored as Locale) && stored !== DEFAULT_LOCALE) {
      const targetLocale = stored as Exclude<Locale, "en">;
      setLocale(targetLocale);
      dynamicLocaleLoaders[targetLocale]()
        .then((mod) => {
          setMessages(mod.default);
          setIsLoaded(true);
        })
        .catch((err) => {
          console.error("[LocaleProvider] Failed to load messages for locale:", targetLocale, err);
          setMessages(enMessages);
          setIsLoaded(true);
        });
    } else {
      setIsLoaded(true);
    }
  }, []);

  const switchLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_STORAGE_KEY}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    }
    // Reload the page to re-initialize the provider cleanly with the chosen locale
    window.location.reload();
  }, []);

  // Don't render children until we've read localStorage to avoid hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>
      <NextIntlClientProvider
        key={locale}
        locale={locale}
        messages={messages}
        timeZone="Asia/Kolkata"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
