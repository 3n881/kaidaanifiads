"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

type Activity = { name: string; city: string };

// Deliberately fictional storefront activity. Never populate this component
// from orders or any other customer data.
const ACTIVITIES: Record<Locale, Activity[]> = {
  mr: [
    { name: "विक्रम शिंदे", city: "सोलापूर" },
    { name: "स्नेहल पाटील", city: "पुणे" },
    { name: "प्रकाश जाधव", city: "नाशिक" },
    { name: "सुवर्णा मोरे", city: "कोल्हापूर" },
    { name: "अमोल देशमुख", city: "छत्रपती संभाजीनगर" },
    { name: "पूजा कदम", city: "सातारा" },
    { name: "सचिन चव्हाण", city: "नागपूर" },
    { name: "मनीषा पवार", city: "अहमदनगर" },
    { name: "रोहित माने", city: "लातूर" },
    { name: "वैशाली कुलकर्णी", city: "मुंबई" },
  ],
  hi: [
    { name: "अमित शर्मा", city: "दिल्ली" },
    { name: "नेहा वर्मा", city: "लखनऊ" },
    { name: "राहुल सिंह", city: "जयपुर" },
    { name: "पूजा यादव", city: "भोपाल" },
    { name: "संदीप गुप्ता", city: "इंदौर" },
    { name: "कविता मिश्रा", city: "पटना" },
    { name: "रोहित चौहान", city: "वाराणसी" },
    { name: "अंजली पटेल", city: "नागपुर" },
  ],
  en: [
    { name: "Arjun Mehta", city: "Pune" },
    { name: "Neha Sharma", city: "Mumbai" },
    { name: "Rohan Patel", city: "Delhi" },
    { name: "Priya Singh", city: "Bengaluru" },
    { name: "Amit Verma", city: "Nagpur" },
    { name: "Kavita Rao", city: "Jaipur" },
    { name: "Vikram Joshi", city: "Indore" },
    { name: "Sneha Kapoor", city: "Nashik" },
  ],
};

const COPY = {
  mr: {
    bought: "यांनी आत्ताच ई-बुक खरेदी केले.",
    second: (n: string) => `${n} सेकंदापूर्वी`,
    minute: (n: string) => `${n} मिनिटांपूर्वी`,
    close: "खरेदी सूचना बंद करा",
  },
  hi: {
    bought: "ने अभी ई-बुक खरीदी।",
    second: (n: string) => `${n} सेकंड पहले`,
    minute: (n: string) => `${n} मिनट पहले`,
    close: "खरीद सूचना बंद करें",
  },
  en: {
    bought: "just purchased an e-book.",
    second: (n: string) => `${n} ${n === "1" ? "second" : "seconds"} ago`,
    minute: (n: string) => `${n} ${n === "1" ? "minute" : "minutes"} ago`,
    close: "Close purchase notification",
  },
} satisfies Record<Locale, unknown>;

const FIRST_DELAY_MS = 3_500;
const VISIBLE_MS = 6_000;
const BETWEEN_MS = 4_000;

function randomIndex(length: number, previous: number): number {
  if (length < 2) return 0;
  const offset = 1 + Math.floor(Math.random() * (length - 1));
  return (previous + offset) % length;
}

function relativeTime(locale: Locale): string {
  // Mostly seconds, with occasional minutes, for a natural-looking rotation.
  const seconds = Math.random() < 0.78;
  const value = seconds
    ? 1 + Math.floor(Math.random() * 58)
    : 1 + Math.floor(Math.random() * 8);
  const numberLocale = locale === "en" ? "en-IN" : `${locale}-IN-u-nu-deva`;
  const formatted = value.toLocaleString(numberLocale);
  return seconds ? COPY[locale].second(formatted) : COPY[locale].minute(formatted);
}

function isStorefront(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/ebooks") || pathname.startsWith("/combos");
}

export default function BuyerActivityToast() {
  const pathname = usePathname();
  const { locale, chosen } = useLanguage();
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState("");
  const [visible, setVisible] = useState(false);
  const [shownFor, setShownFor] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const indexRef = useRef(0);
  const contextKey = `${locale}:${pathname}`;

  useEffect(() => {
    if (chosen !== true || dismissed || !isStorefront(pathname)) {
      return;
    }

    let showTimer = 0;
    let hideTimer = 0;
    let stopped = false;

    const showNext = () => {
      if (stopped) return;
      const next = randomIndex(ACTIVITIES[locale].length, indexRef.current);
      indexRef.current = next;
      setIndex(next);
      setTime(relativeTime(locale));
      setShownFor(contextKey);
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        showTimer = window.setTimeout(showNext, BETWEEN_MS);
      }, VISIBLE_MS);
    };

    showTimer = window.setTimeout(showNext, FIRST_DELAY_MS);
    return () => {
      stopped = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [chosen, contextKey, dismissed, locale, pathname]);

  if (!isStorefront(pathname) || chosen !== true || dismissed) return null;

  const activity = ACTIVITIES[locale][index];
  const copy = COPY[locale];
  const isVisible = visible && shownFor === contextKey;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={!isVisible}
      className={`font-deva fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[45] mx-auto max-w-md transition duration-500 ease-out in-data-[buybar=on]:bottom-44 md:bottom-6 md:left-6 md:right-auto md:mx-0 md:w-[24rem] md:in-data-[buybar=on]:bottom-6 ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      } motion-reduce:transition-none`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white/95 px-4 py-3 pr-10 shadow-[0_12px_34px_rgba(10,35,66,0.22)] backdrop-blur-md">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-gold via-green-500 to-brand-teal" aria-hidden="true" />
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
            <Scale className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 motion-safe:animate-ping" aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-5 text-brand-900">
              {activity.name} <span className="font-semibold text-brand-600">({activity.city})</span>
            </p>
            <p className="mt-0.5 text-xs font-medium text-brand-600">{copy.bought}</p>
            <p className="mt-1 text-[11px] font-medium text-brand-400">{time}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setDismissed(true);
          }}
          aria-label={copy.close}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-brand-400 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
