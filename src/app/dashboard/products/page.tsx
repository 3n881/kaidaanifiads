import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, BookOpen, Package, CheckCircle2, AlertCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { MissingItems, ProgressBar } from "@/components/admin/OnboardingUI";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress, productIsReady } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Products - Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, settings] = await Promise.all([getAdminProducts(), getStoreSettings()]);
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "products")!;
  return <AdminShell active="products" title="Books and combo packs" description="Add the cover, PDF and essential selling details. Technical fields are generated automatically." action={<Link href="/dashboard/products/new" className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add product</Link>}>
    <div className="mb-5 grid gap-3 lg:grid-cols-2"><ProgressBar percent={progress.percent} /><MissingItems items={section.missing} /></div>
    {products.length === 0 ? <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center"><BookOpen className="mx-auto h-10 w-10 text-brand-300" /><h2 className="mt-3 font-bold text-brand-900">Add your first ebook</h2><p className="mt-1 text-sm text-brand-500">You only need a title, price, cover and PDF to begin.</p><Link href="/dashboard/products/new" className="mt-5 inline-flex rounded-xl bg-brand-teal px-5 py-3 text-sm font-bold text-white">Start adding</Link></div> : <div className="grid gap-3">
      {products.map((p) => { const ready = productIsReady(p); return <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${p.is_combo ? "bg-purple-50 text-purple-600" : "bg-brand-50 text-brand-600"}`}>{p.is_combo ? <Package className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-deva truncate font-bold text-brand-900">{p.title}</h2><span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${ready ? "text-green-600" : "text-amber-600"}`}>{ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{ready ? "Ready" : "Needs details"}</span></div><p className="mt-1 text-xs text-brand-500">{p.is_combo ? "Combo pack" : p.language} · ₹{p.price} · {p.active ? "Visible" : "Draft"}</p></div>
        <div className="flex items-center gap-2"><Link href={`/dashboard/products/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-2 text-xs font-bold text-brand-700"><Pencil className="h-3.5 w-3.5" /> Edit</Link><DeleteProductButton id={p.id} title={p.title} /></div>
      </article>; })}
    </div>}
  </AdminShell>;
}
