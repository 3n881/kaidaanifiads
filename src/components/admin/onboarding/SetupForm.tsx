"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { Field, fieldClass, MissingItems, ProgressBar, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";

const requirements: Array<[string, string]> = [
  ["brand_name", "brand name"], ["legal_name", "legal company name"],
  ["logo_url", "logo"], ["support_email", "support email"],
  ["support_whatsapp", "support WhatsApp"], ["business_address", "business address"],
  ["approver_name", "authorized approver"], ["domain_name", "domain name"],
  ["privacy_email", "privacy contact"], ["disclaimer_approved", "legal disclaimer approval"],
];

export default function SetupForm({ initial, baseCompleted, totalRequirements }: { initial: Record<string, string | boolean>; baseCompleted: number; totalRequirements: number }) {
  const [values, setValues] = useState(initial);
  const [logoPreview, setLogoPreview] = useState(String(initial.logo_url ?? ""));
  const [faviconPreview, setFaviconPreview] = useState(String(initial.favicon_url ?? ""));
  const [logoName, setLogoName] = useState("");
  const [faviconName, setFaviconName] = useState("");
  const set = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const missing = useMemo(() => requirements.filter(([key]) => !(values[key] === true || String(values[key] ?? "").trim())).map(([, label]) => label), [values]);
  const completed = requirements.length - missing.length;
  const percent = Math.round(((baseCompleted + completed) / totalRequirements) * 100);
  const text = (key: string) => String(values[key] ?? "");

  return <><div className="mb-5 grid gap-3 lg:grid-cols-2"><ProgressBar percent={percent} /><MissingItems items={missing} /></div>
    <form action={saveStoreSettings} className="space-y-5" encType="multipart/form-data"><input type="hidden" name="scope" value="business" /><input type="hidden" name="return_to" value="/dashboard/content" /><input type="hidden" name="logo_url" value={text("logo_url")} /><input type="hidden" name="favicon_url" value={text("favicon_url")} />
      <SectionCard title="Brand" description="The preview appears immediately after choosing an image."><div className="grid gap-5 sm:grid-cols-2"><ControlledField label="Brand name" name="brand_name" value={text("brand_name")} onChange={set} required /><ControlledField label="Legal company name" name="legal_name" value={text("legal_name")} onChange={set} required /><BrandUpload label="Primary logo" name="logo_file" preview={logoPreview} filename={logoName} onFile={(file) => { setLogoPreview(URL.createObjectURL(file)); setLogoName(file.name); set("logo_url", "selected"); }} /><BrandUpload label="Favicon (optional)" name="favicon_file" preview={faviconPreview} filename={faviconName} onFile={(file) => { setFaviconPreview(URL.createObjectURL(file)); setFaviconName(file.name); }} /></div></SectionCard>
      <SectionCard title="Customer support"><div className="grid gap-4 sm:grid-cols-2"><ControlledField type="email" label="Support email" name="support_email" value={text("support_email")} onChange={set} required /><ControlledField type="tel" label="Support WhatsApp number" name="support_whatsapp" value={text("support_whatsapp")} onChange={set} required /><ControlledField type="tel" label="Calling number (optional)" name="support_phone" value={text("support_phone")} onChange={set} /><ControlledField type="email" label="Privacy and deletion email" name="privacy_email" value={text("privacy_email")} onChange={set} required /></div></SectionCard>
      <SectionCard title="Company and launch"><div className="grid gap-4 sm:grid-cols-2"><ControlledField label="Authorized approver" name="approver_name" value={text("approver_name")} onChange={set} required /><ControlledField label="Domain name" name="domain_name" value={text("domain_name")} onChange={set} required /><ControlledField type="date" label="Preferred launch date" name="launch_date" value={text("launch_date")} onChange={set} /><ControlledField label="Business type" name="business_type" value={text("business_type") || "Private Limited Company"} onChange={set} /><div className="sm:col-span-2"><Field label="Public business address"><textarea name="business_address" rows={3} required value={text("business_address")} onChange={(event) => set("business_address", event.target.value)} className={fieldClass} /></Field></div><label className="flex items-start gap-3 rounded-xl border border-brand-100 p-4 sm:col-span-2"><input type="checkbox" name="disclaimer_approved" checked={values.disclaimer_approved === true} onChange={(event) => set("disclaimer_approved", event.target.checked)} className="mt-0.5 h-5 w-5 accent-brand-teal" /><span className="text-sm text-brand-700"><b>Disclaimer approved:</b> “Educational reference only, not legal advice.”</span></label></div></SectionCard>
      <div className="flex justify-end"><SaveButton>Save and continue</SaveButton></div>
    </form></>;
}

function ControlledField({ label, name, value, onChange, type = "text", required = false }: { label: string; name: string; value: string; onChange: (key: string, value: string) => void; type?: string; required?: boolean }) { return <Field label={label}><input type={type} name={name} value={value} required={required} onChange={(event) => onChange(name, event.target.value)} className={fieldClass} /></Field>; }
function BrandUpload({ label, name, preview, filename, onFile }: { label: string; name: string; preview: string; filename: string; onFile: (file: File) => void }) { return <label className="block cursor-pointer"><span className="mb-1 block text-xs font-semibold text-brand-700">{label}</span><div className="flex min-h-28 items-center gap-3 rounded-xl border border-dashed border-brand-300 p-3 transition hover:bg-brand-50">{preview ? <Image src={preview} alt={`${label} preview`} width={100} height={60} className="h-16 w-24 rounded bg-white object-contain" unoptimized /> : <div className="flex h-16 w-24 items-center justify-center rounded bg-brand-50 text-xs text-brand-400">No image</div>}<span className="min-w-0 text-xs font-semibold text-brand-600"><span className="block">{preview ? "Change image" : "Choose image"}</span>{filename && <span className="mt-1 block truncate font-normal text-green-600">Selected: {filename}</span>}</span><input type="file" name={name} accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} /></div></label>; }
