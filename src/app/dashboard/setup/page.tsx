import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import { Field, fieldClass, MissingItems, ProgressBar, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [settings, products] = await Promise.all([getStoreSettings(), getAdminProducts()]);
  const { business } = settings;
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "business")!;
  const val = (key: string) => String(business[key] ?? "");
  return <AdminShell active="setup" title="Business setup" description="Public company, brand and support information. Do not enter passwords, OTPs, API keys or KYC documents.">
    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr]"><ProgressBar percent={progress.percent} /><MissingItems items={section.missing} /></div>
    <form action={saveStoreSettings} className="space-y-5" encType="multipart/form-data"><input type="hidden" name="scope" value="business" /><input type="hidden" name="return_to" value="/dashboard/content" /><input type="hidden" name="logo_url" value={val("logo_url")} /><input type="hidden" name="favicon_url" value={val("favicon_url")} />
      <SectionCard title="Brand" description="Upload approved company-owned artwork. PNG, JPG, WebP or SVG up to 5 MB."><div className="grid gap-5 sm:grid-cols-2"><Field label="Brand name"><input name="brand_name" required defaultValue={val("brand_name")} className={fieldClass} /></Field><Field label="Legal company name"><input name="legal_name" required defaultValue={val("legal_name")} className={fieldClass} placeholder="Company Private Limited" /></Field><BrandUpload label="Primary logo" name="logo_file" url={val("logo_url")} /><BrandUpload label="Favicon (optional)" name="favicon_file" url={val("favicon_url")} /></div></SectionCard>
      <SectionCard title="Customer support"><div className="grid gap-4 sm:grid-cols-2"><Field label="Support email"><input type="email" name="support_email" required defaultValue={val("support_email")} className={fieldClass} /></Field><Field label="Support WhatsApp number"><input type="tel" inputMode="numeric" name="support_whatsapp" required defaultValue={val("support_whatsapp")} className={fieldClass} /></Field><Field label="Calling number (optional)"><input type="tel" name="support_phone" defaultValue={val("support_phone")} className={fieldClass} /></Field><Field label="Privacy and deletion email"><input type="email" name="privacy_email" required defaultValue={val("privacy_email")} className={fieldClass} /></Field></div></SectionCard>
      <SectionCard title="Company and launch"><div className="grid gap-4 sm:grid-cols-2"><Field label="Authorized approver"><input name="approver_name" required defaultValue={val("approver_name")} className={fieldClass} placeholder="Name and designation" /></Field><Field label="Domain name"><input name="domain_name" required defaultValue={val("domain_name")} className={fieldClass} placeholder="example.com" /></Field><Field label="Preferred launch date"><input type="date" name="launch_date" defaultValue={val("launch_date")} className={fieldClass} /></Field><Field label="Business type"><input name="business_type" defaultValue={val("business_type") || "Private Limited Company"} className={fieldClass} /></Field><div className="sm:col-span-2"><Field label="Public business address"><textarea name="business_address" rows={3} required defaultValue={val("business_address")} className={fieldClass} /></Field></div><label className="flex items-start gap-3 rounded-xl border border-brand-100 p-4 sm:col-span-2"><input type="checkbox" name="disclaimer_approved" defaultChecked={business.disclaimer_approved === true} className="mt-0.5 h-5 w-5 accent-brand-teal" /><span className="text-sm text-brand-700"><b>Disclaimer approved:</b> “Educational reference only, not legal advice.”</span></label></div></SectionCard>
      <div className="flex justify-end"><SaveButton>Save and continue</SaveButton></div>
    </form>
  </AdminShell>;
}

function BrandUpload({ label, name, url }: { label: string; name: string; url: string }) { return <label className="block"><span className="mb-1 block text-xs font-semibold text-brand-700">{label}</span><div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-brand-300 p-3">{url && <Image src={url} alt={label} width={100} height={60} className="h-14 w-24 rounded bg-white object-contain" unoptimized />}<span className="text-xs font-semibold text-brand-500">{url ? "Replace image" : "Choose image"}</span><input type="file" name={name} accept="image/*" className="sr-only" /></div></label>; }
