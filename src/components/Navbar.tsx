"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Languages, Search, Menu, X } from "lucide-react";
import type { SearchItem } from "@/data/catalog";
import { LOCALES, LOCALE_LABELS, UI_COPY } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";
import CommandPalette from "./CommandPalette";

const LINKS = [
  { href: "/" },
  { href: "/ebooks" },
  { href: "/combos", sale: true },
  { href: "/about" },
  { href: "/my-books" },
];

export default function Navbar({ products }: { products: SearchItem[] }) {
  const { locale, setLocale } = useLanguage();
  const copy = UI_COPY[locale];
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so it closes on navigation.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 backdrop-blur">
      <nav className="container-x flex h-16 items-center gap-3 lg:gap-5">
        {/* Logo */}
        <Link href="/" className="group flex flex-shrink-0 items-center">
          <Image
            src="/brand/logo.png"
            alt="कायद्याचं आणि फायद्याचं"
            width={230}
            height={40}
            loading="eager"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105 sm:h-10 lg:h-7 2xl:h-10"
          />
        </Link>

        {/* Prominent search (desktop) */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5 text-left text-sm text-brand-400 transition hover:border-brand-300 md:flex lg:max-w-sm"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="font-deva truncate">{copy.search}</span>
          <kbd className="ml-auto hidden flex-shrink-0 rounded border border-brand-200 px-1.5 text-[10px] lg:block">
            ⌘K
          </kbd>
        </button>

        {/* Desktop links */}
        <div className="ml-auto hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l, index) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-deva relative rounded-lg px-2.5 py-2 text-center text-[13px] font-semibold leading-tight transition xl:text-sm ${
                isActive(l.href)
                  ? "text-brand-teal"
                  : "text-brand-600 hover:bg-brand-50 hover:text-brand-teal"
              }`}
            >
              <span className="block">{copy.nav[index]}</span>
              {copy.navEn[index] && (
                <span className="block text-[11px] font-medium opacity-80">{copy.navEn[index]}</span>
              )}
              {l.sale && (
                <span className="badge-sale absolute -right-1 top-0 rounded-full px-1.5 text-[9px] font-bold text-white">
                  SALE
                </span>
              )}
            </Link>
          ))}
        </div>

        <LanguageSelect className="hidden xl:flex" />

        {/* Buy button (gold) */}
        <Link
          href="/ebooks"
          className="font-deva ml-auto hidden flex-shrink-0 rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-teal shadow-sm transition hover:bg-brand-gold/90 lg:ml-2 lg:inline-block"
        >
          {copy.buyNow}
        </Link>

        {/* Mobile actions */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="शोधा"
            className="rounded-lg border border-brand-200 p-2 text-brand-500"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
            aria-label="मेनू"
            className="rounded-lg p-2 text-brand-teal"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-brand-100 bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            <LanguageSelect className="mb-2 flex" />
            {LINKS.map((l, index) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-deva flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(l.href)
                    ? "bg-brand-50 text-brand-teal"
                    : "text-brand-700"
                }`}
              >
                <span>
                  {copy.nav[index]}
                </span>
                {l.sale && (
                  <span className="badge-sale rounded-full px-1.5 text-[9px] font-bold text-white">
                    SALE
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/ebooks"
              className="font-deva mt-1 rounded-xl bg-brand-gold px-3 py-2.5 text-center text-sm font-bold text-brand-teal"
            >
              {copy.buyNow}
            </Link>
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        products={products}
      />
    </header>
  );

  function LanguageSelect({ className }: { className: string }) {
    return (
      <label className={`${className} items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-brand-600`}>
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{copy.language}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          aria-label={copy.language}
          className="font-deva min-w-0 bg-transparent text-xs font-semibold outline-none"
        >
          {LOCALES.map((value) => (
            <option key={value} value={value}>{LOCALE_LABELS[value]}</option>
          ))}
        </select>
      </label>
    );
  }
}
