"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Sparkles, Download } from "lucide-react";

const TABS = [
  { href: "/", label: "मुख्यपृष्ठ", icon: Home },
  { href: "/ebooks", label: "ई-बुक्स", icon: BookOpen },
  { href: "/combos", label: "कॉम्बो", icon: Sparkles, accent: true },
  { href: "/my-books", label: "माझी पुस्तके", icon: Download },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 flex h-14 border-t border-brand-100 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
      {TABS.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
              active ? "text-brand-teal" : "text-brand-400 hover:text-brand-teal"
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-xl px-3 py-1 transition-all ${
                active ? "bg-brand-teal text-white" : "bg-transparent"
              }`}
            >
              <t.icon
                className={`h-5 w-5 ${
                  t.accent && !active
                    ? "animate-pulse fill-brand-gold text-brand-gold"
                    : ""
                }`}
              />
            </span>
            <span className="font-deva text-[9px] font-medium">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
