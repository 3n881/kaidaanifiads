"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ArrowUpDown } from "lucide-react";
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

export default function Catalog({ products }: { products: Product[] }) {
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
    let out = filterByLanguage(localizedProducts, lang);
    out = filterByCategory(out, cat);
    out = searchProducts(out, query);
    return sortProducts(out, sort);
  }, [localizedProducts, lang, cat, query, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="space-y-4">
        {/* language + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {availableLangs.map((l) => (
              <button
                key={l}
                onClick={() => setLangSelection({ locale, value: l })}
                aria-pressed={lang === l}
                className={`font-deva rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${
                  lang === l
                    ? "bg-brand-teal text-white"
                    : "border border-brand-200 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {l === "All" ? copy.all : LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-brand-200 px-3 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20 sm:w-72">
            <Search className="h-4 w-4 text-brand-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
              className="font-deva w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        {/* category + sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${
                  cat === c
                    ? "bg-brand-gold text-brand-teal"
                    : "border border-brand-200 text-brand-500 hover:bg-brand-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 self-start rounded-xl border border-brand-200 px-3 py-2 text-sm text-brand-600 sm:self-auto">
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

      {/* Count */}
      <p className="mt-5 text-sm text-brand-400">
        <b className="text-brand-700">{filtered.length}</b> {copy.showing}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="font-deva mt-16 text-center text-brand-400">
          {copy.noBooks}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
