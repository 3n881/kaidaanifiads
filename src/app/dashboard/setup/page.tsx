import AdminShell from "@/components/admin/AdminShell";
import SetupForm from "@/components/admin/onboarding/SetupForm";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [settings, products] = await Promise.all([getStoreSettings(), getAdminProducts()]);
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "business")!;
  return <AdminShell active="setup" title="Business setup" description="Public company, brand and support information. Progress updates while you type.">
    <SetupForm initial={settings.business} baseCompleted={progress.completedRequirements - section.completedCount} totalRequirements={progress.totalRequirements} />
  </AdminShell>;
}
