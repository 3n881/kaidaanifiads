/**
 * Seeds the Supabase `products` table from the local catalog.
 *
 * Run AFTER you've (1) put your keys in .env.local and (2) run supabase/schema.sql:
 *   npm run db:seed
 *
 * Idempotent — upserts by id, so re-running just updates existing rows.
 */
import { createClient } from "@supabase/supabase-js";
import { ebooks, combos } from "../src/data/catalog";

// Legal category per product id (kept in sync with src/lib/catalog.ts).
const CATEGORY_BY_ID: Record<number, string> = {
  31: "Property Law",
  30: "Other",
  29: "Property Law",
  28: "Other",
  27: "Property Law",
  26: "Property Law",
  25: "Other",
  22: "Civil Law",
  19: "Civil Law",
  16: "Other",
  12: "Property Law",
  8: "Civil Law",
  4: "Property Law",
};

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

const rows = [...ebooks, ...combos].map((p, i) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  short_description: p.shortDescription,
  description: p.description,
  mrp: p.mrp,
  price: p.price,
  pages: p.pages,
  language: p.language,
  is_combo: p.isCombo,
  set_size: p.setSize ?? null,
  rating: p.rating,
  category: CATEGORY_BY_ID[p.id] ?? "Other",
  featured: p.featured ?? false,
  active: true,
  sort_order: i,
}));

async function main() {
  const { error, count } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) {
    console.error("\n✗ Seed failed:", error.message, "\n");
    process.exit(1);
  }

  console.log(`\n✓ Seeded ${count ?? rows.length} products into Supabase.\n`);
  process.exit(0);
}

main();
