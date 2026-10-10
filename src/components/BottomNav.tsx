"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Sparkles, Download } from "lucide-react";
import { UI_COPY, type Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const TABS = [
  { href: "/", index: 0, icon: Home },
  { href: "/ebooks", index: 1, icon: BookOpen },
  { href: "/combos", index: 2, icon: Sparkles, accent: true },
  { href: "/my-books", index: 4, icon: Download },
];

// The tab bar is narrow — short label for combos (as on the original site).
const COMBO_SHORT: Record<Locale, string> = { mr: "कॉम्बो", hi: "कॉम्बो", en: "Combos" };

export default function BottomNav() {
  const { locale } = useLanguage();
  const copy = UI_COPY[locale];
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 flex h-14 border-t border-gray-100 bg-white/95 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden">
      {TABS.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
              active ? "text-brand-teal" : "text-gray-500 hover:text-brand-teal"
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-xl px-3 py-1 transition-all ${
                active ? "bg-brand-teal/10" : "bg-transparent"
              } ${t.accent ? "text-brand-gold" : ""}`}
            >
              <t.icon
                className={`h-5 w-5 ${t.accent ? "fill-brand-gold" : ""} ${
                  active && !t.accent ? "fill-brand-teal/15" : ""
                }`}
              />
            </span>
            <span className={`font-deva text-[9px] ${active ? "font-bold" : "font-medium"}`}>
              {t.index === 2 ? COMBO_SHORT[locale] : copy.nav[t.index]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
