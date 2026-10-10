"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/data/catalog";
import ProductCard from "./ProductCard";

/**
 * Swipeable book row (as on the original site): one ¾-width card on phones
 * with the next one peeking, 2 on tablets, 4 on desktop. Snaps card by card.
 * On desktop it also advances by one card every few seconds (pauses on hover,
 * wraps to the start); respects prefers-reduced-motion.
 */
const AUTO_ADVANCE_MS = 4000;

export default function Carousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.getBoundingClientRect().width ?? 280;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * cardW, behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Auto-advance on wide screens only — on a phone it would fight the thumb.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (el.scrollWidth <= el.clientWidth + 4) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      const cardW = el.firstElementChild?.getBoundingClientRect().width ?? 280;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: cardW, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [products.length]);

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        ref={trackRef}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        className="no-scrollbar -ml-4 flex snap-x snap-mandatory overflow-x-auto pb-2"
      >
        {products.map((p) => (
          <div key={p.id} className="min-w-0 shrink-0 basis-3/4 snap-start pl-4 sm:basis-1/2 lg:basis-1/4">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <>
          <button
            type="button"
            aria-label="मागे"
            onClick={() => nudge(-1)}
            className="absolute -left-3 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-teal shadow-md transition hover:bg-brand-50 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="पुढे"
            onClick={() => nudge(1)}
            className="absolute -right-3 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-teal shadow-md transition hover:bg-brand-50 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
