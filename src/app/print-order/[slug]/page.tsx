import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrintCheckout from "@/components/PrintCheckout";
import { getProductBySlug } from "@/lib/products";

// The form is the same for everyone (filled in on the phone), so the page can be cached like a book page.
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/print-order/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product ? `छापील पुस्तक ऑर्डर · ${product.title}` : "छापील पुस्तक ऑर्डर",
    robots: { index: false, follow: false },
  };
}

/** Printed-book checkout: delivery address + online / Cash on Delivery (client, 26 Nov). */
export default async function PrintOrderPage({ params }: PageProps<"/print-order/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return <PrintCheckout product={product} />;
}
