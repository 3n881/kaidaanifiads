import AdminShell from "@/components/admin/AdminShell";
import { MissingItems, ProgressBar, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";
const services = [
  ["supabase", "Supabase", "Database, Auth, private PDF storage and rotated service key"],
  ["razorpay", "Razorpay", "Business KYC, live keys and webhook"],
  ["interakt", "Interakt", "Client-owned account and fresh WhatsApp Business number"],
  ["meta_business", "Meta Business", "Client-owned portfolio and business verification"],
  ["whatsapp_template", "WhatsApp template", "Approved utility template for ebook delivery"],
  ["domain", "Domain and hosting", "Production domain, DNS and deployment access"],
  ["analytics", "Search Console and analytics", "Recommended ownership for SEO reporting"],
] as const;

export default async function IntegrationsPage() {
  const [settings, products] = await Promise.all([getStoreSettings(), getAdminProducts()]);
  const { integrations } = settings;
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "integrations")!;
  return <AdminShell active="setup" title="Payments and delivery" description="Record status only. Keys, passwords, OTPs, bank details and KYC files stay inside the provider accounts.">
    <div className="mb-5 grid gap-3 lg:grid-cols-2"><ProgressBar percent={progress.percent} /><MissingItems items={section.missing} /></div>
    <form action={saveStoreSettings}><input type="hidden" name="scope" value="integrations" /><input type="hidden" name="return_to" value="/dashboard/launch" />
      <SectionCard title="Connection checklist" description="Select the current state. ‘Needs help’ keeps the item visible on the launch checklist."><div className="grid gap-3">{services.map(([key, title, detail]) => <label key={key} className="grid gap-3 rounded-xl border border-brand-100 p-4 sm:grid-cols-[1fr_180px] sm:items-center"><span><span className="block text-sm font-bold text-brand-900">{title}</span><span className="block text-xs text-brand-500">{detail}</span></span><select name={key} defaultValue={String(integrations[key] ?? "not_started")} className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="blocked">Needs help</option><option value="not_needed">Not needed</option></select></label>)}</div></SectionCard>
      <p className="mt-4 text-xs text-brand-400">Supabase reminder: rotate the service-role key that appeared in the earlier chat before launch.</p>
      <div className="mt-5 flex justify-end"><SaveButton>Save and open launch checklist</SaveButton></div>
    </form>
  </AdminShell>;
}
