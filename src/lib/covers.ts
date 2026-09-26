// ---------------------------------------------------------------------------
// CLIENT-SAFE cover URL helpers. Covers are stored as three WebP variants:
//   <slug>-v<timestamp>-200.webp / -400.webp / -800.webp
// `products.cover_image` holds the 800 px URL; the others are derived.
// ---------------------------------------------------------------------------

export const COVER_WIDTHS = [200, 400, 800] as const;

const VARIANT_RE = /-(200|400|800)\.webp$/;

export function coverVariantPath(base: string, width: number): string {
  return `${base}-${width}.webp`;
}

/** `srcset` for a variant-style cover URL, or null for legacy single images. */
export function coverSrcSet(url: string): string | null {
  if (!VARIANT_RE.test(url)) return null;
  return COVER_WIDTHS.map((w) => `${url.replace(VARIANT_RE, `-${w}.webp`)} ${w}w`).join(", ");
}

/** A sensible default `src` (400 px) for browsers that ignore srcset. */
export function coverSrc(url: string): string {
  return VARIANT_RE.test(url) ? url.replace(VARIANT_RE, "-400.webp") : url;
}
