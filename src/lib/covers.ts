// ---------------------------------------------------------------------------
// CLIENT-SAFE cover URL helpers. Covers (and preview / reader page images) are
// stored as WebP variants:
//   <slug>-v<timestamp>-200.webp / -400.webp / -600.webp / -800.webp
// `products.cover_image` holds the 800 px URL; the others are derived.
// 600 px was added 2026-10-11 (PageSpeed: phones were sent 800 px for ~490 px
// slots); `npm run db:cover-600` created it for every image uploaded before.
// ---------------------------------------------------------------------------

export const COVER_WIDTHS = [200, 400, 600, 800] as const;

const VARIANT_RE = /-(200|400|600|800)\.webp$/;

// With NEXT_PUBLIC_MEDIA_PROXY=true (production behind Cloudflare), public
// files from the Supabase `covers` bucket are served as /media/<path> from our
// own domain so Cloudflare caches them in India (src/app/media/[...path]).
// Off by default: without a CDN in front the extra hop only adds latency.
const MEDIA_PROXY = process.env.NEXT_PUBLIC_MEDIA_PROXY === "true";
const PUBLIC_COVERS_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/covers\//;

/** Same file, served via /media when the media proxy is on. */
export function mediaUrl(url: string): string {
  return MEDIA_PROXY ? url.replace(PUBLIC_COVERS_RE, "/media/") : url;
}

/** Book covers are shown in 3:4 boxes (width / height = 0.75). */
export const BOOK_RATIO = 3 / 4;

/** True when width × height is close enough to 3:4 to show uncropped (±3 %). */
export function isBookShaped(width: number, height: number): boolean {
  if (!width || !height) return true;
  return Math.abs(width / height - BOOK_RATIO) / BOOK_RATIO <= 0.03;
}

export function coverVariantPath(base: string, width: number): string {
  return `${base}-${width}.webp`;
}

/** `srcset` for a variant-style cover URL, or null for legacy single images. */
export function coverSrcSet(url: string): string | null {
  if (!VARIANT_RE.test(url)) return null;
  return COVER_WIDTHS.map((w) => `${mediaUrl(url.replace(VARIANT_RE, `-${w}.webp`))} ${w}w`).join(", ");
}

/** A sensible default `src` (400 px) for browsers that ignore srcset. */
export function coverSrc(url: string): string {
  return mediaUrl(VARIANT_RE.test(url) ? url.replace(VARIANT_RE, "-400.webp") : url);
}

/** Smallest variant (200 px) for tiny thumbnails. */
export function coverThumbSrc(url: string): string {
  return mediaUrl(VARIANT_RE.test(url) ? url.replace(VARIANT_RE, "-200.webp") : url);
}
