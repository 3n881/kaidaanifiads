import type { MetadataRoute } from "next";
import { getEbooks, getCombos } from "@/lib/products";

const BASE = "https://kaydyachaanifaydyach.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/ebooks",
    "/combos",
    "/about",
    "/contact",
    "/my-books",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
    "/cancellation-policy",
    "/shipping-policy",
    "/data-deletion",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let products: string[] = [];
  try {
    const [ebooks, combos] = await Promise.all([getEbooks(), getCombos()]);
    products = [
      ...ebooks.map((p) => `/ebooks/${p.slug}`),
      ...combos.map((p) => `/combos/${p.slug}`),
    ];
  } catch {
    products = [];
  }

  const productRoutes = products.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
