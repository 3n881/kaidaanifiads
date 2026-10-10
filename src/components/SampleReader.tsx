"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, Hand, Loader2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { Product } from "@/data/catalog";
import { coverSrc, mediaUrl } from "@/lib/covers";
import type { GalleryCopy } from "@/lib/product-copy";
import BuyButton from "./BuyButton";

// Worker + helper data copied from pdfjs-dist by scripts/copy-pdfjs.mjs.
const PDFJS_BASE = "/vendor/pdfjs-6.3.289";
const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/**
 * In-page sample reader (as on the original site): the free preview pages of
 * the book's own PDF, rendered on the page — no new tab, no download. Zoom,
 * rotate, arrows / swipe, page thumbnails and Buy buttons. Falls back to the
 * uploaded preview images when an edition has no preview PDF (or it fails).
 * PDF.js is only downloaded when the reader opens.
 */
export default function SampleReader({
  product,
  previewUrl,
  images,
  startPage = 0,
  g,
  onClose,
}: {
  product: Product;
  previewUrl?: string | null;
  images: string[];
  startPage?: number;
  g: GalleryCopy;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [mode, setMode] = useState<"loading" | "pdf" | "images">(previewUrl ? "loading" : "images");
  const [page, setPage] = useState(startPage);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoom = ZOOMS[zoomIndex];
  // Stage size, so pages fit the screen and re-fit on rotate / resize.
  const [stage, setStage] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStage({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = mode === "pdf" && doc ? doc.numPages : images.length;
  const go = (step: number) => setPage((p) => Math.min(Math.max(p + step, 0), Math.max(total - 1, 0)));

  // Lock page scroll; keyboard: Esc closes, arrows turn pages.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => p + 1);
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Load PDF.js and the preview PDF.
  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
        const loading = pdfjs.getDocument({
          url: previewUrl,
          standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
          wasmUrl: `${PDFJS_BASE}/wasm/`,
          iccUrl: `${PDFJS_BASE}/iccs/`,
        });
        task = loading;
        const loaded = await loading.promise;
        if (cancelled) return;
        setDoc(loaded);
        setPage((p) => Math.min(p, loaded.numPages - 1));
        setMode("pdf");
      } catch (err) {
        console.error("[reader] preview PDF failed", err);
        if (cancelled) return;
        setMode("images");
        if (images.length === 0) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [previewUrl, images.length]);

  // Small page thumbnails for the strip.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      const out: string[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        try {
          const p = await doc.getPage(n);
          const v = p.getViewport({ scale: 96 / p.getViewport({ scale: 1 }).width });
          const c = document.createElement("canvas");
          c.width = Math.ceil(v.width);
          c.height = Math.ceil(v.height);
          await p.render({ canvas: c, viewport: v }).promise;
          out.push(c.toDataURL("image/jpeg", 0.7));
        } catch {
          out.push("");
        }
        if (cancelled) return;
        setThumbs([...out]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  // Render the current page to fit the stage, then apply zoom / rotation.
  useEffect(() => {
    if (mode !== "pdf" || !doc || !canvasRef.current || !stage.w) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(Math.min(page, doc.numPages - 1) + 1);
      if (cancelled || !canvasRef.current) return;
      const base = p.getViewport({ scale: 1, rotation });
      const fit = Math.min((stage.w - 32) / base.width, (stage.h - 32) / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = p.getViewport({ scale: fit * zoom * dpr, rotation });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      task = p.render({ canvas, viewport });
      try {
        await task.promise;
      } catch {
        // superseded by a newer render
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [mode, doc, page, zoom, rotation, stage.w, stage.h]);

  // Swipe to turn pages (only when not zoomed in, so zoomed pages can be panned).
  const touchX = useRef<number | null>(null);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      touchX.current = zoom <= 1 ? e.touches[0].clientX : null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      touchX.current = null;
    },
  };

  const buyLabel = `${g.buy} (₹${product.price})`;
  const buyClass =
    "font-deva flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-extrabold text-brand-teal shadow-lg transition hover:bg-yellow-400 active:scale-[0.98]";
  const tool = "flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-white/15 disabled:opacity-40";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${product.title} — ${g.reader}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-brand-teal text-white shadow-2xl sm:h-[92vh] sm:max-w-3xl sm:rounded-2xl"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <BookOpen className="hidden h-5 w-5 shrink-0 text-brand-gold sm:block" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-deva truncate text-sm font-bold sm:text-base">{product.title}</p>
            <p className="font-deva text-[11px] text-white/70">
              {g.reader} — {g.page} {Math.min(page + 1, Math.max(total, 1))} / {Math.max(total, 1)}
            </p>
          </div>
          <div className="hidden items-center gap-0.5 rounded-lg bg-white/10 p-0.5 sm:flex">
            <button type="button" className={tool} onClick={() => setZoomIndex((i) => Math.max(i - 1, 0))} disabled={zoomIndex === 0} aria-label={g.zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-11 text-center font-mono text-xs font-bold">{Math.round(zoom * 100)}%</span>
            <button type="button" className={tool} onClick={() => setZoomIndex((i) => Math.min(i + 1, ZOOMS.length - 1))} disabled={zoomIndex === ZOOMS.length - 1} aria-label={g.zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" className={tool} onClick={() => setRotation((r) => (r + 90) % 360)} aria-label={g.rotate}>
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden sm:block">
            <BuyButton product={product} label={buyLabel} showIcon={false} className={buyClass} />
          </div>
          <button type="button" onClick={onClose} aria-label={g.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* phone toolbar */}
        <div className="flex items-center justify-center gap-1 border-b border-white/10 py-1 sm:hidden">
          <button type="button" className={tool} onClick={() => setZoomIndex((i) => Math.max(i - 1, 0))} disabled={zoomIndex === 0} aria-label={g.zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center font-mono text-xs font-bold">{Math.round(zoom * 100)}%</span>
          <button type="button" className={tool} onClick={() => setZoomIndex((i) => Math.min(i + 1, ZOOMS.length - 1))} disabled={zoomIndex === ZOOMS.length - 1} aria-label={g.zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" className={tool} onClick={() => setRotation((r) => (r + 90) % 360)} aria-label={g.rotate}>
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* page */}
        <div className="relative min-h-0 flex-1 bg-[#071a33]">
          <div ref={stageRef} className="absolute inset-0 overflow-auto" {...swipe}>
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              {mode === "loading" && (
                <p className="font-deva flex items-center gap-2 text-sm text-white/80">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {g.loading}
                </p>
              )}
              {mode === "pdf" && <canvas ref={canvasRef} className="block bg-white shadow-2xl" />}
              {mode === "images" && images.length > 0 && (
                // eslint-disable-next-line @next/next/no-img-element -- pre-sized storage images.
                <img
                  src={mediaUrl(images[Math.min(page, images.length - 1)])}
                  alt={`${product.title} — ${g.page} ${page + 1}`}
                  className="block max-w-none bg-white shadow-2xl"
                  style={{
                    height: stage.h ? Math.max(stage.h - 32, 100) * zoom : undefined,
                    width: "auto",
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
              )}
              {error && <p className="font-deva text-center text-sm text-white/80">{g.failed}</p>}
            </div>
          </div>
          {total > 1 && page > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label={g.prevPage} className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:left-4">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {total > 1 && page < total - 1 && (
            <button type="button" onClick={() => go(1)} aria-label={g.nextPage} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:right-4">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {zoom > 1 && (
            <span className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white sm:hidden">
              <Hand className="h-3 w-3" aria-hidden="true" /> ↔ ↕
            </span>
          )}
        </div>

        {/* thumbnails + buy */}
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {Array.from({ length: total }, (_, i) => {
              const src = mode === "pdf" ? thumbs[i] : images[i] ? coverSrc(images[i]) : "";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`${g.page} ${i + 1}`}
                  aria-current={page === i ? "page" : undefined}
                  className={`relative h-14 w-10 shrink-0 overflow-hidden rounded border-2 bg-white/90 ${page === i ? "border-brand-gold" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- generated thumbnail / storage image.
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[9px] font-bold text-white">{i + 1}</span>
                </button>
              );
            })}
          </div>
          <BuyButton product={product} label={`${g.buyFull} - ₹${product.price}`} className={`${buyClass} w-full sm:w-auto sm:px-6 sm:py-3`} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
