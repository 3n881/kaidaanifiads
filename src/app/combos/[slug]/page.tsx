import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { getCombos, getComboBySlug, getRelated, getProductFamily } from "@/lib/products";
import { getBuyersThisWeek } from "@/lib/social-proof";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    return (await getCombos()).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/combos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getComboBySlug(slug);
  if (!product) return { title: "कॉम्बो सापडले नाही" };
  return {
    title: product.title,
    description: product.shortDescription,
    openGraph: { title: product.title, description: product.shortDescription },
  };
}

export default async function ComboDetailPage({
  params,
}: PageProps<"/combos/[slug]">) {
  const { slug } = await params;
  const product = await getComboBySlug(slug);
  if (!product) notFound();
  const [relatedProducts, family, buyers] = await Promise.all([getRelated(product), getProductFamily(product), getBuyersThisWeek()]);
  return <ProductDetail product={product} relatedProducts={relatedProducts} family={family.items} members={family.members} buyers={buyers} />;
}
