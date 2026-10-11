import type { Metadata } from "next";
import { CheckCircle2, MessageCircle, ShoppingBag, Users, UserMinus, Send } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import LeadOptOutButton from "@/components/admin/LeadOptOutButton";
import { getAdminProducts } from "@/lib/admin";
import { getLeadsView } from "@/lib/sales";

export const metadata: Metadata = { title: "Admin — Interested buyers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LANGUAGE: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };
const ist = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const waLink = (phone: string) => `https://wa.me/91${phone}`;

export default async function LeadsPage() {
  const [view, products] = await Promise.all([getLeadsView(), getAdminProducts()]);
  const titles = new Map(products.map((p) => [p.id, p.title_mr || p.title || `#${p.id}`]));
  const bookName = (id: number | null) => (id === null ? "—" : `#${id} ${titles.get(id) ?? ""}`);
  const rate = view.total ? Math.round((view.bought / view.total) * 100) : 0;

  const cards = [
    { label: "Interested buyers", value: view.active, sub: `${view.total} signed up in total`, icon: Users, tone: "text-brand-teal" },
    { label: "Bought later", value: view.bought, sub: `${rate}% of sign-ups`, icon: ShoppingBag, tone: "text-green-700" },
    { label: "Follow-ups sent", value: view.followups, sub: "next-day WhatsApp", icon: Send, tone: "text-blue-700" },
    { label: "Opted out", value: view.optedOut, sub: "no more offers", icon: UserMinus, tone: "text-brand-500" },
  ];

  return (
    <AdminShell
      active="leads"
      title="Interested buyers"
      description="Visitors who closed the payment window without paying and asked for offers and new books on WhatsApp (with consent)."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
            <card.icon className={`h-5 w-5 ${card.tone}`} aria-hidden="true" />
            <p className="mt-2 text-2xl font-extrabold text-brand-900">{card.value}</p>
            <p className="text-xs font-bold text-brand-700">{card.label}</p>
            <p className="text-[11px] text-brand-400">{card.sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Only message people on this list about offers and new books. If someone replies STOP or asks not to be
        contacted, press <b>Remove</b>. The automatic next-day WhatsApp needs an approved Interakt
        <b> marketing</b> template (setting <code>INTERAKT_LEAD_TEMPLATE_NAME</code>).
      </p>

      {view.leads.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-brand-300" />
          <p className="mt-3 text-sm font-semibold text-brand-700">No sign-ups yet.</p>
          <p className="mt-1 text-xs text-brand-400">They appear when a visitor closes the payment window and leaves a WhatsApp number.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {view.leads.map((lead) => (
            <li key={lead.id} className={`rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] ${lead.opted_out_at ? "border-brand-100 opacity-60" : "border-brand-100"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> {lead.phone}
                  </a>
                  <p className="font-deva mt-1 text-sm text-brand-800">{bookName(lead.product_id)}</p>
                  <p className="mt-0.5 text-xs text-brand-500">
                    {ist(lead.created_at)} · <span className="font-deva">{LANGUAGE[lead.locale] ?? lead.locale}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${lead.source === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {lead.source === "failed" ? "Payment failed" : "Cancelled payment"}
                  </span>
                  {lead.boughtLater && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Bought later
                    </span>
                  )}
                  {lead.followup_sent_at && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">Follow-up sent</span>}
                  {lead.opted_out_at && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-600">Opted out</span>}
                </div>
              </div>
              {!lead.opted_out_at && (
                <div className="mt-3 flex justify-end">
                  <LeadOptOutButton leadId={lead.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
