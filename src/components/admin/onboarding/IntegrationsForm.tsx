"use client";
import { useState } from "react";
import { saveStoreSettings } from "@/app/dashboard/actions";
import { MissingItems, ProgressBar, SaveButton, SectionCard } from "@/components/admin/OnboardingUI";

const services = [
  ["supabase", "Supabase", "Database, Auth, private PDF storage and rotated service key", true], ["razorpay", "Razorpay", "Business KYC, live keys and webhook", true],
  ["interakt", "Interakt", "Client-owned account and fresh WhatsApp Business number", true], ["meta_business", "Meta Business", "Client-owned portfolio and business verification", true],
  ["whatsapp_template", "WhatsApp template", "Approved utility template for ebook delivery", true], ["domain", "Domain and hosting", "Production domain, DNS and deployment access", true],
  ["analytics", "Search Console and analytics", "Recommended ownership for SEO reporting", false],
] as const;

export default function IntegrationsForm({ initial, baseCompleted, totalRequirements }: { initial: Record<string,string|boolean>; baseCompleted:number; totalRequirements:number }) {
  const [values,setValues]=useState(initial); const required=services.filter((s)=>s[3]); const missing=required.filter(([key])=>values[key]!=="ready").map(([,label])=>label);
  const percent=Math.round(((baseCompleted+required.length-missing.length)/totalRequirements)*100);
  return <><div className="mb-5 grid gap-3 lg:grid-cols-2"><ProgressBar percent={percent}/><MissingItems items={missing}/></div><form action={saveStoreSettings}><input type="hidden" name="scope" value="integrations"/><input type="hidden" name="return_to" value="/dashboard/launch"/><SectionCard title="Connection checklist" description="Progress updates as required services become ready."><div className="grid gap-3">{services.map(([key,title,detail])=><label key={key} className="grid gap-3 rounded-xl border border-brand-100 p-4 sm:grid-cols-[1fr_180px] sm:items-center"><span><span className="block text-sm font-bold text-brand-900">{title}</span><span className="block text-xs text-brand-500">{detail}</span></span><select name={key} value={String(values[key]??"not_started")} onChange={(e)=>setValues((v)=>({...v,[key]:e.target.value}))} className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="blocked">Needs help</option><option value="not_needed">Not needed</option></select></label>)}</div></SectionCard><p className="mt-4 text-xs text-brand-400">Never enter provider keys, passwords, OTPs, bank details or KYC files here.</p><div className="mt-5 flex justify-end"><SaveButton>Save and open launch checklist</SaveButton></div></form></>;
}
