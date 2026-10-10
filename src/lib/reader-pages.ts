// Server / script use only: stores the sample-reader page images.
// Each page is saved as 200/400/800/1600 px WebP in the public `covers` bucket
// under reader/<slug>-<locale>-v<ts>-p<n>-<w>.webp (versioned names, cached
// for a year). Returns the 800 px URLs in page order; the reader derives the
// other widths (same convention as covers, see src/lib/covers.ts).
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

/** How many first pages the reader shows (matches the free preview PDF). */
export const READER_PAGES = 6;
const WIDTHS = [200, 400, 800, 1600] as const;

export async function uploadReaderPages(
  admin: SupabaseClient,
  slug: string,
  locale: string,
  pages: Array<Uint8Array | ArrayBuffer>,
): Promise<string[]> {
  const base = `reader/${slug}-${locale}-v${Date.now()}`;
  const urls: string[] = [];
  for (const [index, page] of pages.slice(0, READER_PAGES).entries()) {
    const input = Buffer.from(page instanceof ArrayBuffer ? new Uint8Array(page) : page);
    for (const width of WIDTHS) {
      const output = await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: width >= 1600 ? 72 : 78 })
        .toBuffer();
      const path = `${base}-p${index + 1}-${width}.webp`;
      const { error } = await admin.storage.from("covers").upload(path, output, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw new Error(`Reader page upload failed: ${error.message}`);
    }
    urls.push(admin.storage.from("covers").getPublicUrl(`${base}-p${index + 1}-800.webp`).data.publicUrl);
  }
  return urls;
}
