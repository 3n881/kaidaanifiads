"use client";

import { useEffect } from "react";
import type { Product } from "@/data/catalog";
import { UI_COPY } from "@/lib/i18n";
import BuyButton from "./BuyButton";
import { useLanguage } from "./LanguageProvider";

/**
 * Mobile-only bottom bar with title, price and Buy — always on screen on a
 * product page (as on the previous site), so Reel visitors can buy from
 * anywhere while the preview viewer takes the first screen. Sits above the
 * site's BottomNav.
 */
export default function StickyBuyBar({ product }: { product: Product }) {
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
      <p className="font-deva mx-auto max-w-md truncate text-[11px] font-semibold text-brand-600">
        {product.title}
      </p>
      <div className="mx-auto mt-1 flex max-w-md items-center gap-3">
        <div className="shrink-0 leading-tight">
          <span className="block text-xs text-brand-400 line-through">₹{product.mrp}</span>
          <span className="block text-xl font-extrabold text-brand-700">₹{product.price}</span>
        </div>
        <div className="min-w-0 flex-1">
          <BuyButton
            product={product}
            label={UI_COPY[locale].downloadNow}
            className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3 text-sm font-extrabold text-brand-teal shadow-sm transition hover:brightness-95 active:scale-[0.98]"
          />
        </div>
      </div>
    </div>
  );
}
