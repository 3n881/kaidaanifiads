import type { Metadata } from "next";
import SalesOverviewView from "@/components/admin/SalesOverviewView";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";
import { getSalesOverview, SALES_START } from "@/lib/sales";

export const metadata: Metadata = { title: "Store overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [sales, products, settings] = await Promise.all([getSalesOverview(), getAdminProducts(), getStoreSettings()]);
  // Only the business details the client still has to give (approver, disclaimer…);
  // the old integration/content/approval tick-boxes stay on the Launch page.
  const setupWaiting = getOnboardingProgress(settings, products).items.find((i) => i.key === "business")?.missing ?? [];
  return <SalesOverviewView sales={sales} products={products} setupWaiting={setupWaiting} salesStart={SALES_START} />;
}
