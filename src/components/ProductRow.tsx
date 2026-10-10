"use client";

import Link from "next/link";
import type { Product } from "@/data/catalog";
import Carousel from "./Carousel";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

type LocalizedText = string | Record<Locale, string>;

/** Home-page book row — centred heading, swipe carousel, "view all" below (as on the original). */
export default function ProductRow({
  eyebrow,
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel,
  tinted = false,
}: {
  eyebrow?: string;
  title: LocalizedText;
  subtitle?: LocalizedText;
  products: Product[];
  viewAllHref: string;
  viewAllLabel: LocalizedText;
  /** Light navy background (combos) instead of light grey. */
  tinted?: boolean;
}) {
  const { locale } = useLanguage();
  const text = (value: LocalizedText) => (typeof value === "string" ? value : value[locale]);
  if (products.length === 0) return null;
  return (
    <section className={`overflow-hidden py-8 md:py-16 ${tinted ? "bg-brand-teal/5" : "bg-gray-50/50"}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 space-y-3 text-center">
          {eyebrow && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-gold">
              {eyebrow}
            </div>
          )}
          <div>
            <h2 className="font-deva relative inline-block text-xl font-extrabold text-brand-teal md:text-4xl">
              {text(title)}
            </h2>
          </div>
          {subtitle && (
            <p className="font-deva mx-auto max-w-2xl text-sm text-brand-500 md:text-base">{text(subtitle)}</p>
          )}
        </div>

        <Carousel products={products} />

        <div className="mt-12 text-center">
          <Link
            href={viewAllHref}
            className="font-deva inline-flex h-10 items-center justify-center rounded-full border-2 border-brand-teal bg-white px-8 text-base font-bold text-brand-teal shadow-xs transition-colors hover:bg-brand-teal hover:text-white"
          >
            {text(viewAllLabel)}
          </Link>
        </div>
      </div>
    </section>
  );
}
