/**
 * Adds the 600 px WebP variant to every image in the public `covers` bucket
 * that was uploaded before 600 px existed (covers, preview pages and
 * sample-reader pages; added 2026-10-11, see src/lib/covers.ts).
 *
 * For each `<name>-800.webp` without a `<name>-600.webp` it resizes the best
 * source it has (the 1600 px reader page if there is one, else the 800 px file)
 * and uploads it next to the others. Only adds files — never replaces or
 * deletes. Run it BEFORE deploying code that lists 600 px in srcset.
 *
 *   npm run db:cover-600 -- --dry-run   # list what would be made
 *   npm run db:cover-600
 */
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("\n✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const dryRun = process.argv.includes("--dry-run");

/** Every file name in one folder of the bucket ("" = top level). */
async function listFolder(prefix: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from("covers")
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefix || "/"}: ${error.message}`);
    // Folders come back without an id.
    names.push(...data.filter((f) => f.id).map((f) => (prefix ? `${prefix}/${f.name}` : f.name)));
    if (data.length < 1000) return names;
  }
}

async function main() {
  const files = [...(await listFolder("")), ...(await listFolder("reader"))];
  const existing = new Set(files);
  const todo = files.filter((f) => f.endsWith("-800.webp") && !existing.has(f.replace(/-800\.webp$/, "-600.webp")));
  console.log(`${files.length} files, ${todo.length} need a 600 px variant${dryRun ? " (dry run)" : ""}`);

  let failed = 0;
  for (const file800 of todo) {
    const target = file800.replace(/-800\.webp$/, "-600.webp");
    const file1600 = file800.replace(/-800\.webp$/, "-1600.webp");
    const source = existing.has(file1600) ? file1600 : file800;
    if (dryRun) {
      console.log(`  would make ${target} from ${source}`);
      continue;
    }
    try {
      const { data, error } = await supabase.storage.from("covers").download(source);
      if (error || !data) throw new Error(`download: ${error?.message}`);
      const output = await sharp(Buffer.from(await data.arrayBuffer()))
        .resize({ width: 600, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      const { error: upErr } = await supabase.storage.from("covers").upload(target, output, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      console.log(`  ✓ ${target} (${Math.round(output.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${target}: ${(e as Error).message}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} failed — fix and run again (finished ones are skipped).`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
