"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "kaf-locale";

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** null until read from storage; false = first visit, nothing chosen yet. */
  chosen: boolean | null;
  /** Shows the language picker again (header language button on phones). */
  openPicker: () => void;
}>({ locale: DEFAULT_LOCALE, setLocale: () => undefined, chosen: null, openPicker: () => undefined });

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [chosen, setChosen] = useState<boolean | null>(null);

  useEffect(() => {
    let storedLocale: Locale | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) storedLocale = stored;
    } catch {
      // Storage may be unavailable in private browsing; Marathi remains default.
    }
    const id = window.setTimeout(() => {
      if (storedLocale) setLocaleState(storedLocale);
      setChosen(Boolean(storedLocale));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      chosen,
      openPicker: () => setChosen(false),
      // Only an explicit choice is remembered — so a first-time visitor (no
      // saved choice) can be asked which language they want.
      setLocale: (next: Locale) => {
        setLocaleState(next);
        setChosen(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
          document.cookie = `kaf_locale=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
        } catch {
          // The active tab still keeps the selected locale in React state.
        }
      },
    }),
    [locale, chosen],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export type Localized = Record<Locale, string>;

/** Picks the current language's text: `t({ mr, hi, en })`. */
export function useT() {
  const { locale } = useLanguage();
  return (text: Localized) => text[locale];
}

/** Inline translated text for server components: `<Tr mr="…" hi="…" en="…" />`. */
export function Tr(text: Localized) {
  const { locale } = useLanguage();
  return <>{text[locale]}</>;
}
