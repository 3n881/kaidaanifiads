import type { Metadata } from "next";
import Form from "next/form";
import Link from "@/components/admin/AdminLink";
import { Banknote, Copy, FileDown, MapPin, MessageCircle, Phone, Search, Smartphone } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import PrintOrderActions from "@/components/admin/PrintOrderActions";
import { getPrintOrdersView, PRINT_TABS, type PrintStatus, type PrintTab } from "@/lib/print-orders";

export const metadata: Metadata = {
  title: "Admin — Printed books",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TAB_LABEL: Record<PrintTab, string> = {
  todo: "To do",
  all: "All",
  pending_payment: "Not paid yet",
  cod_pending: "COD to confirm",
  paid: "Paid online",
  confirmed: "COD confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled / returned",
};

const STATUS: Record<PrintStatus, { label: string; className: string }> = {
  pending_payment: { label: "Not paid yet", className: "bg-gray-100 text-gray-600" },
  failed: { label: "Payment failed", className: "bg-danger-500/10 text-danger-600" },
  paid: { label: "Paid online · ship it", className: "bg-green-100 text-green-800" },
  cod_pending: { label: "COD · confirm with buyer", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "COD confirmed · ship it", className: "bg-blue-100 text-blue-800" },
  shipped: { label: "Shipped", className: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Delivered", className: "bg-green-600 text-white" },
  cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-600" },
  returned: { label: "Returned", className: "bg-gray-200 text-gray-600" },
};

const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Printed-book orders (migration 018): address, online / COD, New → Shipped → Delivered. */
export default async function PrintOrdersPage({ searchParams }: PageProps<"/dashboard/print-orders">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const tab = PRINT_TABS.find((t) => t === one("tab")) ?? "todo";
  const q = one("q").trim().slice(0, 60);
  const view = await getPrintOrdersView({ tab, q });

  if (!view.ready) {
    return (
      <AdminShell active="print" title="Printed books">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          The printed-orders table isn’t in the database yet. Run <code className="font-mono">supabase/migrations/018_print_orders.sql</code> in the Supabase SQL editor.
        </p>
      </AdminShell>
    );
  }

  const href = (next: { tab?: string; q?: string }) => {
    const params = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "todo") params.set("tab", t);
    const query = next.q ?? q;
    if (query) params.set("q", query);
    const s = params.toString();
    return `/dashboard/print-orders${s ? `?${s}` : ""}`;
  };
  const exportHref = `/dashboard/print-orders/export?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <AdminShell
      active="print"
      title="Printed books"
      description="Printed-copy orders (₹399 online with free delivery, ₹449 Cash on Delivery). Confirm COD orders with the buyer before shipping."
      action={
        <a href={exportHref} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
          <FileDown className="h-4 w-4" aria-hidden="true" /> Address list (CSV)
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To do (ship / confirm)" value={view.counts.todo} tone="text-amber-700" />
        <Stat label="All orders" value={view.total} />
        <Stat label="Money received" value={`₹${view.money.collected.toLocaleString("en-IN")}`} tone="text-green-700" hint="Paid online + delivered COD" />
        <Stat label="COD still to collect" value={`₹${view.money.codOpen.toLocaleString("en-IN")}`} tone="text-blue-700" />
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
        {PRINT_TABS.map((t) => (
          <Link key={t} href={href({ tab: t })} scroll={false} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${tab === t ? "bg-white text-brand-900 shadow-sm" : "text-brand-500"}`}>
            {TAB_LABEL[t]} <span className="text-brand-400">({view.counts[t]})</span>
          </Link>
        ))}
      </div>

      <Form action="/dashboard/print-orders" scroll={false} className="mb-4 flex gap-2">
        {tab !== "todo" && <input type="hidden" name="tab" value={tab} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Search order no. P-…, phone, name, PIN code" className="h-11 w-full rounded-xl border border-brand-200 bg-white pl-9 pr-3 text-sm" />
        </div>
        <button type="submit" className="rounded-xl bg-brand-teal px-4 text-sm font-bold text-white">Search</button>
      </Form>

      {view.rows.length === 0 ? (
        <p className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-sm text-brand-500">No printed orders here yet.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {view.rows.map((o) => {
            const s = STATUS[o.status];
            const address = `${o.name}, ${o.house}, ${o.area}${o.landmark ? `, ${o.landmark}` : ""}, ${o.city}, ${o.district}, ${o.state} – ${o.pincode}. Mobile ${o.phone}`;
            return (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-brand-900">{o.order_no}</p>
                    <p className="text-[11px] text-brand-500">{ist(o.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${o.payment_mode === "cod" ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
                      {o.payment_mode === "cod" ? <Banknote className="h-3 w-3" aria-hidden="true" /> : <Smartphone className="h-3 w-3" aria-hidden="true" />}
                      {o.payment_mode === "cod" ? "COD" : "Online"} · ₹{o.amount}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.className}`}>{s.label}</span>
                  </div>
                </div>
                <p className="font-deva text-sm font-bold leading-snug text-brand-900">{o.product_title}</p>
                <div className="rounded-xl bg-brand-50/60 p-3 text-sm">
                  <p className="font-deva font-bold text-brand-900">{o.name}</p>
                  <p className="font-deva mt-1 flex gap-1.5 leading-relaxed text-brand-700">
                    <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden="true" />
                    <span>
                      {o.house}, {o.area}{o.landmark ? `, ${o.landmark}` : ""}<br />
                      {o.city}, {o.district}, {o.state} – <strong>{o.pincode}</strong>
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <a href={`tel:+91${o.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-brand-700 ring-1 ring-brand-100"><Phone className="h-3 w-3" aria-hidden="true" /> {o.phone}</a>
                    <a href={`https://wa.me/91${o.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-green-700 ring-1 ring-brand-100"><MessageCircle className="h-3 w-3" aria-hidden="true" /> WhatsApp</a>
                    <CopyAddress text={address} />
                  </div>
                </div>
                {(o.courier || o.tracking_no) && (
                  <p className="text-xs text-brand-600">🚚 {o.courier ?? "Courier"}{o.tracking_no ? ` · ${o.tracking_no}` : ""}{o.shipped_at ? ` · shipped ${ist(o.shipped_at)}` : ""}</p>
                )}
                <PrintOrderActions id={o.id} status={o.status} courier={o.courier} tracking={o.tracking_no} />
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value, tone = "text-brand-900", hint }: { label: string; value: string | number; tone?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${tone}`}>{value}</p>
      {hint && <p className="text-[10px] text-brand-400">{hint}</p>}
    </div>
  );
}

/** Copy the full address (for the courier slip) — plain link-styled details element, no JS needed. */
function CopyAddress({ text }: { text: string }) {
  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg bg-white px-2 py-1 text-brand-700 ring-1 ring-brand-100">
        <Copy className="h-3 w-3" aria-hidden="true" /> Address text
      </summary>
      <textarea readOnly defaultValue={text} rows={4} className="font-deva mt-2 w-72 max-w-[80vw] rounded-lg border border-brand-200 p-2 text-xs" />
    </details>
  );
}
