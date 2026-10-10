"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, FileText, Package } from "lucide-react";
import type { SearchItem } from "@/data/catalog";
import { localizeSearchItem, productHasLanguage } from "@/lib/catalog";
import { LOCALE_TO_PRODUCT_LANGUAGE, UI_COPY } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

export default function CommandPalette({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: SearchItem[];
}) {
  const router = useRouter();
  const { locale } = useLanguage();
  const copy = UI_COPY[locale];
  const [query, setQuery] = useState("");
  // true only on the client (portals need document.body)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const localized = products
      .filter((product) =>
        productHasLanguage(product, LOCALE_TO_PRODUCT_LANGUAGE[locale]),
      )
      .map((product) => localizeSearchItem(product, locale));
    const q = query.trim().toLowerCase();
    if (!q) return localized.slice(0, 8);
    return localized
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, products, locale]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!mounted || !open) return null;

  const go = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-brand-100 px-4">
          <Search className="h-4 w-4 text-brand-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.search}
            className="font-deva w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-brand-300"
          />
          <kbd className="hidden rounded border border-brand-200 px-1.5 py-0.5 text-[10px] text-brand-400 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-brand-400">
              {locale === "hi" ? "कुछ नहीं मिला।" : locale === "en" ? "Nothing found." : "काही सापडले नाही."}
            </p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                go(p.isCombo ? `/combos/${p.slug}` : `/ebooks/${p.slug}`)
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                {p.isCombo ? (
                  <Package className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-deva block truncate text-sm font-medium text-brand-900">
                  {p.title}
                </span>
                <span className="text-xs text-brand-400">
                  {p.language} · {p.pages} {UI_COPY[locale].pages} · ₹{p.price}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
