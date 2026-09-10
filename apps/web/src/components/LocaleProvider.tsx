"use client";

import { NextIntlClientProvider } from "next-intl";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { type Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALES } from "@/lib/i18n";

// Statically import all locale message files from src/messages
import en from "@/messages/en";
import hi from "@/messages/hi";
import gu from "@/messages/gu";
import mr from "@/messages/mr";

const allMessages: Record<Locale, Record<string, any>> = { en, hi, gu, mr };

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Read locale from localStorage on mount
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && LOCALES.includes(stored as Locale)) {
      setLocale(stored as Locale);
    }
    setIsLoaded(true);
  }, []);

  const switchLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    // Reload the page to re-initialize the provider cleanly
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
        messages={allMessages[locale]}
        timeZone="Asia/Kolkata"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
