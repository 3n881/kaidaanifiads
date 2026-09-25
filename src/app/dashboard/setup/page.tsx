import AdminShell from "@/components/admin/AdminShell";
import { Field, fieldClass, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getStoreSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const { business } = await getStoreSettings();
  const val = (key: string) => String(business[key] ?? "");
  return <AdminShell active="setup" title="Business setup" description="Only information needed on the website is collected here. Do not enter passwords, OTPs, API keys or KYC documents.">
    <form action={saveStoreSettings} className="space-y-5"><input type="hidden" name="scope" value="business" /><input type="hidden" name="return_to" value="/dashboard/content" />
      <SectionCard title="Brand" description="The public identity customers will see."><div className="grid gap-4 sm:grid-cols-2"><Field label="Brand name"><input name="brand_name" required defaultValue={val("brand_name")} className={fieldClass} placeholder="कायद्याचं आणि फायद्याचं" /></Field><Field label="Legal company name"><input name="legal_name" defaultValue={val("legal_name")} className={fieldClass} placeholder="Company Private Limited" /></Field></div></SectionCard>
      <SectionCard title="Customer support"><div className="grid gap-4 sm:grid-cols-2"><Field label="Support email"><input type="email" name="support_email" required defaultValue={val("support_email")} className={fieldClass} placeholder="support@company.com" /></Field><Field label="Support WhatsApp number"><input type="tel" inputMode="numeric" name="support_whatsapp" required defaultValue={val("support_whatsapp")} className={fieldClass} placeholder="10-digit number" /></Field><Field label="Calling number (optional)"><input type="tel" name="support_phone" defaultValue={val("support_phone")} className={fieldClass} /></Field><Field label="Authorized approver"><input name="approver_name" defaultValue={val("approver_name")} className={fieldClass} placeholder="Name and designation" /></Field></div></SectionCard>
      <SectionCard title="Public address"><Field label="Business address" hint="Enter only the address approved for the contact and legal pages."><textarea name="business_address" rows={3} defaultValue={val("business_address")} className={fieldClass} /></Field></SectionCard>
      <div className="flex justify-end"><SaveButton>Save and continue to website content</SaveButton></div>
    </form>
  </AdminShell>;
}
