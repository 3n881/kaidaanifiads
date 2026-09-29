// Server / script use only (never imported by client components): builds
// and publishes preview PDFs. Also used by scripts/upload-pdfs.ts.
import { PDFDocument } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PREVIEW_PAGES, previewPdfPath } from "./previews";

/** A PDF of the first `pages` pages of `source`. */
export async function buildPreviewPdf(
  source: Uint8Array | ArrayBuffer,
  pages = PREVIEW_PAGES,
): Promise<Uint8Array> {
  const book = await PDFDocument.load(source, { ignoreEncryption: true, updateMetadata: false });
  const preview = await PDFDocument.create();
  const count = Math.min(pages, book.getPageCount());
  const copied = await preview.copyPages(book, Array.from({ length: count }, (_, i) => i));
  copied.forEach((page) => preview.addPage(page));
  return preview.save();
}

/** Builds and publishes the preview for one edition (overwrites the old one). */
export async function publishPreview(
  admin: SupabaseClient,
  slug: string,
  locale: string,
  source: Uint8Array | ArrayBuffer,
): Promise<void> {
  const bytes = await buildPreviewPdf(source);
  const { error } = await admin.storage
    .from("covers")
    .upload(previewPdfPath(slug, locale), bytes, {
      contentType: "application/pdf",
      // Same path on every rebuild, so keep the cache short.
      cacheControl: "3600",
      upsert: true,
    });
  if (error) throw new Error(`Preview upload failed: ${error.message}`);
}

export async function removePreview(
  admin: SupabaseClient,
  slug: string,
  locale: string,
): Promise<void> {
  await admin.storage.from("covers").remove([previewPdfPath(slug, locale)]);
}
