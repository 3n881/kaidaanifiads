import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Package, ShoppingBag, ArrowRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { ProgressBar, StepLink } from "@/components/admin/OnboardingUI";
import { getAdminOrders, getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Store overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [products, orders, settings] = await Promise.all([getAdminProducts(), getAdminOrders(), getStoreSettings()]);
  const ebooks = products.filter((p) => !p.is_combo);
  const progress = getOnboardingProgress(settings, products);

  return <AdminShell active="overview" title="Store overview" description="Complete one clear step at a time. You can return and edit anything later.">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={BookOpen} label="Ebooks" value={ebooks.length} />
      <Stat icon={Package} label="Combos" value={products.length - ebooks.length} />
      <Stat icon={ShoppingBag} label="Orders" value={orders.length} />
      <div className="rounded-2xl bg-brand-teal p-4 text-white"><p className="text-2xl font-extrabold">{progress.readyProducts}/{products.length}</p><p className="mt-2 text-xs text-white/70">Products ready</p></div>
    </div>

    <div className="mt-5"><ProgressBar percent={progress.percent} label={`${progress.completed} of ${progress.total} launch sections complete`} /></div>

    <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-brand-900">Get ready to launch</h2><Link href="/dashboard/launch" className="text-xs font-bold text-brand-teal">Full checklist</Link></div><div className="grid gap-3">
        {progress.items.map((item) => <StepLink key={item.key} href={item.href} title={item.label} detail={item.complete ? "Complete" : `${item.missing.length} item${item.missing.length === 1 ? "" : "s"} remaining: ${item.missing.slice(0, 2).join(", ")}`} complete={item.complete} />)}
      </div></section>
      <aside className="space-y-4"><div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="font-bold text-brand-900">Next action</h2>{progress.next ? <><p className="mt-1 text-sm text-brand-500">Complete {progress.next.label.toLowerCase()}.</p><p className="mt-3 text-xs text-amber-700">Missing: {progress.next.missing.slice(0, 4).join(", ")}</p><Link href={progress.next.href} className="mt-4 flex items-center justify-between rounded-xl bg-brand-gold px-4 py-3 text-sm font-bold text-brand-900">Continue setup <ArrowRight className="h-4 w-4" /></Link></> : <p className="mt-2 text-sm font-semibold text-green-600">Everything required is complete.</p>}</div><div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="font-bold text-brand-900">Products</h2><p className="mt-1 text-sm text-brand-500">Add one book at a time. Technical values are generated automatically.</p><Link href="/dashboard/products/new" className="mt-4 flex items-center justify-between rounded-xl border border-brand-200 px-4 py-3 text-sm font-bold text-brand-700">Add an ebook <ArrowRight className="h-4 w-4" /></Link></div></aside>
    </div>
  </AdminShell>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]"><Icon className="h-5 w-5 text-brand-500" /><p className="mt-2 text-2xl font-extrabold text-brand-900">{value}</p><p className="text-xs text-brand-400">{label}</p></div>; }
