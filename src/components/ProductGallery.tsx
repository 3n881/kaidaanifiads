"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Maximize2, Sparkles, X } from "lucide-react";
import type { Product } from "@/data/catalog";
import { coverSrc, coverSrcSet } from "@/lib/covers";
import { PREVIEW_PAGES } from "@/lib/previews";
import CoverImage from "./CoverImage";

/**
 * Book preview viewer, laid out like the previous site: page counter and
 * PREVIEW badge on the image, arrows / swipe, मागील–पुढील buttons, the
 * "first pages free" bar, a full-screen reader and a link to the free
 * first-pages PDF (`previewUrl`, when the edition has one).
 */
export default function ProductGallery({
  product,
  previewUrl,
}: {
  product: Product;
  previewUrl?: string | null;
}) {
  const images = product.coverImage
    ? [product.coverImage, ...(product.galleryImages ?? []).slice(0, 5)]
    : [];
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
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
        <PreviewActions previewPages={previewPages} previewUrl={previewUrl} />
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
            alt={selected === 0 ? product.title : `${product.title} — पान ${selected + 1}`}
            width={800}
            height={1067}
            loading={selected === 0 ? "eager" : "lazy"}
            fetchPriority={selected === 0 ? "high" : "auto"}
            className="absolute inset-0 h-full w-full cursor-zoom-in object-contain"
            onClick={() => setFullscreen(true)}
          />
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
            पान {selected + 1} / {total}
          </span>
          <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-brand-teal px-2 py-1 text-[10px] font-black tracking-wider text-brand-gold">
            PREVIEW
          </span>
          {selected > 0 && (
            <ArrowButton side="left" onClick={() => go(-1)} label="मागील पान" />
          )}
          {selected < total - 1 && (
            <ArrowButton side="right" onClick={() => go(1)} label="पुढील पान" />
          )}
          {selected === 0 && total > 1 && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white md:hidden">
              स्वाईप करा ›
            </span>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <PagerButton disabled={selected === 0} onClick={() => go(-1)}>
            <ChevronLeft className="h-4 w-4" /> मागील
          </PagerButton>
          <span className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold text-brand-700">
            पान {selected + 1} / {total}
          </span>
          <PagerButton disabled={selected === total - 1} onClick={() => go(1)}>
            पुढील <ChevronRight className="h-4 w-4" />
          </PagerButton>
        </div>
      )}

      <PreviewActions
        previewPages={previewPages}
        previewUrl={previewUrl}
        onOpenLarge={() => setFullscreen(true)}
      />

      {total > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Book preview pages">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={index === 0 ? "कव्हर" : `पान ${index + 1}`}
              aria-pressed={selected === index}
              className={`shrink-0 overflow-hidden rounded-lg border-2 bg-white text-center ${selected === index ? "border-brand-teal" : "border-brand-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized storage thumbnail. */}
              <img src={coverSrc(image)} alt="" width={48} height={64} loading="lazy" className="h-16 w-12 object-cover" />
              <span className="block py-0.5 text-[10px] font-bold text-brand-600">
                {index === 0 ? "कव्हर" : index + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {fullscreen && (
        <Lightbox
          images={images}
          index={selected}
          title={product.title}
          previewUrl={previewUrl}
          onChange={setSelected}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

function PreviewActions({
  previewPages,
  previewUrl,
  onOpenLarge,
}: {
  previewPages: number;
  previewUrl?: string | null;
  onOpenLarge?: () => void;
}) {
  if (!previewUrl && !onOpenLarge) return null;
  return (
    <div className="mt-3 space-y-2">
      {previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-deva flex items-center justify-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-gold-500/20"
        >
          <BookOpen className="h-4 w-4 text-gold-600" />
          पहिली {previewPages} पाने मोफत वाचा (Preview)
          <Sparkles className="h-4 w-4 text-gold-600" />
        </a>
      )}
      <div className={`grid gap-2 ${onOpenLarge && previewUrl ? "grid-cols-2" : "grid-cols-1"}`}>
        {onOpenLarge && (
          <button
            type="button"
            onClick={onOpenLarge}
            className="font-deva inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            <Maximize2 className="h-3.5 w-3.5" /> मोठ्या आकारात वाचा
          </button>
        )}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            <FileText className="h-3.5 w-3.5" /> PDF Preview
          </a>
        )}
      </div>
    </div>
  );
}

function Lightbox({
  images,
  index,
  title,
  previewUrl,
  onChange,
  onClose,
}: {
  images: string[];
  index: number;
  title: string;
  previewUrl?: string | null;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const go = (step: number) => onChange(Math.min(Math.max(index + step, 0), total - 1));
  const swipe = useSwipe(go);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step) onChange(Math.min(Math.max(index + step, 0), total - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, total, onChange, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — preview`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="text-sm font-bold">पान {index + 1} / {total}</span>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
              <FileText className="h-3.5 w-3.5" /> PDF Preview
            </a>
          )}
          <button type="button" onClick={onClose} aria-label="बंद करा" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1" {...swipe}>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size storage image. */}
        <img src={images[index]} alt={`${title} — पान ${index + 1}`} className="absolute inset-0 m-auto max-h-full max-w-full object-contain" />
        {index > 0 && <ArrowButton side="left" onClick={() => go(-1)} label="मागील पान" />}
        {index < total - 1 && <ArrowButton side="right" onClick={() => go(1)} label="पुढील पान" />}
      </div>
    </div>,
    document.body,
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
