"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const OPTIONS: Record<Locale, { name: string; line: string; badge: string }> = {
  mr: { name: "मराठी", line: "मराठीत वाचा", badge: "म" },
  hi: { name: "हिंदी", line: "हिंदी में पढ़ें", badge: "हि" },
  en: { name: "English", line: "Read in English", badge: "En" },
};

// Not on admin pages or the order page (which follows the purchased edition).
const HIDDEN_ON = ["/dashboard", "/order"];

/**
 * First-visit language choice. Shown once, until the visitor picks a language
 * (also changeable later from the header). Bottom sheet on phones, centred card
 * on larger screens.
 */
export default function LanguagePicker() {
  const { locale, setLocale, chosen } = useLanguage();
  const pathname = usePathname();
  const firstButton = useRef<HTMLButtonElement>(null);
  const open = chosen === false && !HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus({ preventScroll: true });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocale(locale);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, locale, setLocale]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-brand-teal/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-picker-title"
        className="animate-fade-in-up w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        {/* grab handle (phones) */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />

        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-teal">
            <Languages className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 id="language-picker-title" className="font-deva mt-3 text-xl font-extrabold text-brand-teal sm:text-2xl">
            भाषा निवडा <span className="text-brand-400">·</span> भाषा चुनें
          </h2>
          <p className="mt-1 text-sm font-semibold text-brand-500">Choose your language</p>
        </div>

        <div className="mt-5 grid gap-3">
          {LOCALES.map((l, i) => {
            const o = OPTIONS[l];
            const current = l === locale;
            return (
              <button
                key={l}
                ref={i === 0 ? firstButton : undefined}
                type="button"
                lang={l}
                onClick={() => setLocale(l)}
                className={`group flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/40 ${
                  current
                    ? "border-brand-teal bg-brand-teal/5"
                    : "border-gray-100 bg-white hover:border-brand-gold hover:bg-amber-50/60"
                }`}
              >
                <span
                  className={`font-deva flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                    current ? "bg-brand-teal text-white" : "bg-brand-gold/20 text-brand-teal"
                  }`}
                  aria-hidden="true"
                >
                  {o.badge}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-deva block text-lg font-extrabold leading-tight text-gray-900">{o.name}</span>
                  <span className="font-deva block text-xs font-medium text-gray-500">{o.line}</span>
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    current ? "border-brand-teal bg-brand-teal text-white" : "border-gray-200 text-transparent group-hover:border-brand-gold"
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <p className="font-deva mt-4 text-center text-[11px] text-brand-400">
          नंतर वरच्या मेनूमधून बदलू शकता · Change anytime from the menu
        </p>
      </div>
    </div>
  );
}
