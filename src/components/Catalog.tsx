"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, Home, BookOpen, Scale, X } from "lucide-react";
import type { Product, Language } from "@/data/catalog";
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  CATEGORIES,
  SORT_OPTIONS,
  type Category,
  type SortKey,
  filterByLanguage,
  filterByCategory,
  sortProducts,
  searchProducts,
  productHasLanguage,
  localizeProduct,
} from "@/lib/catalog";
import ProductCard from "./ProductCard";
import { LOCALE_TO_PRODUCT_LANGUAGE, UI_COPY } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const CATEGORY_ICONS: Record<Category | "All", typeof Home> = {
  All: Home,
  "Property Law": Home,
  "Civil Law": Scale,
  Other: BookOpen,
};

export default function Catalog({
  products,
  notice,
}: {
  products: Product[];
  /** Shown above the search controls (disclaimer / offer note). */
  notice?: React.ReactNode;
}) {
  const { locale } = useLanguage();
  const copy = UI_COPY[locale];
  const searchParams = useSearchParams();
  const initialLang = (searchParams.get("lang") as Language | "All") ?? "All";
  const validInitial = LANGUAGES.includes(initialLang) ? initialLang : "All";

  const [langSelection, setLangSelection] = useState<{
    locale: typeof locale;
    value: Language | "All";
  }>({ locale, value: validInitial });
  const [cat, setCat] = useState<Category | "All">("All");
  const [sort, setSort] = useState<SortKey>("featured");
  const [query, setQuery] = useState("");
  // Reels quote a book's card number — "Book ID" jumps straight to it.
  const [bookId, setBookId] = useState("");

  const preferred = LOCALE_TO_PRODUCT_LANGUAGE[locale];
  const localizedProducts = useMemo(
    () => products.map((product) => localizeProduct(product, locale)),
    [products, locale],
  );
  const lang = langSelection.locale === locale
    ? langSelection.value
    : products.some((product) => productHasLanguage(product, preferred))
      ? preferred
      : "All";

  const availableLangs = useMemo(
    () =>
      LANGUAGES.filter(
        (l) => l === "All" || products.some((p) => productHasLanguage(p, l)),
      ),
    [products],
  );

  const filtered = useMemo(() => {
    const id = bookId.trim();
    if (id) return localizedProducts.filter((p) => String(p.id) === id);
    let out = filterByLanguage(localizedProducts, lang);
    out = filterByCategory(out, cat);
    out = searchProducts(out, query);
    return sortProducts(out, sort);
  }, [localizedProducts, lang, cat, query, sort, bookId]);

  const inputClass =
    "font-deva h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 pl-9 text-sm shadow-sm outline-none transition-all placeholder:text-brand-400 focus:bg-white focus-visible:border-brand-teal focus-visible:ring-[3px] focus-visible:ring-brand-teal/20";

  return (
    <div>
      {/* Language tabs under the banner (original: All / हिंदी / English) */}
      {availableLangs.length > 2 && (
        <div className="border-b border-gray-100 bg-white">
          <div className="container-x no-scrollbar flex gap-1 overflow-x-auto py-2">
            {availableLangs.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLangSelection({ locale, value: l })}
                aria-pressed={lang === l}
                className={`font-deva shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${
                  lang === l ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {l === "All" ? "All / सर्व" : LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container-x space-y-6 py-8">
        {notice}

        <div className="flex flex-col gap-6">
          {/* count + Book ID + search */}
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <p className="hidden whitespace-nowrap text-sm font-medium text-brand-500 lg:block">
              <b className="text-brand-700">{filtered.length}</b> {copy.showing}
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="group relative w-full sm:w-36">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-gray-400 group-focus-within:text-brand-teal">
                  ID
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Book ID"
                  aria-label="Book ID"
                  className={`${inputClass} pr-8`}
                />
                {bookId && (
                  <button
                    type="button"
                    onClick={() => setBookId("")}
                    aria-label="Clear Book ID"
                    className="absolute inset-y-0 right-2 flex items-center text-brand-400 hover:text-brand-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="group relative w-full sm:w-[21.875rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400 group-focus-within:text-brand-teal" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={copy.search}
                  aria-label={copy.search}
                  className={`${inputClass} pr-9`}
                />
              </div>
            </div>
          </div>

          {/* Edition language chips — only when the tab bar above isn't shown */}
          {availableLangs.length === 2 && (
            <div className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {availableLangs.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLangSelection({ locale, value: l })}
                  aria-pressed={lang === l}
                  className={`font-deva whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                    lang === l
                      ? "border-brand-gold bg-brand-gold text-brand-teal"
                      : "border-gray-200 bg-white text-gray-500 hover:border-brand-gold/50 hover:bg-amber-50"
                  }`}
                >
                  {l === "All" ? copy.all : LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>
          )}

          {/* category + sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-1">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    aria-pressed={cat === c}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${
                      cat === c
                        ? "scale-105 border-brand-teal bg-brand-teal text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-teal/50 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {c}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-brand-600 shadow-sm sm:self-auto">
              <ArrowUpDown className="h-4 w-4 text-brand-400" />
              <span className="sr-only">{copy.sort}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="font-deva bg-transparent pr-1 outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="font-deva py-16 text-center text-brand-400">{copy.noBooks}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
