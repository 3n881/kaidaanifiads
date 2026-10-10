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
  "id, slug, title, short_description, description, mrp, price, pages, language, is_combo, set_size, rating, category, cover_image, gallery_images, available_locales, featured, active, title_mr, title_hi, title_en, short_description_mr, short_description_hi, short_description_en, description_mr, description_hi, description_en, pages_mr, pages_hi, pages_en, cover_image_mr, cover_image_hi, cover_image_en, gallery_images_mr, gallery_images_hi, gallery_images_en, reader_pages_mr, reader_pages_hi, reader_pages_en";
const V4_PUBLIC_COLUMNS =
  "id, slug, title, short_description, description, mrp, price, pages, language, is_combo, set_size, rating, category, cover_image, gallery_images, available_locales, featured, active, title_mr, title_hi, title_en, short_description_mr, short_description_hi, short_description_en, description_mr, description_hi, description_en, pages_mr, pages_hi, pages_en, cover_image_mr, cover_image_hi, cover_image_en, gallery_images_mr, gallery_images_hi, gallery_images_en";
const V3_PUBLIC_COLUMNS =
  "id, slug, title, short_description, description, mrp, price, pages, language, is_combo, set_size, rating, category, cover_image, gallery_images, available_locales, featured, active";
const LEGACY_PUBLIC_COLUMNS =
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
  gallery_images: string[] | null;
  available_locales: Array<"mr" | "hi" | "en"> | null;
  title_mr?: string | null;
  title_hi?: string | null;
  title_en?: string | null;
  short_description_mr?: string | null;
  short_description_hi?: string | null;
  short_description_en?: string | null;
  description_mr?: string | null;
  description_hi?: string | null;
  description_en?: string | null;
  pages_mr?: number | null;
  pages_hi?: number | null;
  pages_en?: number | null;
  cover_image_mr?: string | null;
  cover_image_hi?: string | null;
  cover_image_en?: string | null;
  gallery_images_mr?: string[] | null;
  gallery_images_hi?: string[] | null;
  gallery_images_en?: string[] | null;
  reader_pages_mr?: string[] | null;
  reader_pages_hi?: string[] | null;
  reader_pages_en?: string[] | null;
  featured: boolean | null;
  active: boolean | null;
}

function rowToProduct(r: ProductRow): Product {
  const marathi = {
    title: r.title_mr || r.title,
    shortDescription: r.short_description_mr ?? r.short_description ?? "",
    description: r.description_mr ?? r.description ?? "",
    pages: r.pages_mr ?? r.pages ?? 0,
    coverImage: r.cover_image_mr ?? r.cover_image ?? undefined,
    galleryImages: r.gallery_images_mr ?? r.gallery_images ?? [],
    // Reader pages belong to one edition only — never borrowed from another.
    readerPages: r.reader_pages_mr ?? [],
  };
  const edition = (locale: "hi" | "en") => ({
    title: r[`title_${locale}`] || marathi.title,
    shortDescription:
      r[`short_description_${locale}`] ?? marathi.shortDescription,
    description: r[`description_${locale}`] ?? marathi.description,
    pages: r[`pages_${locale}`] ?? marathi.pages,
    coverImage: r[`cover_image_${locale}`] ?? marathi.coverImage,
    galleryImages: r[`gallery_images_${locale}`] ?? marathi.galleryImages,
    readerPages: r[`reader_pages_${locale}`] ?? [],
  });
  return {
    id: r.id,
    slug: r.slug,
    title: marathi.title,
    shortDescription: marathi.shortDescription,
    description: marathi.description,
    mrp: r.mrp,
    price: r.price,
    pages: marathi.pages,
    language: r.language,
    isCombo: r.is_combo,
    setSize: r.set_size ?? undefined,
    rating: Number(r.rating) || 4.8,
    category: r.category ?? "Other",
    cover: gradientForId(r.id),
    coverImage: marathi.coverImage,
    galleryImages: marathi.galleryImages,
    availableLocales: r.available_locales ?? [],
    localized: { mr: marathi, hi: edition("hi"), en: edition("en") },
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
  const current = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: false });
  // Keep the catalogue online while migrations 003/004/007 are being applied.
  if (current.error?.code === "42703") {
    const v4 = await supabase
      .from("products")
      .select(V4_PUBLIC_COLUMNS)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false });
    if (!v4.error) {
      return (v4.data as unknown as ProductRow[]).map(rowToProduct);
    }
    const v3 = await supabase
      .from("products")
      .select(V3_PUBLIC_COLUMNS)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false });
    if (!v3.error) {
      return (v3.data as unknown as ProductRow[]).map(rowToProduct);
    }
    const legacy = await supabase
      .from("products")
      .select(LEGACY_PUBLIC_COLUMNS)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false });
    if (legacy.error) throw legacy.error;
    return (legacy.data as unknown as ProductRow[]).map(rowToProduct);
  }
  if (current.error) throw current.error;
  return (current.data as unknown as ProductRow[]).map(rowToProduct);
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
  const current = await supabase
    .from("combo_items")
    .select(`product_id, products:product_id(${PUBLIC_COLUMNS})`)
    .eq("combo_id", comboId);
  let data: unknown = current.data;
  let error = current.error;
  if (current.error?.code === "42703") {
    const v3 = await supabase
      .from("combo_items")
      .select(`product_id, products:product_id(${V3_PUBLIC_COLUMNS})`)
      .eq("combo_id", comboId);
    data = v3.data;
    error = v3.error;
  }
  if (error || !data) return [];
  return (data as unknown as { products: ProductRow | null }[])
    .map((r) => r.products)
    .filter((p): p is ProductRow => Boolean(p))
    .map(rowToProduct);
}

/** Related products for a detail page: every other title (ebooks and
 *  combos, as on the previous site), same category first. */
export async function getRelated(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  const pool = (await loadCatalog()).filter((p) => p.id !== product.id);
  const cat = categoryOf(product);
  const sameCat = pool.filter((p) => categoryOf(p) === cat);
  const rest = pool.filter((p) => categoryOf(p) !== cat);
  return [...sameCat, ...rest].slice(0, limit);
}
