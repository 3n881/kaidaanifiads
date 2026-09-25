import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { AlertTriangle, CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { SectionCard } from "@/components/admin/OnboardingUI";
import LaunchApprovalForm from "@/components/admin/onboarding/LaunchApprovalForm";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const [products, settings] = await Promise.all([getAdminProducts(), getStoreSettings()]);
  const progress = getOnboardingProgress(settings, products);
  const allSetupComplete = progress.items.filter((item) => item.key !== "launch").every((item) => item.complete);
  const fullyApproved = progress.next === null;
  const section = progress.items.find((item) => item.key === "launch")!;
  return <AdminShell active="launch" title="Launch checklist" description="Every required item remains visible until it is completed and formally approved.">
    <LaunchApprovalForm initial={settings.launch} baseCompleted={progress.completedRequirements - section.completedCount} totalRequirements={progress.totalRequirements} />
    <div className={`my-5 rounded-2xl p-5 ${fullyApproved ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}><div className="flex items-start gap-3">{fullyApproved ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertTriangle className="h-6 w-6 shrink-0" />}<div><h2 className="font-bold">{fullyApproved ? "Store is approved for launch" : allSetupComplete ? "Setup is complete; final approvals remain" : "Items still need attention"}</h2><p className="mt-1 text-sm opacity-80">{fullyApproved ? "Monitor the first live orders and delivery logs after launch." : "Open an incomplete section below to see exactly what is missing."}</p></div></div></div>
    <SectionCard title="Readiness by section"><div className="grid gap-3">{progress.items.map((item) => <Link href={item.href} key={item.key} className="flex items-start gap-3 rounded-xl border border-brand-100 p-4 hover:bg-brand-50">{item.complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <Circle className="h-5 w-5 shrink-0 text-brand-300" />}<span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-brand-800">{item.label}</span>{!item.complete && <span className="mt-1 block text-xs text-amber-700">Missing: {item.missing.join(", ")}</span>}</span><ChevronRight className="h-4 w-4 shrink-0 text-brand-300" /></Link>)}</div></SectionCard>
  </AdminShell>;
}
