/**
 * Builds the sample-reader page images (first 6 pages, WebP 200/400/800/1600)
 * for every edition that has a PDF, from its free preview PDF (or the full
 * PDF when no preview exists), and saves them in products.reader_pages_<l>.
 *
 * New uploads get these automatically in the dashboard; this script is for
 * books uploaded before that (or to rebuild after a fix).
 *
 *   npm run db:reader-pages              # only editions without reader pages
 *   npm run db:reader-pages -- --force   # rebuild all
 *   npm run db:reader-pages -- --dry-run # list what would be built
 *   npm run db:reader-pages -- --only=<slug>
 */
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { READER_PAGES, uploadReaderPages } from "../src/lib/reader-pages";
import { previewPdfPath } from "../src/lib/previews";

const LOCALES = ["mr", "hi", "en"] as const;
const RENDER_WIDTH = 1600;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("\n✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

type Row = {
  id: number;
  slug: string;
  pdf_path: string | null;
  pdf_path_mr: string | null;
  pdf_path_hi: string | null;
  pdf_path_en: string | null;
  reader_pages_mr: string[] | null;
  reader_pages_hi: string[] | null;
  reader_pages_en: string[] | null;
};

async function download(bucket: string, key: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function renderPages(pdf: Uint8Array): Promise<Buffer[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pkg = path.join(process.cwd(), "node_modules", "pdfjs-dist");
  const loading = pdfjs.getDocument({
    data: pdf,
    standardFontDataUrl: `${path.join(pkg, "standard_fonts").split(path.sep).join("/")}/`,
    wasmUrl: `${path.join(pkg, "wasm").split(path.sep).join("/")}/`,
    iccUrl: `${path.join(pkg, "iccs").split(path.sep).join("/")}/`,
  });
  const doc = await loading.promise;
  // (Node: plain file paths, not file:// URLs.) In Node, PDF.js draws on @napi-rs/canvas through its own canvas factory.
  const factory = doc.canvasFactory as unknown as {
    create: (w: number, h: number) => { canvas: HTMLCanvasElement & { toBuffer: (type: string) => Buffer } };
  };
  const out: Buffer[] = [];
  const count = Math.min(READER_PAGES, doc.numPages);
  for (let n = 1; n <= count; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: RENDER_WIDTH / page.getViewport({ scale: 1 }).width });
    const { canvas } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;
    out.push(canvas.toBuffer("image/png"));
    page.cleanup();
  }
  await loading.destroy();
  return out;
}

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, pdf_path, pdf_path_mr, pdf_path_hi, pdf_path_en, reader_pages_mr, reader_pages_hi, reader_pages_en")
    .order("id");
  if (error) throw error;

  for (const row of (data ?? []) as Row[]) {
    if (only && row.slug !== only) continue;
    for (const locale of LOCALES) {
      const pdfPath = locale === "mr" ? row.pdf_path_mr ?? row.pdf_path : row[`pdf_path_${locale}`];
      if (!pdfPath) continue;
      if (!force && (row[`reader_pages_${locale}`]?.length ?? 0) > 0) continue;
      const label = `#${row.id} ${row.slug} (${locale})`;
      if (dryRun) {
        console.log(`would build ${label}`);
        continue;
      }
      const source =
        (await download("covers", previewPdfPath(row.slug, locale))) ?? (await download("pdfs", pdfPath));
      if (!source) {
        console.error(`✗ ${label}: PDF not found`);
        continue;
      }
      try {
        const pages = await renderPages(source);
        const urls = await uploadReaderPages(supabase, row.slug, locale, pages);
        const { error: updateError } = await supabase
          .from("products")
          .update({ [`reader_pages_${locale}`]: urls })
          .eq("id", row.id);
        if (updateError) throw updateError;
        console.log(`✓ ${label}: ${urls.length} pages`);
      } catch (buildError) {
        console.error(`✗ ${label}:`, buildError);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
