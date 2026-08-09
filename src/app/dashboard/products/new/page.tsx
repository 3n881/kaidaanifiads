import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import { getEbookOptions } from "@/lib/admin";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const ebookOptions = await getEbookOptions();
  return (
    <AdminShell active="products" title="नवीन पुस्तक जोडा">
      <ProductForm ebookOptions={ebookOptions} />
    </AdminShell>
  );
}
