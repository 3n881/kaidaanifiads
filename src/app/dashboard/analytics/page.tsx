import type { Metadata } from "next";
import AnalyticsView from "@/components/admin/AnalyticsView";
import { getAdminProducts } from "@/lib/admin";
import { getAnalytics } from "@/lib/analytics";
import { parseOrderFilters } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Admin — Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const filters = parseOrderFilters(await searchParams);
  const [data, products] = await Promise.all([getAnalytics(filters), getAdminProducts()]);
  return <AnalyticsView data={data} products={products} period={filters.period} from={filters.from} to={filters.to} />;
}
