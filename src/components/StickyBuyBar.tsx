"use client";

import { useEffect } from "react";
import type { Product } from "@/data/catalog";
import { UI_COPY } from "@/lib/i18n";
import { editionLocaleFor } from "@/lib/catalog";
import BuyButton from "./BuyButton";
import { useLanguage } from "./LanguageProvider";

/** One offer button in the bar: "1 पुस्तक ₹49", "2 पुस्तके ₹79", "3 पुस्तके ₹99". */
export type BarOption = { key: string; label: string; price: number; best?: boolean; selected: boolean; onSelect: () => void };

/**
 * Mobile-only bottom bar with title, price and Buy — always on screen on a
 * product page (as on the previous site), so Reel visitors can buy from
 * anywhere while the preview viewer takes the first screen. Sits above the
 * site's BottomNav. On a book also sold in combos it carries the offer
 * buttons too, so the offers are seen without scrolling (client, 28 Oct).
 */
export default function StickyBuyBar({
  product,
  label,
  options = [],
}: {
  product: Product;
  label?: string;
  options?: BarOption[];
}) {
  const { locale } = useLanguage();

  useEffect(() => {
    // Lets the floating WhatsApp / back-to-top buttons move above the bar.
    document.body.dataset.buybar = "on";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 border-t border-brand-100 bg-white/95 px-4 pb-2.5 pt-1.5 shadow-[0_-4px_16px_rgba(10,35,66,0.08)] backdrop-blur lg:hidden">
      {options.length > 0 && (
        <div className="mx-auto mb-1.5 grid max-w-md gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={option.selected}
              onClick={option.onSelect}
              className={`font-deva relative flex flex-col items-center rounded-xl border-2 px-1 py-1 leading-tight transition ${
                option.selected ? "border-green-600 bg-green-50 text-green-800" : "border-brand-100 bg-white text-brand-700"
              }`}
            >
              {option.best && (
                <span className="absolute -top-2 right-1 rounded bg-brand-gold px-1 text-[9px] font-extrabold text-brand-teal">⭐</span>
              )}
              <span className="text-[11px] font-bold">{option.label}</span>
              <span className="text-base font-black text-green-600">₹{option.price}</span>
            </button>
          ))}
        </div>
      )}
      <p className="font-deva mx-auto max-w-md truncate text-[11px] font-semibold text-brand-600">
        {product.title}
      </p>
      <div className="mx-auto mt-1 flex max-w-md items-center gap-3">
        <div className="shrink-0 leading-tight">
          <span className="block text-xs text-brand-400 line-through">₹{product.mrp}</span>
          <span className="block text-xl font-extrabold text-green-600">₹{product.price}</span>
        </div>
        <div className="min-w-0 flex-1">
          <BuyButton
            product={product}
            label={label ?? UI_COPY[editionLocaleFor(product, locale)].downloadNow}
            className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3 text-sm font-extrabold text-brand-teal shadow-sm transition hover:brightness-95 active:scale-[0.98]"
          />
        </div>
      </div>
    </div>
  );
}
