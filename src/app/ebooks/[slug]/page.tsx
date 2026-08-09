import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { getEbooks, getEbookBySlug } from "@/lib/products";

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
  const product = await getEbookBySlug(slug);
  if (!product) return { title: "पुस्तक सापडले नाही" };
  return {
    title: product.title,
    description: product.shortDescription,
    openGraph: { title: product.title, description: product.shortDescription },
  };
}

export default async function EbookDetailPage({
  params,
}: PageProps<"/ebooks/[slug]">) {
  const { slug } = await params;
  const product = await getEbookBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
