import AdminShell from "@/components/admin/AdminShell";
import { SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getStoreSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";
const services = [
  ["supabase", "Supabase", "Database and private PDF storage"],
  ["razorpay", "Razorpay", "Payments, KYC and webhook"],
  ["interakt", "Interakt", "WhatsApp Business delivery template"],
  ["domain", "Domain and hosting", "Production domain and deployment access"],
] as const;

export default async function IntegrationsPage() {
  const { integrations } = await getStoreSettings();
  return <AdminShell active="setup" title="Payments and delivery" description="Record progress only. Keys and passwords belong in the provider or hosting environment, never in this dashboard form.">
    <form action={saveStoreSettings}><input type="hidden" name="scope" value="integrations" /><input type="hidden" name="return_to" value="/dashboard/launch" />
      <SectionCard title="Connection checklist" description="Select the current status for each service."><div className="grid gap-3">{services.map(([key, title, detail]) => <label key={key} className="grid gap-3 rounded-xl border border-brand-100 p-4 sm:grid-cols-[1fr_180px] sm:items-center"><span><span className="block text-sm font-bold text-brand-900">{title}</span><span className="block text-xs text-brand-500">{detail}</span></span><select name={key} defaultValue={String(integrations[key] ?? "not_started")} className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="blocked">Needs help</option></select></label>)}</div></SectionCard>
      <p className="mt-4 text-xs text-brand-400">For Supabase, remember to rotate the service role key that appeared in the earlier chat before launch.</p>
      <div className="mt-5 flex justify-end"><SaveButton>Save and open launch checklist</SaveButton></div>
    </form>
  </AdminShell>;
}
