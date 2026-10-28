import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import {
  getEbooks,
  getProductBySlug,
  getRelated,
  getComboBooks,
  getCombosContaining,
} from "@/lib/products";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    return (await getEbooks()).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/ebooks/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "पुस्तक सापडले नाही" };
  return {
    title: product.title,
    description: product.shortDescription,
    openGraph: { title: product.title, description: product.shortDescription },
    // A combo that used to be a single book (#32) still answers here, so ad
    // and Reel links keep working; search engines get its /combos address.
    ...(product.isCombo ? { alternates: { canonical: `/combos/${product.slug}` } } : {}),
  };
}

export default async function EbookDetailPage({
  params,
}: PageProps<"/ebooks/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [relatedProducts, comboBooks, comboOffers] = await Promise.all([
    getRelated(product),
    product.isCombo ? getComboBooks(product.id) : Promise.resolve([]),
    product.isCombo ? Promise.resolve([]) : getCombosContaining(product.id),
  ]);
  // The books inside each offer (offer cards: "pick the second book", "you get").
  const offerBooks = Object.fromEntries(
    await Promise.all(comboOffers.map(async (offer) => [offer.id, await getComboBooks(offer.id)] as const)),
  );
  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
      comboBooks={comboBooks}
      comboOffers={comboOffers}
      offerBooks={offerBooks}
    />
  );
}
