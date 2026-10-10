"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import type { Product } from "@/data/catalog";
import { discountPercent, localizeProduct } from "@/lib/catalog";
import CoverImage from "./CoverImage";
import BuyButton from "./BuyButton";
import { UI_COPY } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const BADGES = {
  mr: { off: "सवलत", bestseller: "बेस्टसेलर" },
  hi: { off: "छूट", bestseller: "बेस्टसेलर" },
  en: { off: "OFF", bestseller: "Bestseller" },
} as const;

export default function ProductCard({
  product,
  priority = false,
  sizes,
}: {
  product: Product;
  /** The first card of the home page row is the phone LCP image — load it at once. */
  priority?: boolean;
  sizes?: string;
}) {
  const { locale } = useLanguage();
  product = localizeProduct(product, locale);
  const copy = UI_COPY[locale];
  const href = product.isCombo
    ? `/combos/${product.slug}`
    : `/ebooks/${product.slug}`;
  const pct = discountPercent(product);
  const badge = BADGES[locale];

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-cardhover)]">
      <Link href={href} className="relative block overflow-hidden">
        <CoverImage
          product={product}
          priority={priority}
          sizes={sizes}
          className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-105"
        />
        {/* ID badge (top-left, navy, notched corner) */}
        <span className="absolute left-0 top-0 z-20 rounded-br-lg border-b border-r border-white/20 bg-brand-teal px-2 py-1 text-[11px] font-black uppercase tracking-tighter text-white shadow-md">
          {product.id}
        </span>
        {/* Sale + combo + bestseller badges (top-right) */}
        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5">
          {pct > 0 && (
            <span className="badge-sale flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
              {pct}% {badge.off}
            </span>
          )}
          {product.isCombo && (
            <span className="badge-combo rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Combo Pack
            </span>
          )}
          {product.featured && (
            <span className="flex items-center gap-1 rounded-lg bg-brand-gold px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-teal shadow">
              ★ {badge.bestseller}
            </span>
          )}
        </div>
        {/* Pages badge (bottom-left, on translucent black) */}
        <span className="absolute bottom-2 left-2 z-20 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          {product.pages} {copy.pages}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link href={href} className="mb-1 min-h-11">
          <h3 className="font-deva text-[15px] font-bold leading-tight text-brand-900 line-clamp-2 transition-colors group-hover:text-brand-700">
            {product.title}
          </h3>
        </Link>
        <p className="mb-3 font-deva text-xs text-brand-500 line-clamp-2">
          {product.shortDescription}
        </p>
        {pct > 0 && (
          <p className="font-deva mb-3 inline-flex items-center gap-1.5 self-start rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-bold leading-tight text-red-700">
            <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
            {copy.limitedOffer}
          </p>
        )}

        {/* Price (struck MRP above the price) + compact buy button, as on the original */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-brand-50 pt-3">
          <div className="flex flex-col">
            {product.mrp > product.price && (
              <span className="mb-1 text-xs font-bold leading-none text-brand-500 line-through decoration-red-400/60">
                ₹{product.mrp}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-xl font-extrabold leading-none text-red-600">
              <span className="text-sm">₹</span>
              {product.price}
            </span>
          </div>
          <BuyButton
            product={product}
            showIcon={false}
            className="font-deva flex min-h-8 max-w-[60%] items-center justify-center rounded-lg bg-brand-teal px-3 py-1 text-center text-[11px] font-bold leading-tight text-white shadow-sm transition-colors hover:bg-brand-teal/90 active:scale-[0.98]"
          />
        </div>
      </div>
    </article>
  );
}
