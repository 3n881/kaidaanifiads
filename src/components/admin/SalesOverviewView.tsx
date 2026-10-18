import Link from "@/components/admin/AdminLink";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Inbox,
  MessageCircleOff,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { FreshnessBadge, RefreshButton } from "@/components/admin/OrdersClientBits";
import { KpiCard, OrderCard, Trend } from "@/components/admin/OrdersView";
import type { AdminProduct } from "@/lib/admin";
import { coverThumbSrc } from "@/lib/covers";
import type { PeriodStats, SalesOverview } from "@/lib/sales";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

/** The admin "Store overview" screen — same card style as the Orders page, phone first. */
export default function SalesOverviewView({ sales, products, setupWaiting, salesStart }: { sales: SalesOverview; products: AdminProduct[]; setupWaiting: string[]; salesStart: string }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const title = (id: number | null) => {
    const p = id === null ? undefined : byId.get(id);
    return p ? p.title_mr || p.title || p.title_hi || p.title_en || `#${p.id}` : id === null ? "—" : `#${id}`;
  };
  const since = new Date(salesStart).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

  return (
    <AdminShell active="overview" title="Store overview" action={<RefreshButton />}>
      <p className="-mt-4 mb-4 flex flex-wrap items-center gap-2 text-xs text-brand-500">
        <span>Live payments since {since} · test orders not counted</span>
        <FreshnessBadge readAt={sales.readAt} />
      </p>

      {/* 1. Period cards */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <PeriodCard title="Today" note="vs yesterday, same time" stats={sales.today} href="/dashboard/orders?period=today" tone="green" />
        <PeriodCard title="Last 7 days" note="vs the 7 days before" stats={sales.week} href="/dashboard/orders?period=week" tone="blue" />
        <PeriodCard title="All time" stats={sales.all} href="/dashboard/orders" tone="purple" />
      </div>

      {/* 2. Needs attention */}
      <Attention sales={sales} />

      <div className="mt-5 grid gap-5 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* 3. Sales chart */}
        <SalesChart daily={sales.daily} />
        {/* 4. Top books */}
        <TopBooks books={sales.topBooksWeek} byId={byId} title={title} />
      </div>

      {/* 5. Latest paid orders */}
      <section className="mt-5 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:mt-6 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-brand-900 sm:text-xl">Latest paid orders</h2>
          <Link href="/dashboard/orders?status=paid" className="inline-flex items-center gap-1 text-sm font-bold text-brand-teal">
            See all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {sales.latestPaid.length === 0 ? (
          <p className="mt-3 text-sm text-brand-500">No paid orders yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sales.latestPaid.map((o) => (
              <OrderCard key={o.id} o={o} product={o.product_id === null ? undefined : byId.get(o.product_id)} />
            ))}
          </ul>
        )}
      </section>

      {/* 6. Small tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        <Tile
          href="/dashboard/leads"
          icon={Users}
          label="Interested buyers"
          value={String(sales.interested.active)}
          sub={sales.interested.newWeek ? `${sales.interested.newWeek} new this week` : "want offers on WhatsApp"}
        />
        <Tile
          href="/dashboard/messages"
          icon={Inbox}
          label="Messages"
          value={String(sales.newMessages)}
          sub={sales.newMessages ? "new, not handled" : "nothing new"}
          alert={sales.newMessages > 0}
        />
        <Tile
          href="/dashboard/setup"
          icon={Settings}
          label="Setup"
          value={setupWaiting.length ? String(setupWaiting.length) : "✓"}
          sub={setupWaiting.length ? `waiting: ${setupWaiting.join(", ")}` : "business details complete"}
          alert={setupWaiting.length > 0}
        />
        <Tile
          href="/dashboard/products"
          icon={BookOpen}
          label="Products"
          value={String(products.length)}
          sub={`${products.filter((p) => !p.is_combo).length} ebooks · ${products.filter((p) => p.is_combo).length} combos`}
        />
      </div>
    </AdminShell>
  );
}

const PERIOD_ICONS = { green: CalendarDays, blue: BarChart3, purple: Sparkles } as const;

function PeriodCard({ title, note, stats, href, tone }: { title: string; note?: string; stats: PeriodStats; href: string; tone: "green" | "blue" | "purple" }) {
  return (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      <KpiCard
        label={title}
        value={inr(stats.revenue)}
        icon={PERIOD_ICONS[tone]}
        tone={tone}
        className="h-full"
        foot={
          <div className="space-y-1.5">
            {note ? (
              <p className="flex flex-wrap items-center gap-x-1.5">
                <Trend value={stats.revenueChange} /> <span className="text-[11px] text-brand-400">{note}</span>
              </p>
            ) : (
              <p className="text-[11px] text-brand-400">since live payments</p>
            )}
            <p className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-brand-500">
              <span>
                <b className="block text-base text-brand-900">{stats.paid}</b>paid
                {note && stats.paidChange !== null && (
                  <span className={stats.paidChange >= 0 ? " text-green-600" : " text-danger-600"}>
                    {" "}
                    ({stats.paidChange >= 0 ? "+" : ""}
                    {stats.paidChange.toFixed(0)}%)
                  </span>
                )}
              </span>
              <span title="Paid ÷ Buy taps that opened Razorpay">
                <b className="block text-base text-orange-600">{pct(stats.conversion)}</b>of {stats.checkouts} tries
              </span>
              <span>
                <b className="block text-base text-danger-600">{stats.failed}</b>failed
              </span>
            </p>
            {stats.refunds > 0 && <p className="text-[11px] text-purple-700">After {stats.refunds} refund{stats.refunds === 1 ? "" : "s"} (−{inr(stats.refundedAmount)})</p>}
          </div>
        }
      />
    </Link>
  );
}

function Attention({ sales }: { sales: SalesOverview }) {
  const tiles = [
    { href: "/dashboard/orders?status=notdownloaded", icon: Download, value: sales.paidNotDownloaded.length, label: "Paid, not downloaded", hint: "Resend on WhatsApp", tone: "amber" },
    { href: "/dashboard/orders?status=paid", icon: MessageCircleOff, value: sales.whatsappMissing.length, label: "WhatsApp not sent", hint: "Use Resend", tone: "red" },
    { href: "/dashboard/orders?period=today&status=failed", icon: CreditCard, value: sales.failedToday.length, label: "Failed today", hint: "Have their number", tone: "purple" },
    { href: "/dashboard/messages", icon: Inbox, value: sales.newMessages, label: "New messages", hint: "Contact form", tone: "blue" },
  ] as const;
  const waiting = tiles.reduce((sum, t) => sum + t.value, 0);
  const TONE = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-danger-600",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  } as const;

  if (waiting === 0) {
    return (
      <section className="mt-3 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800 shadow-[var(--shadow-card)] sm:mt-4 sm:p-5">
        <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-extrabold">All good</p>
          <p className="text-sm text-green-700">Every paid buyer has the PDF, no failed payments to follow up, no new messages.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-[var(--shadow-card)] sm:mt-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-amber-800 sm:text-lg">Needs attention</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{waiting} waiting</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-xl border p-3 transition hover:-translate-y-0.5 sm:p-4 ${t.value ? TONE[t.tone] : "border-brand-100 bg-white text-brand-400"}`}
          >
            <span className="flex items-center gap-2 text-2xl font-extrabold tabular-nums">
              <t.icon className="h-5 w-5" aria-hidden="true" /> {t.value}
            </span>
            <span className="mt-1 block text-xs font-bold leading-tight sm:text-sm">{t.label}</span>
            <span className="mt-0.5 block text-[11px] opacity-80">{t.value ? t.hint : "none"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Daily ₹ for the last 14 days — one series, so no legend; tap/hover a bar for its numbers. */
function SalesChart({ daily }: { daily: SalesOverview["daily"] }) {
  const max = Math.max(...daily.map((d) => d.revenue), 0);
  const best = daily.reduce((b, d) => (d.revenue > b.revenue ? d : b), daily[0]);
  const total = daily.reduce((sum, d) => sum + d.revenue, 0);
  const totalPaid = daily.reduce((sum, d) => sum + d.paid, 0);
  const lastIndex = daily.length - 1;

  return (
    <section className="min-w-0 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-brand-900 sm:text-xl">Sales, last 14 days</h2>
        <p className="text-xs text-brand-500">
          <b className="text-brand-800">{inr(total)}</b> · {totalPaid} paid
        </p>
      </div>
      {max === 0 ? (
        <p className="mt-6 text-sm text-brand-500">No sales in the last 14 days yet.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-brand-500">
            Best day: <b className="text-brand-800">{dayLabel(best.date, { weekday: "short", day: "numeric", month: "short" })}</b> · {inr(best.revenue)} · {best.paid} paid
          </p>
          <div className="relative mt-5">
            {/* recessive grid line at the max */}
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-brand-100" aria-hidden="true" />
            <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-brand-400" aria-hidden="true">
              {inr(max)}
            </span>
            <ol className="flex h-40 items-end gap-[2px] border-b border-brand-200 sm:h-48" aria-label="Revenue per day">
              {daily.map((d, i) => {
                const h = max ? Math.max((d.revenue / max) * 100, d.revenue ? 3 : 0) : 0;
                return (
                  <li key={d.date} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" tabIndex={0}>
                    <span
                      className={`block w-full max-w-7 rounded-t-[4px] transition-colors ${i === lastIndex ? "bg-brand-gold" : "bg-brand-teal/80 group-hover:bg-brand-teal group-focus:bg-brand-teal"}`}
                      style={{ height: `${h}%` }}
                    />
                    {/* tooltip (hover / tap) */}
                    <span className={`pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap ${i < 3 ? "left-0" : i > lastIndex - 3 ? "right-0" : "left-1/2 -translate-x-1/2"} rounded-lg bg-brand-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block group-focus:block`}>
                      <b>{dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" })}</b>
                      <br />
                      {inr(d.revenue)} · {d.paid} paid
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-1.5 flex gap-[2px] text-[10px] text-brand-400" aria-hidden="true">
              {daily.map((d, i) => (
                <span key={d.date} className="min-w-0 flex-1 text-center">
                  {i === lastIndex ? "Today" : i % 2 === lastIndex % 2 ? dayLabel(d.date, { day: "numeric" }) : ""}
                </span>
              ))}
            </div>
          </div>
          {/* Same numbers as a table (screen readers, exact values) */}
          <details className="mt-3 text-xs text-brand-500">
            <summary className="cursor-pointer font-semibold text-brand-600">Show as table</summary>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="text-brand-400">
                  <th className="py-1 font-semibold">Day</th>
                  <th className="py-1 text-right font-semibold">Paid</th>
                  <th className="py-1 text-right font-semibold">₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date}>
                    <td className="py-1">{dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="py-1 text-right tabular-nums">{d.paid}</td>
                    <td className="py-1 text-right tabular-nums text-brand-800">{inr(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

function TopBooks({ books, byId, title }: { books: SalesOverview["topBooksWeek"]; byId: Map<number, AdminProduct>; title: (id: number | null) => string }) {
  const total = books.reduce((sum, b) => sum + b.paid, 0);
  return (
    <section className="min-w-0 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand-900 sm:text-xl">
        <BadgeCheck className="h-5 w-5 text-brand-500" aria-hidden="true" /> Top books, last 7 days
      </h2>
      {books.length === 0 ? (
        <p className="mt-3 text-sm text-brand-500">No sales in the last 7 days.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {books.map((b, i) => {
            const p = b.productId === null ? undefined : byId.get(b.productId);
            const cover = p?.cover_image_mr || p?.cover_image;
            const share = total ? b.paid / total : 0;
            return (
              <li key={String(b.productId)} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center text-sm font-extrabold text-brand-300">{i + 1}</span>
                <span className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-brand-50 ring-1 ring-brand-100">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP thumbnail
                    <img src={coverThumbSrc(cover)} alt="" width={40} height={56} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-deva truncate text-sm font-semibold text-brand-900">{title(b.productId)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-50">
                      <span className="block h-full rounded-full bg-brand-teal/80" style={{ width: `${Math.max(share * 100, 4)}%` }} />
                    </span>
                    <span className="shrink-0 text-[11px] text-brand-500">{Math.round(share * 100)}%</span>
                  </div>
                </div>
                <span className="shrink-0 text-right text-xs text-brand-500">
                  <b className="block text-sm text-brand-900">{b.paid} sold</b>
                  {inr(b.revenue)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Tile({ href, icon: Icon, label, value, sub, alert = false }: { href: string; icon: React.ElementType; label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-500">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${alert ? "text-amber-600" : "text-brand-400"}`} aria-hidden="true" />
      </span>
      <span className={`mt-2 text-2xl font-extrabold tabular-nums ${alert ? "text-amber-700" : "text-brand-900"}`}>{value}</span>
      <span className="mt-0.5 line-clamp-2 text-[11px] text-brand-500">{sub}</span>
    </Link>
  );
}
