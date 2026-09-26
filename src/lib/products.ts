import "server-only";
import { cache } from "react";
import { getSupabase } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { categoryOf } from "./catalog";
import {
  ebooks as seedEbooks,
  combos as seedCombos,
  type Product,
  type Category,
  gradientForId,
} from "@/data/catalog";

// Row shape returned by Supabase (snake_case).
// Public catalog columns only — never pdf_path (private storage paths stay
// server-side; the pages are cached and shipped to every visitor).
const PUBLIC_COLUMNS =
  "id, slug, title, short_description, description, mrp, price, pages, language, is_combo, set_size, rating, category, cover_image, featured, active";

interface ProductRow {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  mrp: number;
  price: number;
  pages: number | null;
  language: Product["language"];
  is_combo: boolean;
  set_size: number | null;
  rating: number | string | null;
  category: Category | null;
  cover_image: string | null;
  featured: boolean | null;
  active: boolean | null;
}

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.short_description ?? "",
    description: r.description ?? "",
    mrp: r.mrp,
    price: r.price,
    pages: r.pages ?? 0,
    language: r.language,
    isCombo: r.is_combo,
    setSize: r.set_size ?? undefined,
    rating: Number(r.rating) || 4.8,
    category: r.category ?? "Other",
    cover: gradientForId(r.id),
    coverImage: r.cover_image ?? undefined,
    featured: Boolean(r.featured),
    active: r.active ?? true,
  };
}

// ---------------------------------------------------------------------------
// Cached fetch of the full active catalog. One DB round-trip is shared across
// the whole request tree and cached for `revalidate` seconds (keeps DB usage
// low). Admin writes call revalidateTag("products") to refresh instantly.
// ---------------------------------------------------------------------------
// React cache() dedupes this to ONE query per request across the whole render
// tree (layout + page + related). Cross-request caching comes from route-level
// `export const revalidate` on the pages — together that keeps DB hits (and
// your Supabase credits) low.
const loadFromSupabase = cache(async (): Promise<Product[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
});

/**
 * Loads the catalog. Uses LIVE Supabase whenever it's configured; before keys
 * are added it falls back to the local seed (which makes ZERO DB calls, so it
 * never uses your Supabase credits). Once `.env.local` has your keys, only the
 * live database is used.
 */
async function loadCatalog(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [...seedEbooks, ...seedCombos];
  return loadFromSupabase();
}

// --------------------------------- Reads -----------------------------------

export async function getAllProducts(): Promise<Product[]> {
  return loadCatalog();
}

export async function getEbooks(): Promise<Product[]> {
  return (await loadCatalog()).filter((p) => !p.isCombo);
}

export async function getCombos(): Promise<Product[]> {
  return (await loadCatalog()).filter((p) => p.isCombo);
}

export async function getFeaturedEbooks(): Promise<Product[]> {
  const list = await getEbooks();
  const featured = list.filter((p) => p.featured);
  return featured.length ? featured : list;
}

export async function getFeaturedCombos(): Promise<Product[]> {
  const list = await getCombos();
  const featured = list.filter((p) => p.featured);
  return featured.length ? featured : list;
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return (await loadCatalog()).find((p) => p.slug === slug);
}

export async function getEbookBySlug(
  slug: string,
): Promise<Product | undefined> {
  return (await getEbooks()).find((p) => p.slug === slug);
}

export async function getComboBySlug(
  slug: string,
): Promise<Product | undefined> {
  return (await getCombos()).find((p) => p.slug === slug);
}

/** The books included in a combo (via combo_items). Empty if none assigned. */
export async function getComboBooks(comboId: number): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("combo_items")
    .select(`product_id, products:product_id(${PUBLIC_COLUMNS})`)
    .eq("combo_id", comboId);
  if (error || !data) return [];
  return (data as unknown as { products: ProductRow | null }[])
    .map((r) => r.products)
    .filter((p): p is ProductRow => Boolean(p))
    .map(rowToProduct);
}

/** Related products for a detail page: same type, same category first. */
export async function getRelated(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  const pool = (await loadCatalog()).filter(
    (p) => p.isCombo === product.isCombo && p.id !== product.id,
  );
  const cat = categoryOf(product);
  const sameCat = pool.filter((p) => categoryOf(p) === cat);
  const rest = pool.filter((p) => categoryOf(p) !== cat);
  return [...sameCat, ...rest].slice(0, limit);
}
