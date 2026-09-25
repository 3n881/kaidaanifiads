import AdminShell from "@/components/admin/AdminShell";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const [products, settings] = await Promise.all([getAdminProducts(), getStoreSettings()]);
  const productReady = products.length > 0 && products.every((p) => p.title && p.price > 0 && p.cover_image && (p.is_combo || p.pdf_path));
  const businessReady = Boolean(settings.business.brand_name && settings.business.support_email && settings.business.support_whatsapp);
  const contentReady = Boolean(settings.content.hero_title && settings.content.about_text);
  const integrationsReady = ["supabase", "razorpay", "interakt", "domain"].every((key) => settings.integrations[key] === "ready");
  const checks = [["Business information", businessReady], ["Website content", contentReady], ["Books, covers and PDFs", productReady], ["Payments and delivery services", integrationsReady]] as const;
  const ready = checks.every(([, done]) => done);
  return <AdminShell active="launch" title="Launch checklist" description="This page shows what still needs attention before accepting live payments.">
    <div className={`mb-5 rounded-2xl p-5 ${ready ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}><div className="flex items-start gap-3">{ready ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertTriangle className="h-6 w-6 shrink-0" />}<div><h2 className="font-bold">{ready ? "Store setup is ready for final testing" : "A few items still need attention"}</h2><p className="mt-1 text-sm opacity-80">{ready ? "Run one real low-value payment and verify the PDF and WhatsApp delivery before going live." : "Open the incomplete sections below and add only the missing information."}</p></div></div></div>
    <SectionCard title="Readiness"><div className="grid gap-3">{checks.map(([label, done]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-brand-100 p-4">{done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-brand-300" />}<span className="text-sm font-semibold text-brand-800">{label}</span><span className={`ml-auto text-xs font-bold ${done ? "text-green-600" : "text-amber-600"}`}>{done ? "Complete" : "Required"}</span></div>)}</div></SectionCard>
    <form action={saveStoreSettings} className="mt-5"><input type="hidden" name="scope" value="launch" /><input type="hidden" name="return_to" value="/dashboard/launch" /><SectionCard title="Final approval" description="Complete this only after the staging review and real payment test."><div className="space-y-3"><label className="flex gap-3"><input type="checkbox" name="staging_approved" defaultChecked={settings.launch.staging_approved === true} className="mt-0.5 h-5 w-5 accent-brand-teal" /><span className="text-sm text-brand-700">The client has approved the staging website, product prices and legal content.</span></label><label className="flex gap-3"><input type="checkbox" name="payment_tested" defaultChecked={settings.launch.payment_tested === true} className="mt-0.5 h-5 w-5 accent-brand-teal" /><span className="text-sm text-brand-700">A real payment, PDF download and optional WhatsApp delivery were tested successfully.</span></label><div className="pt-2"><SaveButton>Save approval status</SaveButton></div></div></SectionCard></form>
  </AdminShell>;
}
