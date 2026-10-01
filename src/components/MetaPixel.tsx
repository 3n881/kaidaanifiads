"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pixelProduct, trackPixel } from "@/lib/meta-pixel";

/**
 * Sends one Meta Pixel PageView per page. The pixel script loads on the first
 * event, after the page is interactive, so it never delays the first paint of
 * a Reel visit. Never runs on order / my-books / dashboard pages.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    trackPixel("PageView");
  }, [pathname]);
  return null;
}

/** Fires ViewContent once when a book page opens. */
export function TrackViewContent({
  product,
}: {
  product: { id: number; title: string; price: number };
}) {
  const { id, title, price } = product;
  useEffect(() => {
    trackPixel("ViewContent", pixelProduct({ id, title, price }));
  }, [id, title, price]);
  return null;
}
