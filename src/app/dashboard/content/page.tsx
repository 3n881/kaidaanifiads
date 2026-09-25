import AdminShell from "@/components/admin/AdminShell";
import { Field, fieldClass, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getStoreSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const { content } = await getStoreSettings();
  const val = (key: string) => String(content[key] ?? "");
  return <AdminShell active="setup" title="Website content" description="Add the core message now. Testimonials and social links can be added later.">
    <form action={saveStoreSettings} className="space-y-5"><input type="hidden" name="scope" value="content" /><input type="hidden" name="return_to" value="/dashboard/integrations" />
      <SectionCard title="Homepage"><div className="space-y-4"><Field label="Main headline"><input name="hero_title" required defaultValue={val("hero_title")} className={fieldClass} placeholder="सोप्या भाषेत कायदे समजून घ्या" /></Field><Field label="Supporting text"><textarea name="hero_text" rows={3} defaultValue={val("hero_text")} className={fieldClass} /></Field></div></SectionCard>
      <SectionCard title="About the business"><Field label="Company story and mission" hint="Two or three short paragraphs are enough."><textarea name="about_text" rows={7} required defaultValue={val("about_text")} className={fieldClass} /></Field></SectionCard>
      <SectionCard title="Social links (optional)"><div className="grid gap-4 sm:grid-cols-2"><Field label="Instagram"><input type="url" name="instagram_url" defaultValue={val("instagram_url")} className={fieldClass} placeholder="https://instagram.com/..." /></Field><Field label="Facebook"><input type="url" name="facebook_url" defaultValue={val("facebook_url")} className={fieldClass} /></Field><Field label="YouTube"><input type="url" name="youtube_url" defaultValue={val("youtube_url")} className={fieldClass} /></Field></div></SectionCard>
      <div className="flex justify-end"><SaveButton>Save and continue to integrations</SaveButton></div>
    </form>
  </AdminShell>;
}
