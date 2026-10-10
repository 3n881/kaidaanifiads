"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/data/catalog";
import ProductCard from "./ProductCard";

/**
 * Swipeable book row (as on the original site): one ¾-width card on phones
 * with the next one peeking, 2 on tablets, 4 on desktop. Snaps card by card.
 * It also moves by itself, one card every few seconds, on every screen size
 * (as on the original site): pauses while hovered or touched (resumes a few
 * seconds after the last touch), while off-screen and in background tabs;
 * wraps to the start; respects prefers-reduced-motion.
 */
const AUTO_ADVANCE_MS = 3500;
const RESUME_AFTER_TOUCH_MS = 5000;

// Card widths: ¾ of the screen on phones, ½ on tablets, ¼ of the 72rem row.
const ROW_SIZES = "(max-width: 640px) 75vw, (max-width: 1024px) 50vw, 270px";

export default function Carousel({
  products,
  priorityFirst = false,
}: {
  products: Product[];
  /** Load the first cover immediately (it is the phone LCP image on the home page). */
  priorityFirst?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const touchedUntil = useRef(0);
  const visibleRef = useRef(false);

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
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0.3 });
    observer.observe(el);
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden || !visibleRef.current) return;
      if (Date.now() < touchedUntil.current) return;
      if (el.scrollWidth <= el.clientWidth + 4) return;
      const cardW = el.firstElementChild?.getBoundingClientRect().width ?? 280;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: cardW, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearInterval(id);
      observer.disconnect();
    };
  }, [products.length]);

  // A thumb on the row (or a swipe) pauses the auto-move for a few seconds.
  const holdForTouch = () => {
    touchedUntil.current = Date.now() + RESUME_AFTER_TOUCH_MS;
  };

  return (
    <div className="relative mx-auto max-w-6xl">
      <div
        ref={trackRef}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={holdForTouch}
        onTouchMove={holdForTouch}
        onTouchEnd={holdForTouch}
        onWheel={holdForTouch}
        className="no-scrollbar -ml-4 flex snap-x snap-mandatory overflow-x-auto pb-2"
      >
        {products.map((p, i) => (
          <div key={p.id} className="min-w-0 shrink-0 basis-3/4 snap-start pl-4 sm:basis-1/2 lg:basis-1/4">
            <ProductCard product={p} sizes={ROW_SIZES} priority={priorityFirst && i === 0} />
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => nudge(-1)}
            className="absolute -left-3 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-teal shadow-md transition hover:bg-brand-50 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
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
