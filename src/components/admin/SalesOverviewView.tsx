import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Inbox, IndianRupee, MessageCircle, ShoppingBag, XCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import type { AdminProduct } from "@/lib/admin";
import type { PeriodStats, SalesOrder, SalesOverview } from "@/lib/sales";

const LANGUAGE: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** The admin "Store overview" screen (sales first). Data comes from the page. */
export default function SalesOverviewView({ sales, products, setupWaiting, salesStart }: { sales: SalesOverview; products: AdminProduct[]; setupWaiting: string[]; salesStart: string }) {
  const titles = new Map<number, string>(products.map((p) => [p.id, p.title_mr || p.title || p.title_hi || p.title_en || `#${p.id}`]));
  const bookName = (id: number | null) => (id === null ? "—" : `#${id} ${titles.get(id) ?? ""}`);
  const attention = sales.paidNotDownloaded.length + sales.whatsappMissing.length + sales.newMessages;
  const since = new Date(salesStart).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

  return (
    <AdminShell active="overview" title="Store overview" description={`Sales since live payments started (${since}). Test orders before that are not counted.`}>
      {/* Sales: today / 7 days / all time */}
      <div className="grid gap-3 md:grid-cols-3">
        <PeriodCard title="Today" stats={sales.today} href="/dashboard/orders?period=today" highlight />
        <PeriodCard title="Last 7 days" stats={sales.week} href="/dashboard/orders?period=week" />
        <PeriodCard title="All time" stats={sales.all} href="/dashboard/orders" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* Needs attention */}
          <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 font-bold text-brand-900">
              <AlertTriangle className={`h-5 w-5 ${attention ? "text-amber-500" : "text-green-600"}`} aria-hidden="true" /> Needs attention
            </h2>
            {attention === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-green-600"><CheckCircle2 className="h-4 w-4" /> Nothing waiting. Every paid buyer has the PDF.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {sales.paidNotDownloaded.length > 0 && (
                  <AttentionList
                    href="/dashboard/orders?status=notdownloaded"
                    title={`Paid but not downloaded (${sales.paidNotDownloaded.length})`}
                    hint="Paid more than 15 minutes ago and never downloaded. Send the PDF from Orders (Resend WhatsApp) or call them."
                    rows={sales.paidNotDownloaded}
                    bookName={bookName}
                  />
                )}
                {sales.whatsappMissing.length > 0 && (
                  <AttentionList
                    href="/dashboard/orders?status=paid"
                    title={`WhatsApp not sent (${sales.whatsappMissing.length})`}
                    hint="Paid, but no WhatsApp message went out (no number from Razorpay, or Interakt failed). Use Resend WhatsApp in Orders."
                    rows={sales.whatsappMissing}
                    bookName={bookName}
                  />
                )}
                {sales.newMessages > 0 && (
                  <Link href="/dashboard/messages" className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    <span className="flex items-center gap-2"><Inbox className="h-4 w-4" /> {sales.newMessages} new contact message{sales.newMessages === 1 ? "" : "s"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Latest paid orders */}
          <section className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-bold text-brand-900">Latest paid orders</h2>
              <Link href="/dashboard/orders" className="text-xs font-bold text-brand-teal">All orders</Link>
            </div>
            {sales.latestPaid.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-sm text-brand-500">No paid orders yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-brand-50/60 text-xs uppercase text-brand-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Time (IST)</th>
                      <th className="px-4 py-2.5 font-semibold">Book</th>
                      <th className="px-4 py-2.5 font-semibold">Language</th>
                      <th className="px-4 py-2.5 font-semibold">Amount</th>
                      <th className="px-4 py-2.5 font-semibold">Downloaded</th>
                      <th className="px-4 py-2.5 font-semibold">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {sales.latestPaid.map((o) => (
                      <tr key={o.id}>
                        <td className="whitespace-nowrap px-4 py-2.5 text-brand-600">{istTime(o.paid_at ?? o.created_at)}</td>
                        <td className="font-deva max-w-[240px] truncate px-4 py-2.5 font-semibold text-brand-900"><Link href={`/dashboard/orders/${o.id}`} className="hover:underline">{bookName(o.product_id)}</Link></td>
                        <td className="font-deva px-4 py-2.5 text-brand-600">{LANGUAGE[o.locale ?? "mr"] ?? o.locale}</td>
                        <td className="px-4 py-2.5 font-semibold text-brand-900">{inr(Number(o.amount))}</td>
                        <td className="px-4 py-2.5"><Tick ok={Boolean(o.download_count)} /></td>
                        <td className="px-4 py-2.5"><Tick ok={Boolean(o.whatsapp_sends)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          {/* Top books this week */}
          <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 font-bold text-brand-900"><BookOpen className="h-5 w-5 text-brand-500" aria-hidden="true" /> Top books, last 7 days</h2>
            {sales.topBooksWeek.length === 0 ? (
              <p className="mt-2 text-sm text-brand-500">No sales in the last 7 days.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {sales.topBooksWeek.map((b, i) => (
                  <li key={String(b.productId)} className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-deva min-w-0 text-brand-800"><span className="mr-1 font-bold text-brand-400">{i + 1}.</span>{bookName(b.productId)}</span>
                    <span className="shrink-0 text-right font-semibold text-brand-900">{b.paid} · {inr(b.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Interested buyers (cancelled payment → WhatsApp offers sign-up) */}
          <Link href="/dashboard/leads" className="block rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
            <h2 className="flex items-center justify-between font-bold text-brand-900">Interested buyers <ArrowRight className="h-4 w-4 text-brand-400" /></h2>
            <p className="mt-1 text-sm text-brand-600"><b className="text-brand-900">{sales.interested.active}</b> want offers on WhatsApp{sales.interested.newWeek ? ` · ${sales.interested.newWeek} new this week` : ""}</p>
          </Link>

          {/* Setup: only what is really waiting */}
          <Link href="/dashboard/setup" className="block rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
            <h2 className="font-bold text-brand-900">Setup</h2>
            {setupWaiting.length ? (
              <>
                <p className="mt-1 text-sm text-amber-700">{setupWaiting.length} thing{setupWaiting.length === 1 ? "" : "s"} waiting on the client:</p>
                <p className="mt-1 text-xs text-brand-500">{setupWaiting.join(", ")}</p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-green-600">Business details complete.</p>
            )}
          </Link>

          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-brand-900">Products</h2>
            <p className="mt-1 text-sm text-brand-500">{products.filter((p) => !p.is_combo).length} ebooks · {products.filter((p) => p.is_combo).length} combos</p>
            <Link href="/dashboard/products/new" className="mt-4 flex items-center justify-between rounded-xl border border-brand-200 px-4 py-3 text-sm font-bold text-brand-700">Add an ebook <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

function PeriodCard({ title, stats, href, highlight = false }: { title: string; stats: PeriodStats; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`block rounded-2xl p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 ${highlight ? "bg-brand-teal text-white" : "border border-brand-100 bg-white text-brand-900"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${highlight ? "text-white/70" : "text-brand-400"}`}>{title}</p>
      <p className="mt-2 flex items-center text-3xl font-extrabold"><IndianRupee className="h-6 w-6" aria-hidden="true" />{stats.revenue.toLocaleString("en-IN")}</p>
      <div className={`mt-3 grid grid-cols-3 gap-2 text-xs ${highlight ? "text-white/85" : "text-brand-500"}`}>
        <span><ShoppingBag className="mb-0.5 inline h-3.5 w-3.5" /> <b className="text-sm">{stats.paid}</b> paid</span>
        <span title="Paid ÷ Buy taps that opened Razorpay"><b className="text-sm">{pct(stats.conversion)}</b> of {stats.checkouts} checkouts</span>
        <span><XCircle className="mb-0.5 inline h-3.5 w-3.5" /> <b className="text-sm">{stats.failed}</b> failed</span>
      </div>
      {stats.refunds > 0 && (
        <p className={`mt-2 text-[11px] ${highlight ? "text-white/75" : "text-brand-400"}`}>
          After refunds: {stats.refunds} refunded (−{inr(stats.refundedAmount)})
        </p>
      )}
    </Link>
  );
}

function AttentionList({ title, hint, rows, bookName, href }: { title: string; hint: string; rows: SalesOrder[]; bookName: (id: number | null) => string; href: string }) {
  return (
    <div>
      <Link href={href} className="flex items-center gap-1 text-sm font-bold text-amber-800 hover:underline">{title} <ArrowRight className="h-3.5 w-3.5" /></Link>
      <p className="text-xs text-brand-500">{hint}</p>
      <ul className="mt-2 divide-y divide-brand-50 rounded-xl border border-brand-100">
        {rows.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="text-brand-600">{istTime(o.paid_at ?? o.created_at)}</span>
            <span className="font-deva min-w-0 flex-1 truncate font-semibold text-brand-900">{bookName(o.product_id)}</span>
            {o.buyer_contact ? (
              <a href={`https://wa.me/${o.buyer_contact.replace(/\D/g, "").replace(/^(?=[6-9]\d{9}$)/, "91")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold text-green-700">
                <MessageCircle className="h-3.5 w-3.5" /> {o.buyer_contact}
              </a>
            ) : (
              <span className="text-brand-400">no phone</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return ok ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Yes" /> : <XCircle className="h-4 w-4 text-brand-300" aria-label="No" />;
}
