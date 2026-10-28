"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Sparkles } from "lucide-react";
import type { Product } from "@/data/catalog";
import { coverSrc, coverSrcSet, PHONE_COVER_MAX, PHONE_COVER_SIZES, WIDE_COVER_SIZES, WIDE_MEDIA } from "@/lib/covers";
import { PREVIEW_PAGES } from "@/lib/previews";
import CoverImage from "./CoverImage";
import dynamic from "next/dynamic";

// The reader (and PDF.js behind it) is only downloaded when someone opens it —
// it was part of every book page's first JavaScript (PageSpeed 2026-10-11).
const SampleReader = dynamic(() => import("./SampleReader"), { ssr: false });
import { GALLERY_COPY, type GalleryCopy } from "@/lib/product-copy";
import type { Locale } from "@/lib/i18n";

/** Another book shown in the cover slider, with the line on its slide. */
export type GallerySlide = { product: Product; label: string };

/**
 * Cover slider (client, 2026-10-28): this book's cover first, then the covers
 * of related books (a combo's books, the combos with this book, or other
 * titles) — swipe on phones with the next cover peeking, arrows on computers.
 * Other covers link to their own page. The sample pages open in the in-page
 * reader from this book's cover or the "first pages free" button — never a
 * new tab.
 */
export default function ProductGallery({
  product,
  previewUrl,
  labelsLocale = "mr",
  others = [],
  cover,
}: {
  product: Product;
  previewUrl?: string | null;
  /** Language of the labels (the edition on show). */
  labelsLocale?: Locale;
  others?: GallerySlide[];
  /** Shown instead of this book's cover (the ticked 2-book / 3-book set), with its line. */
  cover?: { image: string; alt: string; label: string };
}) {
  const g = GALLERY_COPY[labelsLocale];
  // The reader: cover first, then the book's real pages 2–6 (made from its
  // PDF) when available, otherwise the owner's preview images.
  const readerPages = product.readerPages ?? [];
  const extra = readerPages.length > 1 ? readerPages.slice(1, 6) : (product.galleryImages ?? []).slice(0, 5);
  const images = product.coverImage ? [product.coverImage, ...extra] : [];
  const readerList = readerPages.length > 1 && product.coverImage ? images : readerPages;
  const [readerAt, setReaderAt] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  // Covers are only downloaded up to one past the furthest slide reached (the
  // peeking one), so a first visit costs 2 covers, not every slide (page speed).
  const [reach, setReach] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const previewPages = Math.min(PREVIEW_PAGES, product.pages || PREVIEW_PAGES);
  const slides = product.coverImage ? others.filter((o) => o.product.coverImage) : [];
  const total = slides.length + 1;
  const heroImage = cover?.image ?? product.coverImage;

  // A new offer ticked → back to the first picture, so the new cover is seen.
  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [heroImage]);

  const openReader = () => setReaderAt(0);
  const reader =
    readerAt !== null ? (
      <SampleReader product={product} previewUrl={previewUrl} pages={readerList} images={images} startPage={readerAt} g={g} onClose={() => setReaderAt(null)} />
    ) : null;

  if (!heroImage) {
    return (
      <div>
        <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-cardhover)]">
          <CoverImage product={product} className="aspect-[3/4] w-full" priority sizes="(max-width: 768px) 90vw, 400px" />
        </div>
        <PreviewActions g={g} previewPages={previewPages} previewUrl={previewUrl} onOpen={openReader} />
        {reader}
      </div>
    );
  }

  const slideWidth = () => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return first ? first.getBoundingClientRect().width + 8 : 1;
  };
  const go = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.min(Math.max(index, 0), total - 1);
    el.scrollTo({ left: next * slideWidth(), behavior: "smooth" });
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const at = Math.min(Math.round(el.scrollLeft / slideWidth()), total - 1);
    setSelected(at);
    setReach((current) => Math.max(current, at));
  };
  // One cover: full width. More: ~84 % so the next cover peeks in (shows it can be swiped).
  const slideClass = `relative aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-xl bg-brand-900 ${total > 1 ? "w-[84%]" : "w-full"}`;

  return (
    <div>
      <div className="rounded-2xl border border-brand-100 bg-white p-2 shadow-[var(--shadow-cardhover)]">
        <div className="relative">
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain"
            aria-label={g.cover}
          >
            {/* This book (or the ticked set): the picture opens the sample reader. */}
            <div className={slideClass}>
              <picture key={heroImage}>
                <source media={WIDE_MEDIA} srcSet={coverSrcSet(heroImage) ?? undefined} sizes={WIDE_COVER_SIZES} />
                {/* Plain <img> on purpose: Supabase files are pre-sized WebP variants. */}
                <img
                  src={coverSrc(heroImage)}
                  srcSet={coverSrcSet(heroImage, PHONE_COVER_MAX) ?? undefined}
                  sizes={PHONE_COVER_SIZES}
                  alt={cover?.alt ?? product.title}
                  width={800}
                  height={1067}
                  loading="eager"
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full cursor-pointer object-contain"
                  onClick={openReader}
                />
              </picture>
              {cover && (
                <span className="font-deva pointer-events-none absolute inset-x-0 bottom-0 bg-green-700/90 px-3 py-1.5 text-center text-sm font-extrabold text-white">
                  {cover.label}
                </span>
              )}
              <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-brand-teal px-2 py-1 text-[10px] font-black tracking-wider text-brand-gold">
                PREVIEW
              </span>
            </div>

            {/* Related books: tap = their page. */}
            {slides.map(({ product: other, label }, index) => (
              <Link
                key={other.id}
                href={`/${other.isCombo ? "combos" : "ebooks"}/${other.slug}`}
                className={slideClass}
              >
                {index <= reach && (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variants
                  <img
                    src={coverSrc(other.coverImage!)}
                    srcSet={coverSrcSet(other.coverImage!, PHONE_COVER_MAX) ?? undefined}
                    sizes={PHONE_COVER_SIZES}
                    alt={other.title}
                    width={800}
                    height={1067}
                    loading="lazy"
                    fetchPriority="low"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-black/70 px-3 py-2 text-white">
                  <span className="min-w-0">
                    <span className="font-deva block text-[11px] font-bold text-brand-gold">{label}</span>
                    <span className="font-deva line-clamp-2 text-xs font-semibold leading-snug">{other.title}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="text-lg font-black text-green-400">₹{other.price}</span>
                    <span className="font-deva text-[11px] font-bold">{g.view} ›</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {total > 1 && (
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
              {selected + 1} / {total}
            </span>
          )}
          {selected > 0 && <ArrowButton side="left" onClick={() => go(selected - 1)} label={g.prev} />}
          {selected < total - 1 && <ArrowButton side="right" onClick={() => go(selected + 1)} label={g.next} />}
        </div>

        {total > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${index === selected ? "w-5 bg-brand-teal" : "w-1.5 bg-brand-200"}`}
              />
            ))}
          </div>
        )}
      </div>

      <PreviewActions g={g} previewPages={previewPages} previewUrl={previewUrl} onOpen={openReader} />
      {reader}
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
    <div className="mt-3">
      <button
        type="button"
        onClick={onOpen}
        className="font-deva flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-gold-500/20"
      >
        {previewUrl ? <BookOpen className="h-4 w-4 text-gold-600" /> : <Maximize2 className="h-4 w-4 text-gold-600" />}
        {previewUrl ? g.freePreview(previewPages) : g.readLarge}
        {previewUrl && <Sparkles className="h-4 w-4 text-gold-600" />}
      </button>
    </div>
  );
}

function ArrowButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-800 shadow-md transition hover:bg-white sm:flex ${side === "left" ? "left-2" : "right-2"}`}
    >
      {side === "left" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}
