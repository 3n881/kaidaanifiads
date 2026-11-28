import type { Metadata } from "next";
import Form from "next/form";
import Link from "@/components/admin/AdminLink";
import { CalendarClock, MessageCircle, Phone, Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConsultActions from "@/components/admin/ConsultActions";
import { CONSULT_TABS, getConsultationsView, type ConsultStatus, type ConsultTab } from "@/lib/consultations";
import { CONSULT_COPY, isTopic } from "@/lib/consult-copy";

export const metadata: Metadata = {
  title: "Admin — Consultations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TAB_LABEL: Record<ConsultTab, string> = {
  todo: "To schedule",
  all: "All",
  scheduled: "Scheduled",
  done: "Done",
  pending_payment: "Not paid",
  cancelled: "Cancelled / refunded",
};
const STATUS: Record<ConsultStatus, { label: string; className: string }> = {
  pending_payment: { label: "Not paid", className: "bg-gray-100 text-gray-600" },
  failed: { label: "Payment failed", className: "bg-danger-500/10 text-danger-600" },
  paid: { label: "Paid · call to schedule", className: "bg-amber-100 text-amber-800" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800" },
  done: { label: "Done", className: "bg-green-600 text-white" },
  cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-600" },
  refunded: { label: "Refunded", className: "bg-purple-100 text-purple-700" },
};
const en = CONSULT_COPY.en;
const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Paid consultation bookings (migration 020): Paid → Scheduled → Done. */
export default async function ConsultationsPage({ searchParams }: PageProps<"/dashboard/consultations">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const tab = CONSULT_TABS.find((t) => t === one("tab")) ?? "todo";
  const q = one("q").trim().slice(0, 60);
  const view = await getConsultationsView({ tab, q });

  if (!view.ready) {
    return (
      <AdminShell active="consult" title="Consultations">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          The consultations table isn’t in the database yet. Run <code className="font-mono">supabase/migrations/020_consultations.sql</code>.
        </p>
      </AdminShell>
    );
  }
  const href = (t: string) => `/dashboard/consultations${t !== "todo" ? `?tab=${t}` : ""}`;

  return (
    <AdminShell active="consult" title="Consultations" description="₹999 paid consultation bookings. Call or WhatsApp the buyer within 24 hours to fix the time, then mark Scheduled and Done.">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="To schedule" value={view.counts.todo} tone="text-amber-700" />
        <Stat label="Bookings (all)" value={view.total} />
        <Stat label="Paid (₹)" value={`₹${view.revenue.toLocaleString("en-IN")}`} tone="text-green-700" />
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
        {CONSULT_TABS.map((t) => (
          <Link key={t} href={href(t)} scroll={false} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${tab === t ? "bg-white text-brand-900 shadow-sm" : "text-brand-500"}`}>
            {TAB_LABEL[t]} <span className="text-brand-400">({view.counts[t]})</span>
          </Link>
        ))}
      </div>

      <Form action="/dashboard/consultations" scroll={false} className="mb-4 flex gap-2">
        {tab !== "todo" && <input type="hidden" name="tab" value={tab} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Search booking no. C-…, phone, name, district" className="h-11 w-full rounded-xl border border-brand-200 bg-white pl-9 pr-3 text-sm" />
        </div>
        <button type="submit" className="rounded-xl bg-brand-teal px-4 text-sm font-bold text-white">Search</button>
      </Form>

      {view.rows.length === 0 ? (
        <p className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-sm text-brand-500">No bookings here yet.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {view.rows.map((o) => {
            const s = STATUS[o.status];
            const topic = isTopic(o.topic) ? en.topics[o.topic] : o.topic;
            return (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-brand-900">{o.booking_no}</p>
                    <p className="text-[11px] text-brand-500">Booked {ist(o.created_at)}{o.paid_at ? ` · paid ${ist(o.paid_at)}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.className}`}>{s.label}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-900">{topic}</p>
                  {o.product_id && <p className="text-[11px] text-brand-500">From book #{o.product_id}</p>}
                </div>
                <div className="rounded-xl bg-brand-50/60 p-3 text-sm">
                  <p className="font-deva font-bold text-brand-900">{o.name} · {o.district}</p>
                  <p className="font-deva mt-1 whitespace-pre-wrap text-brand-700">{o.description}</p>
                  <p className="mt-2 text-xs text-brand-600">
                    Wants: {o.preferred_date} · {en.slots[o.preferred_slot as keyof typeof en.slots] ?? o.preferred_slot} · {en.modes[o.mode as keyof typeof en.modes] ?? o.mode} · {en.languages[o.language as keyof typeof en.languages] ?? o.language}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <a href={`tel:+91${o.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-brand-700 ring-1 ring-brand-100"><Phone className="h-3 w-3" aria-hidden="true" /> {o.phone}</a>
                    <a href={`https://wa.me/91${o.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-green-700 ring-1 ring-brand-100"><MessageCircle className="h-3 w-3" aria-hidden="true" /> WhatsApp</a>
                  </div>
                </div>
                {o.scheduled_for && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Scheduled: {ist(o.scheduled_for)}</p>
                )}
                {o.admin_note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">📝 {o.admin_note}</p>}
                <ConsultActions id={o.id} status={o.status} scheduledFor={o.scheduled_for} note={o.admin_note} />
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value, tone = "text-brand-900" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}
