import type { Metadata } from "next";
import AnalyticsView, { ANALYTICS_SECTIONS } from "@/components/admin/AnalyticsView";
import { getAdminProducts } from "@/lib/admin";
import { getAnalytics } from "@/lib/analytics";
import { parseOrderFilters } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Admin — Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const params = await searchParams;
  const filters = parseOrderFilters(params);
  const view = ANALYTICS_SECTIONS.find((v) => v === params.view) ?? "summary";
  const [data, products] = await Promise.all([getAnalytics(filters), getAdminProducts()]);
  return <AnalyticsView data={data} products={products} period={filters.period} from={filters.from} to={filters.to} view={view} />;
}
