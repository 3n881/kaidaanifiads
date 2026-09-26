"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";
import BuyButton from "./BuyButton";

/**
 * Mobile-only bottom bar with price + Buy, shown whenever the main Buy button
 * (element with id `targetId`) is off screen — Reel visitors can buy from
 * anywhere on the page. Sits above the site's BottomNav.
 */
export default function StickyBuyBar({
  product,
  targetId,
}: {
  product: Product;
  targetId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting;
      setVisible(show);
      // Lets the floating WhatsApp / back-to-top buttons move above the bar.
      document.body.dataset.buybar = show ? "on" : "off";
    });
    io.observe(target);
    return () => {
      io.disconnect();
      delete document.body.dataset.buybar;
    };
  }, [targetId]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-14 z-40 border-t border-brand-100 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(10,35,66,0.08)] backdrop-blur transition-transform duration-200 lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-[200%]"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="shrink-0 leading-tight">
          <span className="block text-xs text-brand-400 line-through">₹{product.mrp}</span>
          <span className="block text-xl font-extrabold text-brand-700">₹{product.price}</span>
        </div>
        <div className="min-w-0 flex-1">
          <BuyButton product={product} label="खरेदी करा · PDF लगेच मिळवा" />
        </div>
      </div>
    </div>
  );
}
