import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import { getEbookOptions } from "@/lib/admin";

export const metadata: Metadata = { title: "Add product", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }: PageProps<"/dashboard/products/new">) {
  const query = await searchParams;
  const ebookOptions = await getEbookOptions();
  const isCombo = query.type === "combo";
  return <AdminShell active="products" title={isCombo ? "Build a combo pack" : "Add an ebook"} description="Add the customer-facing details and files. The URL and technical values are generated automatically.">
    <ProductForm ebookOptions={ebookOptions} defaultIsCombo={isCombo} />
  </AdminShell>;
}
