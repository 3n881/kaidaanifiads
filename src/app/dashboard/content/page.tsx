import AdminShell from "@/components/admin/AdminShell";
import { Field, fieldClass, MissingItems, ProgressBar, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { getAdminProducts, getStoreSettings } from "@/lib/admin";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [settings, products] = await Promise.all([getStoreSettings(), getAdminProducts()]);
  const { content } = settings;
  const progress = getOnboardingProgress(settings, products);
  const section = progress.items.find((item) => item.key === "content")!;
  const val = (key: string) => String(content[key] ?? "");
  return <AdminShell active="setup" title="Website content" description="Add approved public copy. Testimonials remain optional and can be added when consent is available.">
    <div className="mb-5 grid gap-3 lg:grid-cols-2"><ProgressBar percent={progress.percent} /><MissingItems items={section.missing} /></div>
    <form action={saveStoreSettings} className="space-y-5" encType="multipart/form-data"><input type="hidden" name="scope" value="content" /><input type="hidden" name="return_to" value="/dashboard/integrations" />{[1,2,3].map((number) => <input key={number} type="hidden" name={`testimonial_${number}_photo_url`} value={val(`testimonial_${number}_photo_url`)} />)}
      <SectionCard title="Homepage"><div className="space-y-4"><Field label="Main headline"><input name="hero_title" required defaultValue={val("hero_title")} className={fieldClass} /></Field><Field label="Supporting text"><textarea name="hero_text" rows={3} required defaultValue={val("hero_text")} className={fieldClass} /></Field></div></SectionCard>
      <SectionCard title="About the business"><div className="space-y-4"><Field label="Company story and mission" hint="Two or three short paragraphs are enough."><textarea name="about_text" rows={6} required defaultValue={val("about_text")} className={fieldClass} /></Field><Field label="Director or proprietor profile"><textarea name="director_profile" rows={4} required defaultValue={val("director_profile")} className={fieldClass} /></Field></div></SectionCard>
      <SectionCard title="Customer testimonials (optional)" description="Add only testimonials the customer has approved for public display."><div className="grid gap-4">{[1,2,3].map((number) => <details key={number} className="rounded-xl border border-brand-100 p-4"><summary className="cursor-pointer text-sm font-bold text-brand-800">Testimonial {number}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Customer name"><input name={`testimonial_${number}_name`} defaultValue={val(`testimonial_${number}_name`)} className={fieldClass} /></Field><Field label="City"><input name={`testimonial_${number}_city`} defaultValue={val(`testimonial_${number}_city`)} className={fieldClass} /></Field><div className="sm:col-span-2"><Field label="Testimonial"><textarea name={`testimonial_${number}_text`} rows={3} defaultValue={val(`testimonial_${number}_text`)} className={fieldClass} /></Field></div><Field label="Customer photo"><input type="file" name={`testimonial_${number}_photo_file`} accept="image/*" className={fieldClass} /></Field><label className="flex items-center gap-2 text-xs font-semibold text-brand-700"><input type="checkbox" name={`testimonial_${number}_consent`} defaultChecked={content[`testimonial_${number}_consent`] === true} className="h-4 w-4 accent-brand-teal" /> Written publication consent received</label></div></details>)}</div></SectionCard>
      <SectionCard title="Social links (optional)"><div className="grid gap-4 sm:grid-cols-3"><Field label="Instagram"><input type="url" name="instagram_url" defaultValue={val("instagram_url")} className={fieldClass} /></Field><Field label="Facebook"><input type="url" name="facebook_url" defaultValue={val("facebook_url")} className={fieldClass} /></Field><Field label="YouTube"><input type="url" name="youtube_url" defaultValue={val("youtube_url")} className={fieldClass} /></Field></div></SectionCard>
      <div className="flex justify-end"><SaveButton>Save and continue</SaveButton></div>
    </form>
  </AdminShell>;
}
