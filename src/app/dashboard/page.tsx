import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Package, ShoppingBag, ArrowRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { StepLink } from "@/components/admin/OnboardingUI";
import { getAdminOrders, getAdminProducts, getStoreSettings } from "@/lib/admin";

export const metadata: Metadata = { title: "Store overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [products, orders, settings] = await Promise.all([getAdminProducts(), getAdminOrders(), getStoreSettings()]);
  const ebooks = products.filter((p) => !p.is_combo);
  const completeProducts = products.filter((p) => p.title && p.price > 0 && p.cover_image && (p.is_combo || p.pdf_path));
  const setupDone = Boolean(settings.business.brand_name && settings.business.support_email && settings.business.support_whatsapp);
  const contentDone = Boolean(settings.content.hero_title && settings.content.about_text);
  const integrationsDone = ["supabase", "razorpay", "interakt", "domain"].every((key) => settings.integrations[key] === "ready");

  return <AdminShell active="overview" title="Store overview" description="Complete one clear step at a time. You can return and edit anything later.">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={BookOpen} label="Ebooks" value={ebooks.length} />
      <Stat icon={Package} label="Combos" value={products.length - ebooks.length} />
      <Stat icon={ShoppingBag} label="Orders" value={orders.length} />
      <div className="rounded-2xl bg-brand-teal p-4 text-white"><p className="text-2xl font-extrabold">{products.length ? Math.round((completeProducts.length / products.length) * 100) : 0}%</p><p className="mt-2 text-xs text-white/70">Catalogue ready</p></div>
    </div>

    <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-brand-900">Get ready to launch</h2><Link href="/dashboard/launch" className="text-xs font-bold text-brand-teal">Full checklist</Link></div><div className="grid gap-3">
        <StepLink href="/dashboard/setup" title="Business and contact details" detail="Brand, support details and public business information" complete={setupDone} />
        <StepLink href="/dashboard/products" title="Add books and PDFs" detail={`${completeProducts.length} of ${products.length || 1} products ready`} complete={products.length > 0 && completeProducts.length === products.length} />
        <StepLink href="/dashboard/content" title="Website content" detail="Homepage, about text and social links" complete={contentDone} />
        <StepLink href="/dashboard/integrations" title="Payments and delivery" detail="Razorpay, Interakt, domain and database status" complete={integrationsDone} />
      </div></section>
      <aside className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="font-bold text-brand-900">Quick action</h2><p className="mt-1 text-sm text-brand-500">Add one book at a time. We generate the URL and technical values for you.</p><Link href="/dashboard/products/new" className="mt-5 flex items-center justify-between rounded-xl bg-brand-gold px-4 py-3 text-sm font-bold text-brand-900">Add an ebook <ArrowRight className="h-4 w-4" /></Link><Link href="/dashboard/products/new?type=combo" className="mt-2 flex items-center justify-between rounded-xl border border-brand-200 px-4 py-3 text-sm font-bold text-brand-700">Build a combo <ArrowRight className="h-4 w-4" /></Link></aside>
    </div>
  </AdminShell>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]"><Icon className="h-5 w-5 text-brand-500" /><p className="mt-2 text-2xl font-extrabold text-brand-900">{value}</p><p className="text-xs text-brand-400">{label}</p></div>; }
