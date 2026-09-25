import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

export const fieldClass = "w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-brand-700">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-brand-400">{hint}</span>}</label>;
}

export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"><h2 className="text-lg font-bold text-brand-900">{title}</h2>{description && <p className="mt-1 text-sm text-brand-500">{description}</p>}<div className="mt-5">{children}</div></section>;
}

export function StepLink({ href, title, detail, complete }: { href: string; title: string; detail: string; complete: boolean }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">{complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <Circle className="h-5 w-5 shrink-0 text-brand-300" />}<span className="min-w-0 flex-1"><span className="block text-sm font-bold text-brand-900">{title}</span><span className="block text-xs text-brand-500">{detail}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-brand-300" /></Link>;
}

export function SaveButton({ children = "Save and continue" }: { children?: React.ReactNode }) {
  return <button type="submit" className="rounded-xl bg-brand-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700">{children}</button>;
}
