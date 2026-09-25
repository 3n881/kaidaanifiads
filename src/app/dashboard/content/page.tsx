import AdminShell from "@/components/admin/AdminShell";
import ContentForm from "@/components/admin/onboarding/ContentForm";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";
export default async function ContentPage() {
  const [settings, products] = await Promise.all([getStoreSettings(), getAdminProducts()]);
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "content")!;
  return <AdminShell active="setup" title="Website content" description="Progress updates while you enter approved public content."><ContentForm initial={settings.content} baseCompleted={progress.completedRequirements - section.completedCount} totalRequirements={progress.totalRequirements} /></AdminShell>;
}
