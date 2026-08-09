import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import {
  getAdminProductById,
  getEbookOptions,
  getComboItemIds,
} from "@/lib/admin";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const product = await getAdminProductById(Number(id));
  if (!product) notFound();

  const [ebookOptions, selectedBookIds] = await Promise.all([
    getEbookOptions(),
    product.is_combo ? getComboItemIds(product.id) : Promise.resolve([]),
  ]);

  return (
    <AdminShell active="products" title="पुस्तक संपादित करा">
      <ProductForm
        product={product}
        ebookOptions={ebookOptions}
        selectedBookIds={selectedBookIds}
      />
    </AdminShell>
  );
}
