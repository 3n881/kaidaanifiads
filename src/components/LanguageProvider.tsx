"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "kaf-locale";

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: DEFAULT_LOCALE, setLocale: () => undefined });

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let storedLocale: Locale | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) storedLocale = stored;
    } catch {
      // Storage may be unavailable in private browsing; Marathi remains default.
    }
    if (!storedLocale) return;
    const id = window.setTimeout(() => setLocaleState(storedLocale), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.cookie = `kaf_locale=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch {
      // The active tab still keeps the selected locale in React state.
    }
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale: setLocaleState }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
