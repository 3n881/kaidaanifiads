import type { Metadata } from "next";
import OrdersView from "@/components/admin/OrdersView";
import { getAdminProducts } from "@/lib/admin";
import { getOrdersView, parseOrderFilters } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Admin — Orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const filters = parseOrderFilters(await searchParams);
  const [view, products] = await Promise.all([getOrdersView(filters), getAdminProducts()]);
  return <OrdersView view={view} products={products} />;
}
