import type { Product } from "@/data/catalog";
import { coverSrc, coverSrcSet } from "@/lib/covers";

const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px";

/**
 * Book cover. Shows the uploaded image when the admin has set one; otherwise
 * falls back to a branded navy gradient with the title overlaid.
 *
 * Covers are pre-resized WebP variants served straight from Supabase Storage
 * (no /_next/image round-trip). `priority` is only for the one LCP cover on a
 * detail page; every other cover lazy-loads.
 */
export default function CoverImage({
  product,
  className = "",
  priority = false,
  sizes = CARD_SIZES,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (product.coverImage) {
    const srcSet = coverSrcSet(product.coverImage);
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized variants, see above */}
        <img
          src={coverSrc(product.coverImage)}
          srcSet={srcSet ?? undefined}
          sizes={srcSet ? sizes : undefined}
          alt={product.title}
          width={600}
          height={800}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${product.cover.from}, ${product.cover.to})`,
      }}
      aria-hidden
    >
      {/* decorative seal */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-black/10" />

      <div className="relative z-10 flex items-center gap-1.5 p-3 text-[11px] font-semibold text-white/90">
        <span className="text-base leading-none">📘</span>
        <span>PDF E-Book</span>
      </div>

      <div className="relative z-10 px-3 pb-4">
        <p className="font-deva text-sm font-bold leading-snug text-white line-clamp-4 drop-shadow">
          {product.title}
        </p>
        {product.isCombo && (
          <span className="mt-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {product.setSize ? `${product.setSize} Book Set` : "Combo Pack"}
          </span>
        )}
      </div>
    </div>
  );
}
