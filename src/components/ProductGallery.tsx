"use client";

import { useState } from "react";
import type { Product } from "@/data/catalog";
import { coverSrc, coverSrcSet } from "@/lib/covers";
import CoverImage from "./CoverImage";

export default function ProductGallery({ product }: { product: Product }) {
  const images = product.coverImage
    ? [product.coverImage, ...(product.galleryImages ?? []).slice(0, 5)]
    : [];
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return <CoverImage product={product} className="aspect-[3/4] w-full" priority sizes="(max-width: 768px) 90vw, 400px" />;
  }

  const active = images[Math.min(selected, images.length - 1)];
  const activeSrcSet = coverSrcSet(active);

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase files are pre-sized WebP variants. */}
        <img
          src={coverSrc(active)}
          srcSet={activeSrcSet ?? undefined}
          sizes="(max-width: 768px) 90vw, 400px"
          alt={selected === 0 ? product.title : `${product.title} — preview page ${selected}`}
          width={800}
          height={1067}
          loading={selected === 0 ? "eager" : "lazy"}
          fetchPriority={selected === 0 ? "high" : "auto"}
          className={`absolute inset-0 h-full w-full ${selected === 0 ? "object-cover" : "object-contain"}`}
        />
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Book preview images">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={index === 0 ? "Show cover" : `Show preview page ${index}`}
              aria-pressed={selected === index}
              className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${selected === index ? "border-brand-teal" : "border-brand-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized storage thumbnail. */}
              <img src={coverSrc(image)} alt="" width={48} height={64} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
