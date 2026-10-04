// ---------------------------------------------------------------------------
// Free "first pages" preview PDFs, like the previous site's "PDF Preview".
// Each edition's preview lives at a fixed public path in the `covers` bucket:
//   previews/<slug>-<locale>.pdf
// so pages can link to it without a database column. It is (re)built whenever
// that edition's PDF is uploaded, and removed with it.
// CLIENT-SAFE: only the URL helper and constants live here; building and
// uploading are in `preview-pdf.ts`.
// ---------------------------------------------------------------------------

import { mediaUrl } from "./covers";

export const PREVIEW_PAGES = 6;

export function previewPdfPath(slug: string, locale: string): string {
  return `previews/${slug}-${locale}.pdf`;
}

/** Public URL of an edition's preview PDF (null when Supabase isn't set up). */
export function previewPdfUrl(slug: string, locale: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return mediaUrl(`${base.replace(/\/$/, "")}/storage/v1/object/public/covers/${previewPdfPath(slug, locale)}`);
}
