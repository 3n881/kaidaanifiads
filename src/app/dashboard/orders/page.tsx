import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Download, IndianRupee, MessageCircle, RotateCcw, Search, ShoppingBag, XCircle, Clock } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ResendButton from "@/components/admin/ResendButton";
import { getAdminProducts } from "@/lib/admin";
import { getOrdersView, parseOrderFilters, SALES_START, type OrderRow, type OrderStatusFilter } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Admin — Orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const LANGUAGE: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };
const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-danger-500/10 text-danger-600" },
  created: { label: "Not paid", className: "bg-brand-100 text-brand-600" },
};
const PERIODS = [
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["all", "All time"],
] as const;

const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?=[6-9]\d{9}$)/, "91")}`;

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const filters = parseOrderFilters(await searchParams);
  const [view, products] = await Promise.all([getOrdersView(filters), getAdminProducts()]);
  const titles = new Map(products.map((p) => [p.id, p.title_mr || p.title || p.title_hi || p.title_en || `#${p.id}`]));
  const bookName = (id: number | null) => (id === null ? "—" : `#${id} ${titles.get(id) ?? ""}`);

  // Links keep the other filters and change one.
  const href = (change: Partial<{ period: string; status: OrderStatusFilter; q: string; test: string }>) => {
    const params = new URLSearchParams();
    const next = { period: view.period, status: view.status, q: view.q, test: view.includeTest ? "1" : "", ...change };
    if (next.period !== "all") params.set("period", next.period);
    if (next.status !== "all") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.test) params.set("test", next.test);
    const qs = params.toString();
    return `/dashboard/orders${qs ? `?${qs}` : ""}`;
  };
  const c = view.counts;
  const cards: Array<{ status: OrderStatusFilter; label: string; value: string; sub: string; icon: React.ElementType; tone: string }> = [
    { status: "paid", label: "Paid", value: `₹${c.revenue.toLocaleString("en-IN")}`, sub: `${c.paid} order${c.paid === 1 ? "" : "s"}${c.refundedAmount ? " · after refunds" : ""}`, icon: IndianRupee, tone: "text-green-700" },
    { status: "created", label: "Not paid", value: String(c.created), sub: "opened Razorpay, didn't pay", icon: Clock, tone: "text-brand-600" },
    { status: "failed", label: "Failed", value: String(c.failed), sub: "payment declined", icon: XCircle, tone: "text-danger-600" },
    { status: "refunded", label: "Refunded", value: String(c.refunded), sub: c.refundedAmount ? `−₹${c.refundedAmount.toLocaleString("en-IN")}` : "none", icon: RotateCcw, tone: "text-purple-700" },
    { status: "notdownloaded", label: "Paid, not downloaded", value: String(c.notDownloaded), sub: c.notDownloaded ? "follow up on WhatsApp" : "everyone has the PDF", icon: Download, tone: c.notDownloaded ? "text-amber-600" : "text-brand-500" },
  ];
  const since = new Date(SALES_START).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

  return (
    <AdminShell
      active="orders"
      title="Orders"
      description={view.includeTest ? "Including test orders from before live payments." : `From live payments (${since}) onwards. Test orders are hidden.`}
    >
      {/* Period tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {PERIODS.map(([value, label]) => (
          <Link key={value} href={href({ period: value })} aria-current={view.period === value ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${view.period === value ? "bg-brand-teal text-white" : "text-brand-600 hover:bg-brand-50"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Summary cards = filters */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const active = view.status === card.status;
          return (
            <Link key={card.status} href={href({ status: active ? "all" : card.status })} aria-pressed={active}
              className={`rounded-2xl p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 ${active ? "bg-brand-teal text-white" : "border border-brand-100 bg-white"}`}>
              <card.icon className={`h-5 w-5 ${active ? "text-white" : card.tone}`} aria-hidden="true" />
              <p className={`mt-2 text-2xl font-extrabold ${active ? "" : "text-brand-900"}`}>{card.value}</p>
              <p className={`text-xs font-bold ${active ? "text-white" : "text-brand-700"}`}>{card.label}</p>
              <p className={`text-[11px] ${active ? "text-white/75" : "text-brand-400"}`}>{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* Search + options */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action="/dashboard/orders" className="relative min-w-[220px] flex-1">
          {view.period !== "all" && <input type="hidden" name="period" value={view.period} />}
          {view.status !== "all" && <input type="hidden" name="status" value={view.status} />}
          {view.includeTest && <input type="hidden" name="test" value="1" />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" aria-hidden="true" />
          <input name="q" defaultValue={view.q} placeholder="Search phone, payment id (pay_…) or order id"
            className="h-11 w-full rounded-xl border border-brand-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15" />
        </form>
        <span className="text-xs text-brand-500">
          {view.status === "all" ? `${c.all} orders` : `Showing: ${cards.find((x) => x.status === view.status)?.label}`}
          {view.status !== "all" && <> · <Link href={href({ status: "all" })} className="font-bold text-brand-teal">show all</Link></>}
          {view.q && <> · <Link href={href({ q: "" })} className="font-bold text-brand-teal">clear search</Link></>}
        </span>
        <Link href={href({ test: view.includeTest ? "" : "1" })} className="text-xs font-semibold text-brand-500 underline underline-offset-2">
          {view.includeTest ? "Hide test orders" : "Show test orders"}
        </Link>
      </div>

      {view.rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-brand-300" />
          <p className="mt-3 text-sm font-semibold text-brand-700">No orders match.</p>
        </div>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {view.rows.map((o) => (
              <li key={o.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/dashboard/orders/${o.id}`} className="font-deva min-w-0 text-sm font-bold text-brand-900 hover:underline">{bookName(o.product_id)}</Link>
                  <StatusBadge status={o.status} refund={o.refund_status} />
                </div>
                <p className="mt-1 text-xs text-brand-500">{istTime(o.paid_at ?? o.created_at)} · <span className="font-deva">{LANGUAGE[o.locale ?? "mr"] ?? o.locale}</span> · ₹{o.amount}</p>
                <OrderFacts o={o} />
                <div className="mt-3 flex items-center gap-2">
                  {o.status === "paid" && <ResendButton orderId={o.id} />}
                  <Link href={`/dashboard/orders/${o.id}`} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">Details <ChevronRight className="h-3.5 w-3.5" /></Link>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[var(--shadow-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-brand-50/60 text-xs uppercase text-brand-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time (IST)</th>
                    <th className="px-4 py-3 font-semibold">Book</th>
                    <th className="px-4 py-3 font-semibold">Language</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Buyer</th>
                    <th className="px-4 py-3 font-semibold">Downloads</th>
                    <th className="px-4 py-3 font-semibold">WhatsApp</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {view.rows.map((o) => {
                    const phone = o.buyer_contact || o.whatsapp_number;
                    return (
                      <tr key={o.id} className="hover:bg-brand-50/40">
                        <td className="whitespace-nowrap px-4 py-3 text-brand-500">{istTime(o.paid_at ?? o.created_at)}</td>
                        <td className="font-deva max-w-[260px] truncate px-4 py-3 font-semibold text-brand-900" title={bookName(o.product_id)}><Link href={`/dashboard/orders/${o.id}`} className="hover:underline">{bookName(o.product_id)}</Link></td>
                        <td className="font-deva px-4 py-3 text-brand-600">{LANGUAGE[o.locale ?? "mr"] ?? o.locale}</td>
                        <td className="px-4 py-3 font-semibold text-brand-800">₹{o.amount}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} refund={o.refund_status} /></td>
                        <td className="px-4 py-3">
                          {phone ? (
                            <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-700"><MessageCircle className="h-3.5 w-3.5" /> {phone}</a>
                          ) : <span className="text-brand-400">—</span>}
                          {o.razorpay_payment_id && <span className="block text-[10px] text-brand-400">{o.razorpay_payment_id}</span>}
                        </td>
                        <td className="px-4 py-3 text-brand-600">{o.download_count ?? 0}</td>
                        <td className="px-4 py-3">{o.whatsapp_sends ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> {o.whatsapp_sends}</span> : <span className="text-brand-300">—</span>}</td>
                        <td className="px-4 py-3 text-right"><span className="inline-flex items-center gap-2">{o.status === "paid" && <ResendButton orderId={o.id} />}<Link href={`/dashboard/orders/${o.id}`} aria-label="Order details" className="rounded-lg border border-brand-200 p-1.5 text-brand-600 hover:bg-brand-50"><ChevronRight className="h-4 w-4" /></Link></span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {view.truncated && <p className="mt-3 text-xs text-brand-500">Showing the latest 200 matches. Narrow it with the period, a card or search.</p>}
        </>
      )}
    </AdminShell>
  );
}

function StatusBadge({ status, refund }: { status: string; refund?: "partial" | "full" | null }) {
  if (refund) {
    return <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">{refund === "full" ? "Refunded" : "Part refunded"}</span>;
  }
  const s = STATUS[status] ?? { label: status, className: "bg-brand-100 text-brand-600" };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function OrderFacts({ o }: { o: OrderRow }) {
  const phone = o.buyer_contact || o.whatsapp_number;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {phone ? (
        <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-700"><MessageCircle className="h-3.5 w-3.5" /> {phone}</a>
      ) : <span className="text-brand-400">no phone</span>}
      <span className="text-brand-600">Downloads: {o.download_count ?? 0}</span>
      <span className={o.whatsapp_sends ? "text-green-700" : "text-brand-400"}>WhatsApp: {o.whatsapp_sends ? `sent ${o.whatsapp_sends}×` : "not sent"}</span>
    </div>
  );
}
