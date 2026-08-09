// ---------------------------------------------------------------------------
// PURE, CLIENT-SAFE catalog helpers (no DB imports — safe in client components).
// Data fetching lives in `src/lib/products.ts` (server-only, Supabase).
// ---------------------------------------------------------------------------

import type { Product, Language, Category } from "@/data/catalog";

export type { Category } from "@/data/catalog";

// ------------------------------- Categories --------------------------------
// Fallback category map (used by the seed script and for any legacy rows
// without a category). Live products carry their own `category` column.
export const CATEGORY_BY_ID: Record<number, Category> = {
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

export function categoryOf(p: Product): Category {
  return p.category ?? CATEGORY_BY_ID[p.id] ?? "Other";
}

export const CATEGORIES: Array<Category | "All"> = [
  "All",
  "Property Law",
  "Civil Law",
  "Other",
];

export function filterByCategory(
  items: Product[],
  category: Category | "All",
): Product[] {
  if (category === "All") return items;
  return items.filter((p) => categoryOf(p) === category);
}

// --------------------------------- Language --------------------------------

export function filterByLanguage(
  items: Product[],
  language: Language | "All",
): Product[] {
  if (language === "All") return items;
  return items.filter((p) => p.language === language);
}

export const LANGUAGES: Array<Language | "All"> = [
  "All",
  "Marathi",
  "Hindi",
  "English",
];

export const LANGUAGE_LABELS: Record<Language | "All", string> = {
  All: "सर्व",
  Marathi: "मराठी",
  Hindi: "हिंदी",
  English: "English",
};

// --------------------------------- Search ----------------------------------

export function searchProducts(items: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q),
  );
}

// --------------------------------- Sorting ---------------------------------

export type SortKey = "featured" | "price-asc" | "price-desc" | "pages-desc";

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "किंमत: कमी → जास्त" },
  { key: "price-desc", label: "किंमत: जास्त → कमी" },
  { key: "pages-desc", label: "सर्वाधिक पाने" },
];

export function sortProducts(items: Product[], key: SortKey): Product[] {
  const arr = [...items];
  switch (key) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "pages-desc":
      return arr.sort((a, b) => b.pages - a.pages);
    default:
      return arr.sort(
        (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.id - a.id,
      );
  }
}

// --------------------------------- Pricing ---------------------------------

export function discountPercent(p: Pick<Product, "mrp" | "price">): number {
  if (!p.mrp || p.mrp <= p.price) return 0;
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}
