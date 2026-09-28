/**
 * Uploads ebook PDFs from content/ebooks/ to the private `pdfs` bucket and
 * attaches each one to its product's language edition.
 *
 * File names map to products by the ID shown on the live /ebooks page:
 *   content/ebooks/<id>-<slug>-<mr|hi|en>.pdf   e.g. 27-hindu-uttaradhikar-kanoon-guide-hi.pdf
 *
 *   npm run db:upload-pdfs              # upload files whose edition has no PDF yet
 *   npm run db:upload-pdfs -- --dry-run # show what would happen
 *   npm run db:upload-pdfs -- --force   # also replace PDFs that are already set
 *
 * Uses the same storage path scheme as the dashboard (`<slug>-<locale>-<ts>.pdf`).
 * It does not change `available_locales` — that is recomputed when the edition
 * (title, descriptions, cover) is saved from the dashboard.
 */
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const DIR = path.join(process.cwd(), "content", "ebooks");
const FILE_RE = /^(\d+)-([a-z0-9-]+)-(mr|hi|en)\.pdf$/;

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  let failed = 0;

  for (const file of files) {
    const match = FILE_RE.exec(file);
    if (!match) {
      console.error(`✗ ${file}: name must be <id>-<slug>-<mr|hi|en>.pdf`);
      failed++;
      continue;
    }
    const [, idRaw, slug, locale] = match;
    const id = Number(idRaw);
    const column = `pdf_path_${locale}`;

    const { data: product, error } = await supabase
      .from("products")
      .select(`id, slug, ${column}`)
      .eq("id", id)
      .maybeSingle<Record<string, string | number | null>>();
    if (error) throw error;
    // The slug check stops a mistyped ID from delivering the wrong book.
    if (!product || product.slug !== slug) {
      console.error(`✗ ${file}: no product ${id} with slug "${slug}"`);
      failed++;
      continue;
    }
    if (product[column] && !force) {
      console.log(`• ${file}: ${column} already set (${product[column]}) — skipped`);
      continue;
    }

    const body = readFileSync(path.join(DIR, file));
    const objectPath = `${slug}-${locale}-${Date.now()}.pdf`;
    const sizeMb = (body.length / 1024 / 1024).toFixed(1);
    if (dryRun) {
      console.log(`→ ${file} (${sizeMb} MB) would upload as ${objectPath} → products[${id}].${column}`);
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(objectPath, body, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      console.error(`✗ ${file}: upload failed — ${uploadError.message}`);
      failed++;
      continue;
    }
    const { error: updateError } = await supabase
      .from("products")
      .update({ [column]: objectPath })
      .eq("id", id);
    if (updateError) {
      console.error(`✗ ${file}: uploaded but product update failed — ${updateError.message}`);
      failed++;
      continue;
    }
    console.log(`✓ ${file} (${sizeMb} MB) → products[${id}].${column} = ${objectPath}`);
  }

  if (failed) {
    console.error(`\n✗ ${failed} file(s) failed.\n`);
    process.exit(1);
  }
  console.log("\n✓ Done.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("\n✗ Upload failed:", error.message ?? error, "\n");
  process.exit(1);
});
