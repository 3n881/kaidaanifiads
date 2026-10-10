"use client";

import { useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Sparkles } from "lucide-react";
import type { Product } from "@/data/catalog";
import { coverSrc, coverSrcSet } from "@/lib/covers";
import { PREVIEW_PAGES } from "@/lib/previews";
import CoverImage from "./CoverImage";
import SampleReader from "./SampleReader";
import { GALLERY_COPY, type GalleryCopy } from "@/lib/product-copy";
import type { Locale } from "@/lib/i18n";

/**
 * Book preview viewer, laid out like the previous site: page counter and
 * PREVIEW badge on the image, arrows / swipe, previous–next buttons, the
 * "first pages free" bar and an in-page sample reader that shows the free
 * first pages of the book's own PDF (`previewUrl`) — never a new tab.
 */
export default function ProductGallery({
  product,
  previewUrl,
  labelsLocale = "mr",
}: {
  product: Product;
  previewUrl?: string | null;
  /** Language of the labels (the edition on show). */
  labelsLocale?: Locale;
}) {
  const g = GALLERY_COPY[labelsLocale];
  // After the cover: the book's real pages 2–6 (made from its PDF) when
  // available, otherwise the owner's preview images.
  const readerPages = product.readerPages ?? [];
  const extra = readerPages.length > 1 ? readerPages.slice(1, 6) : (product.galleryImages ?? []).slice(0, 5);
  const images = product.coverImage ? [product.coverImage, ...extra] : [];
  const [selected, setSelected] = useState(0);
  const [readerAt, setReaderAt] = useState<number | null>(null);
  const total = images.length;
  const previewPages = Math.min(PREVIEW_PAGES, product.pages || PREVIEW_PAGES);
  const go = (step: number) =>
    setSelected((current) => Math.min(Math.max(current + step, 0), total - 1));
  const swipe = useSwipe(go);

  if (total === 0) {
    return (
      <div>
        <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-cardhover)]">
          <CoverImage product={product} className="aspect-[3/4] w-full" priority sizes="(max-width: 768px) 90vw, 400px" />
        </div>
        <PreviewActions g={g} previewPages={previewPages} previewUrl={previewUrl} onOpen={() => setReaderAt(0)} />
        {readerAt !== null && (
          <SampleReader product={product} previewUrl={previewUrl} pages={readerPages} images={images} startPage={readerAt} g={g} onClose={() => setReaderAt(null)} />
        )}
      </div>
    );
  }

  const active = images[Math.min(selected, total - 1)];
  const activeSrcSet = coverSrcSet(active);

  return (
    <div>
      <div className="rounded-2xl border border-brand-100 bg-white p-2 shadow-[var(--shadow-cardhover)]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-brand-900" {...swipe}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase files are pre-sized WebP variants. */}
          <img
            src={coverSrc(active)}
            srcSet={activeSrcSet ?? undefined}
            sizes="(max-width: 768px) 90vw, 400px"
            alt={selected === 0 ? product.title : `${product.title} — ${g.page} ${selected + 1}`}
            width={800}
            height={1067}
            loading={selected === 0 ? "eager" : "lazy"}
            fetchPriority={selected === 0 ? "high" : "auto"}
            className="absolute inset-0 h-full w-full cursor-pointer object-contain"
            onClick={() => setReaderAt(readerPages.length || !previewUrl ? selected : 0)}
          />
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
            {g.page} {selected + 1} / {total}
          </span>
          <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-brand-teal px-2 py-1 text-[10px] font-black tracking-wider text-brand-gold">
            PREVIEW
          </span>
          {selected > 0 && (
            <ArrowButton side="left" onClick={() => go(-1)} label={g.prevPage} />
          )}
          {selected < total - 1 && (
            <ArrowButton side="right" onClick={() => go(1)} label={g.nextPage} />
          )}
          {selected === 0 && total > 1 && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white md:hidden">
              {g.swipe}
            </span>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <PagerButton disabled={selected === 0} onClick={() => go(-1)}>
            <ChevronLeft className="h-4 w-4" /> {g.prev}
          </PagerButton>
          <span className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold text-brand-700">
            {g.page} {selected + 1} / {total}
          </span>
          <PagerButton disabled={selected === total - 1} onClick={() => go(1)}>
            {g.next} <ChevronRight className="h-4 w-4" />
          </PagerButton>
        </div>
      )}

      <PreviewActions
        g={g}
        previewPages={previewPages}
        previewUrl={previewUrl}
        onOpen={() => setReaderAt(previewUrl ? 0 : selected)}
      />

      {total > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Book preview pages">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={index === 0 ? g.cover : `${g.page} ${index + 1}`}
              aria-pressed={selected === index}
              className={`shrink-0 overflow-hidden rounded-lg border-2 bg-white text-center ${selected === index ? "border-brand-teal" : "border-brand-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized storage thumbnail. */}
              <img src={coverSrc(image)} alt="" width={48} height={64} loading="lazy" className="h-16 w-12 object-cover" />
              <span className="block py-0.5 text-[10px] font-bold text-brand-600">
                {index === 0 ? g.cover : index + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {readerAt !== null && (
        <SampleReader product={product} previewUrl={previewUrl} pages={readerPages} images={images} startPage={readerAt} g={g} onClose={() => setReaderAt(null)} />
      )}
    </div>
  );
}

function PreviewActions({
  g,
  previewPages,
  previewUrl,
  onOpen,
}: {
  g: GalleryCopy;
  previewPages: number;
  previewUrl?: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {previewUrl && (
        <button
          type="button"
          onClick={onOpen}
          className="font-deva flex w-full items-center justify-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-gold-500/20"
        >
          <BookOpen className="h-4 w-4 text-gold-600" />
          {g.freePreview(previewPages)}
          <Sparkles className="h-4 w-4 text-gold-600" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="font-deva inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
      >
        <Maximize2 className="h-3.5 w-3.5" /> {g.readLarge}
      </button>
    </div>
  );
}

function ArrowButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-800 shadow-md transition hover:bg-white ${side === "left" ? "left-2" : "right-2"}`}
    >
      {side === "left" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function PagerButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="font-deva inline-flex min-h-9 items-center gap-1 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Horizontal swipe → previous / next page. */
function useSwipe(go: (step: number) => void) {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (event: React.TouchEvent) => {
      start.current = event.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (event: React.TouchEvent) => {
      if (start.current === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? start.current) - start.current;
      start.current = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    },
  };
}
