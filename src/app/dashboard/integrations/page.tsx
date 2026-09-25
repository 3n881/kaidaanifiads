import AdminShell from "@/components/admin/AdminShell";
import IntegrationsForm from "@/components/admin/onboarding/IntegrationsForm";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";
export const dynamic="force-dynamic";
export default async function IntegrationsPage(){const [settings,products]=await Promise.all([getStoreSettings(),getAdminProducts()]);const progress=getOnboardingProgress(settings,products);const section=progress.items.find((item)=>item.key==="integrations")!;return <AdminShell active="setup" title="Payments and delivery" description="Track readiness without sharing credentials."><IntegrationsForm initial={settings.integrations} baseCompleted={progress.completedRequirements-section.completedCount} totalRequirements={progress.totalRequirements}/></AdminShell>}
