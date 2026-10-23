"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pixelProduct, trackPixel } from "@/lib/meta-pixel";
import { trackVisit } from "@/lib/visit-tracking";

/**
 * Sends one Meta Pixel PageView per page. The pixel script loads on the first
 * event, after the page is interactive, so it never delays the first paint of
 * a Reel visit. Never runs on order / my-books / dashboard pages.
 * Also starts our own visit record (src/lib/visit-tracking.ts) for the admin funnel.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    trackPixel("PageView");
    trackVisit("page");
  }, [pathname]);
  return null;
}

/** Fires ViewContent (and our book_view funnel step) once when a book page opens. */
export function TrackViewContent({
  product,
}: {
  product: { id: number; title: string; price: number };
}) {
  const { id, title, price } = product;
  useEffect(() => {
    trackPixel("ViewContent", pixelProduct({ id, title, price }));
    trackVisit("book_view", id);
  }, [id, title, price]);
  return null;
}
