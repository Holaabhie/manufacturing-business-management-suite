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

export function prefetchLocale(locale: Locale) {
  if (locale !== "en" && dynamicLocaleLoaders[locale]) {
    dynamicLocaleLoaders[locale]().catch(() => {});
  }
}

// ─── Locale Context ──────────────────────────────────────
interface LocaleContextType {
  locale: Locale;
  switchLocale: (newLocale: Locale) => void;
  prefetchLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  switchLocale: () => {},
  prefetchLocale: () => {},
});

export function useAppLocale() {
  return useContext(LocaleContext);
}

function LocaleLoadingFallback() {
  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[var(--background)]"
      role="status"
      aria-label="Loading language"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs font-medium text-muted-foreground animate-pulse">
          Loading language...
        </span>
      </div>
    </div>
  );
}

// ─── Provider Component ──────────────────────────────────
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, any>>(enMessages);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Read locale from localStorage on mount (with cookie fallback)
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch (_) {}

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
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch (_) {}
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_STORAGE_KEY}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    }
    // Preload target bundle into browser cache before reload so second paint is instant
    if (newLocale !== "en" && dynamicLocaleLoaders[newLocale as Exclude<Locale, "en">]) {
      dynamicLocaleLoaders[newLocale as Exclude<Locale, "en">]()
        .finally(() => {
          window.location.reload();
        });
    } else {
      window.location.reload();
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, switchLocale, prefetchLocale }}>
      {!isLoaded ? (
        <LocaleLoadingFallback />
      ) : (
        <NextIntlClientProvider
          key={locale}
          locale={locale}
          messages={messages}
          timeZone="Asia/Kolkata"
        >
          {children}
        </NextIntlClientProvider>
      )}
    </LocaleContext.Provider>
  );
}
