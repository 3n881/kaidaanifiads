import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import {
  getAdminProductById,
  getEbookOptions,
  getComboItemIds,
  getSetsForBook,
} from "@/lib/admin";
import { normalizeLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const product = await getAdminProductById(Number(id));
  if (!product) notFound();

  const [ebookOptions, selectedBookIds, inSets] = await Promise.all([
    getEbookOptions(),
    product.is_combo ? getComboItemIds(product.id) : Promise.resolve([]),
    product.is_combo ? Promise.resolve([]) : getSetsForBook(product.id),
  ]);

  return (
    <AdminShell active="products" title="Edit product" description="Each language has independent customer details, cover, previews and PDF. Save one edition at a time.">
      <ProductForm
        product={product}
        ebookOptions={ebookOptions}
        selectedBookIds={selectedBookIds}
        inSets={inSets}
        initialLocale={normalizeLocale(query.lang)}
      />
    </AdminShell>
  );
}
