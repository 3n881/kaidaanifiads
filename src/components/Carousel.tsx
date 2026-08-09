"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/data/catalog";
import ProductCard from "./ProductCard";

/**
 * Mobile (< md): 2-per-row grid, no carousel.
 * Desktop (>= md): a seamless auto-scrolling marquee (the row is duplicated so
 * the loop is invisible). Pauses on hover; arrows nudge it; respects
 * prefers-reduced-motion.
 */
export default function Carousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const step = () => {
      if (!pausedRef.current && el.clientWidth > 0) {
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
        el.scrollLeft += 0.5;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.getBoundingClientRect().width ?? 280;
    el.scrollBy({ left: dir * cardW, behavior: "smooth" });
  };

  return (
    <>
      {/* Mobile: 2-per-row grid */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Desktop: auto-scrolling marquee */}
      <div className="relative hidden md:block">
        <div
          ref={trackRef}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          className="no-scrollbar -ml-5 flex overflow-x-auto pb-1"
        >
          {[...products, ...products].map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="min-w-0 shrink-0 basis-1/3 pl-5 lg:basis-1/4"
              aria-hidden={i >= products.length}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        <button
          aria-label="मागे"
          onClick={() => nudge(-1)}
          className="absolute -left-3 top-[38%] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-teal shadow-md transition hover:bg-brand-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="पुढे"
          onClick={() => nudge(1)}
          className="absolute -right-3 top-[38%] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-teal shadow-md transition hover:bg-brand-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
