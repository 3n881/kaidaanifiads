import Form from "next/form";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Download,
  IndianRupee,
  LogOut,
  MessageCircle,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Target,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ResendButton from "@/components/admin/ResendButton";
import { CopyButton, CustomRange, FreshnessBadge, PendingHint, RefreshButton } from "@/components/admin/OrdersClientBits";
import { ReminderBar, ReminderCheckbox, ReminderProvider, ReminderToolbar, SendReminderButton } from "@/components/admin/ReminderControls";
import type { AdminProduct } from "@/lib/admin";
import { coverThumbSrc } from "@/lib/covers";
import {
  dropOffKind,
  shortOrderId,
  type OrderPeriod,
  type OrderRow,
  type OrderStatusFilter,
  type OrdersView as OrdersViewData,
} from "@/lib/sales";

const LANGUAGE: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };
const PERIODS: Array<[OrderPeriod, string]> = [
  ["today", "Today"],
  ["week", "Week"],
  ["month", "Month"],
  ["2m", "2M"],
  ["3m", "3M"],
  ["all", "All"],
  ["custom", "Custom"],
];
const COMPARED: Partial<Record<OrderPeriod, string>> = {
  today: "vs yesterday, same time",
  week: "vs the 7 days before",
  month: "vs the 30 days before",
  "2m": "vs the 60 days before",
  "3m": "vs the 90 days before",
  custom: "vs the same length before",
};
const TABS: Array<[OrderStatusFilter, string]> = [
  ["all", "All"],
  ["paid", "Paid"],
  ["pending", "Pending"],
  ["failed", "Failed"],
  ["cancelled", "Cancelled"],
  ["refunded", "Refunded"],
  ["notdownloaded", "Not downloaded"],
];

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?=[6-9]\d{9}$)/, "91")}`;

type Filters = { period: string; from: string; to: string; status: OrderStatusFilter; q: string; test: string };

/** The Orders page (layout follows the client's original dashboard; phone first). */
/** `basePath` = this page's address (only changed by local layout previews). */
export default function OrdersView({ view, products, basePath = "/dashboard/orders" }: { view: OrdersViewData; products: AdminProduct[]; basePath?: string }) {
  const byId = new Map(products.map((p) => [p.id, p]));

  // Links keep the other filters and change one.
  const current: Filters = { period: view.period, from: view.from, to: view.to, status: view.status, q: view.q, test: view.includeTest ? "1" : "" };
  const query = (change: Partial<Filters>) => {
    const next = { ...current, ...change };
    const params = new URLSearchParams();
    if (next.period !== "all") params.set("period", next.period);
    if (next.period === "custom") {
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
    }
    if (next.status !== "all") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.test) params.set("test", next.test);
    return params.toString();
  };
  const href = (change: Partial<Filters>) => {
    const qs = query(change);
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  // Cards above the list jump down to it; tabs and search keep the scroll position.
  const toList = (change: Partial<Filters>) => `${href(change)}#recent-sales`;
  const exportHref = `/dashboard/orders/export${query({}) ? `?${query({})}` : ""}`;
  const k = view.kpis;
  const periodName = PERIODS.find(([p]) => p === view.period)?.[1] ?? "All";
  const shown = view.tabCounts[view.status];

  return (
    <AdminShell active="orders" title="Orders" action={<RefreshButton />}>
      <ReminderProvider
        tab={view.status}
        eligible={view.rows.filter(isRemindable).map((o) => ({ id: o.id, kind: dropOffKind(o) ?? "pending" }))}
      >
      <p className="-mt-4 mb-4 text-xs text-brand-500">
        Numbers for <b className="text-brand-700">{view.period === "custom" && (view.from || view.to) ? customLabel(view) : periodName}</b>
        {COMPARED[view.period] && <> · % {COMPARED[view.period]}</>}
        {view.includeTest ? " · including test orders" : " · live payments only"}
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" value={rupees(k.revenue)} icon={IndianRupee} tone="green" foot={<Trend value={k.revenueChange} />} />
        <KpiCard label="Paid orders" value={String(k.paid)} icon={BadgeCheck} tone="blue" foot={<Trend value={k.paidChange} />} />
        <KpiCard label="Avg order" value={k.avgOrder === null ? "—" : rupees(k.avgOrder)} icon={ShoppingBasket} tone="purple" foot="Per paid order" />
        <KpiCard
          label="Conversion"
          value={k.conversion === null ? "—" : `${(k.conversion * 100).toFixed(1)}%`}
          icon={Target}
          tone="orange"
          valueClass="text-orange-600"
          foot={`Paid / all attempts (${k.attempts})`}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Recovery opportunity */}
        <Link href={toList({ status: "pending" })} className="block">
          <KpiCard
            label="Recovery opp."
            value={rupees(k.recoveryAmount)}
            icon={AlertCircle}
            tone="red"
            valueClass="text-danger-600"
            foot={`${k.recoveryCount} failed / pending / cancelled`}
            className="h-full"
          />
        </Link>

        {/* Drop-off analysis */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-amber-800 sm:text-lg">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" /> Drop-off Analysis
            </h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{k.recoveryCount} not paid</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <DropTile href={toList({ status: "cancelled" })} icon={LogOut} value={view.dropOff.cancelled} label="Closed payment window" tone="amber" />
            <DropTile href={toList({ status: "failed" })} icon={CreditCard} value={view.dropOff.failed} label="Payment failed" tone="red" />
            <DropTile href={toList({ status: "pending" })} icon={UserX} value={view.dropOff.pending} label="Left without closing" tone="purple" className="col-span-2 sm:col-span-1" />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-amber-800/80">
            Failed payments have the buyer&apos;s number (WhatsApp reminder goes out after 10 min). Razorpay shares no number when the window is closed before paying.
            &quot;Closed payment window&quot; is counted from 17 Oct; older ones show as &quot;left&quot;.
          </p>
          {(k.refunded > 0 || k.notDownloaded > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {k.notDownloaded > 0 && (
                <Link href={toList({ status: "notdownloaded" })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-amber-800 ring-1 ring-amber-200">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" /> {k.notDownloaded} paid, not downloaded
                </Link>
              )}
              {k.refunded > 0 && (
                <Link href={toList({ status: "refunded" })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-purple-700 ring-1 ring-purple-200">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {k.refunded} refunded (−{rupees(k.refundedAmount)})
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Recent sales */}
      <section id="recent-sales" className="mt-5 scroll-mt-36 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:mt-6 sm:p-6">
        <h2 className="text-xl font-extrabold text-brand-900 sm:text-2xl">Recent Sales</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-500">
          <span>
            {shown} record{shown === 1 ? "" : "s"} found
          </span>
          <FreshnessBadge readAt={view.readAt} />
        </div>

        {/* Period tabs */}
        <nav aria-label="Period" className="no-scrollbar -mx-1 mt-4 flex gap-1 overflow-x-auto rounded-xl bg-brand-50/70 p-1">
          {PERIODS.map(([value, label]) => {
            const active = view.period === value;
            return (
              <Link
                key={value}
                href={href({ period: value })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold transition sm:px-4 ${active ? "bg-white text-brand-900 shadow-sm" : "text-brand-500 hover:text-brand-800"}`}
              >
                {label}
                <PendingHint />
              </Link>
            );
          })}
        </nav>
        {view.period === "custom" && (
          <CustomRange
            action={basePath}
            key={`${view.from}|${view.to}|${view.readAt}`}
            from={view.from}
            to={view.to}
            hidden={Object.fromEntries(
              Object.entries({ status: view.status === "all" ? "" : view.status, q: view.q, test: view.includeTest ? "1" : "" }).filter(([, v]) => v),
            )}
          />
        )}

        {/* Search */}
        <Form action={basePath} scroll={false} className="relative mt-3">
          {view.period !== "all" && <input type="hidden" name="period" value={view.period} />}
          {view.period === "custom" && view.from && <input type="hidden" name="from" value={view.from} />}
          {view.period === "custom" && view.to && <input type="hidden" name="to" value={view.to} />}
          {view.status !== "all" && <input type="hidden" name="status" value={view.status} />}
          {view.includeTest && <input type="hidden" name="test" value="1" />}
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400" aria-hidden="true" />
          <input
            name="q"
            type="search"
            defaultValue={view.q}
            placeholder="Search name, phone or order no."
            className="h-12 w-full rounded-2xl border border-brand-200 bg-white pl-12 pr-4 text-base outline-none placeholder:text-brand-400 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15"
          />
        </Form>

        {/* Status tabs + CSV */}
        <div className="mt-3 flex items-center gap-2">
          <nav aria-label="Status" className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-brand-50/70 p-1">
            {TABS.map(([value, label]) => {
              const active = view.status === value;
              const count = view.tabCounts[value];
              if (!active && count === 0 && (value === "refunded" || value === "notdownloaded")) return null;
              return (
                <Link
                  key={value}
                  href={href({ status: value })}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-white text-brand-900 shadow-sm" : "text-brand-500 hover:text-brand-800"}`}
                >
                  {label} <span className={`text-xs ${active ? "text-brand-500" : "text-brand-400"}`}>{count}</span>
                  <PendingHint />
                </Link>
              );
            })}
          </nav>
          <a
            href={exportHref}
            aria-label="Download these orders as CSV"
            title="Download CSV"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-700 shadow-sm hover:bg-brand-50"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
        {(view.q || view.includeTest) && (
          <p className="mt-2 text-xs text-brand-500">
            {view.q && (
              <>
                Search: <b>{view.q}</b> ·{" "}
                <Link href={href({ q: "" })} scroll={false} className="font-bold text-brand-teal">
                  clear
                </Link>
              </>
            )}
          </p>
        )}

        <ReminderToolbar />
        {view.rows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-brand-200 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-brand-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-brand-700">No orders match.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {view.rows.map((o) => (
              <OrderCard key={o.id} o={o} product={o.product_id === null ? undefined : byId.get(o.product_id)} reminders />
            ))}
          </ul>
        )}
        {view.truncated && <p className="mt-3 text-xs text-brand-500">Showing the latest {view.rows.length}. Pick a shorter period, a tab or search — or download the CSV for all.</p>}

        <div className="mt-4 border-t border-brand-50 pt-3 text-right">
          <Link href={href({ test: view.includeTest ? "" : "1" })} scroll={false} className="text-xs font-semibold text-brand-500 underline underline-offset-2">
            {view.includeTest ? "Hide test orders" : "Show test orders (before 11 Oct)"}
          </Link>
        </div>
      </section>
      <ReminderBar />
      </ReminderProvider>
    </AdminShell>
  );
}

function customLabel(view: OrdersViewData) {
  const d = (s: string) => new Date(`${s}T00:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  if (view.from && view.to) return `${d(view.from)} – ${d(view.to)}`;
  return view.from ? `from ${d(view.from)}` : `until ${d(view.to)}`;
}

const TONES = {
  green: { bg: "from-green-50/80", icon: "bg-green-100 text-green-600", ghost: "text-green-100" },
  blue: { bg: "from-blue-50/80", icon: "bg-blue-100 text-blue-600", ghost: "text-blue-100" },
  purple: { bg: "from-purple-50/80", icon: "bg-purple-100 text-purple-600", ghost: "text-purple-100" },
  orange: { bg: "from-orange-50/80", icon: "bg-orange-100 text-orange-600", ghost: "text-orange-100" },
  red: { bg: "from-red-50/80", icon: "bg-red-100 text-danger-600", ghost: "text-red-100" },
} as const;

export function KpiCard({ label, value, icon: Icon, tone, foot, valueClass = "text-brand-900", className = "" }: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: keyof typeof TONES;
  foot: React.ReactNode;
  valueClass?: string;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-brand-100/70 bg-gradient-to-br ${t.bg} to-white p-4 shadow-[var(--shadow-card)] sm:p-5 ${className}`}>
      <Icon className={`pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 ${t.ghost}`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500 sm:text-xs">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`relative mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl ${valueClass}`}>{value}</p>
      <div className="relative mt-1 text-xs font-medium text-brand-500 sm:text-sm">{foot}</div>
    </div>
  );
}

export function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-brand-400">no earlier data</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${up ? "text-green-600" : "text-danger-600"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" /> {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

const DROP_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-danger-600",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
} as const;

function DropTile({ href, icon: Icon, value, label, tone, className = "" }: {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
  tone: keyof typeof DROP_TONES;
  className?: string;
}) {
  return (
    <Link href={href} className={`rounded-xl border p-3 transition hover:-translate-y-0.5 sm:p-4 ${DROP_TONES[tone]} ${className}`}>
      <span className="flex items-center gap-2 text-2xl font-extrabold tabular-nums">
        <Icon className="h-5 w-5" aria-hidden="true" /> {value}
      </span>
      <span className="mt-1 block text-xs font-bold leading-tight sm:text-sm">{label}</span>
    </Link>
  );
}

const BADGES = {
  paid: ["PAID", "bg-green-100 text-green-700"],
  failed: ["FAILED", "bg-red-100 text-danger-600"],
  cancelled: ["CANCELLED", "bg-gray-100 text-gray-600"],
  pending: ["PENDING", "bg-amber-100 text-amber-800"],
  refunded: ["REFUNDED", "bg-purple-100 text-purple-700"],
  partial: ["PART REFUND", "bg-purple-100 text-purple-700"],
} as const;

/** `reminders`: show the tick + "Remind" on pending / cancelled / failed orders (Orders page only). */
export function OrderCard({ o, product, reminders = false }: { o: OrderRow; product?: AdminProduct; reminders?: boolean }) {
  const phone = o.buyer_contact || o.whatsapp_number;
  const remindable = reminders && isRemindable(o);
  // Name from the Buy popup (2026-10-18); older orders were "Guest".
  const buyerName = o.name && o.name !== "Guest" && o.name !== "Customer" ? o.name : null;
  const kind = o.refund_status === "full" ? "refunded" : o.refund_status === "partial" ? "partial" : (dropOffKind(o) ?? "paid");
  const [badge, badgeClass] = BADGES[kind];
  const locale = (o.locale ?? "mr") as "mr" | "hi" | "en";
  const title = product ? product[`title_${locale}`] || product.title_mr || product.title || `#${product.id}` : o.product_id === null ? "—" : `#${o.product_id}`;
  const cover = product ? product[`cover_image_${locale}`] || product.cover_image : null;
  const detail = `/dashboard/orders/${o.id}`;

  return (
    <li className="flex min-w-0 flex-col rounded-2xl border border-brand-100 bg-white p-3.5 shadow-[var(--shadow-card)] sm:p-4">
      <div className="flex items-start gap-3">
        {remindable && (
          <div className="flex h-16 items-center">
            <ReminderCheckbox id={o.id} />
          </div>
        )}
        <Link href={detail} className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50 ring-1 ring-brand-100">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP thumbnail
            <img src={coverThumbSrc(cover)} alt="" width={48} height={64} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-brand-300">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={detail} className="font-deva line-clamp-2 min-w-0 break-words text-base font-extrabold leading-snug text-brand-900 hover:underline">
              {buyerName ?? phone ?? <span className="font-semibold text-brand-400">No number</span>}
            </Link>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${badgeClass}`}>{badge}</span>
          </div>
          {buyerName && phone && <p className="text-sm font-semibold text-green-700">{phone}</p>}
          <p className="mt-0.5 text-xs text-brand-500">
            {istTime(o.paid_at ?? o.created_at)} · <span className="font-mono">#{shortOrderId(o.id)}</span>
          </p>
          <p className="font-deva mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-brand-800">{title}</p>
          <p className="font-deva mt-0.5 text-[11px] text-brand-400">
            {LANGUAGE[locale] ?? locale}
            {o.status === "paid" && (
              <>
                {" "}· Downloads {o.download_count ?? 0} · WhatsApp {o.whatsapp_sends ? `sent ${o.whatsapp_sends}×` : "not sent"}
              </>
            )}
          </p>
          {o.status !== "paid" && o.reminder_last_at && (
            <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
              Auto reminder{(o.reminder_count ?? 0) > 1 && (o.reminder_count ?? 0) < 4 ? `s: ${o.reminder_count}×` : ""} · last {istTime(o.reminder_last_at)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-brand-50 pt-3">
        <span className="mr-auto text-lg font-extrabold tabular-nums text-brand-900">₹{o.amount}</span>
        {phone && <CopyButton value={phone} label="Copy phone number" />}
        {phone && (
          <a
            href={waLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp the buyer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-bold text-green-700 hover:bg-green-100"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> <span className="hidden min-[360px]:inline">WhatsApp</span>
          </a>
        )}
        {o.status === "paid" && <ResendButton orderId={o.id} compact />}
        {remindable && <SendReminderButton id={o.id} />}
        <Link href={detail} aria-label="Order details" className="flex h-10 w-8 shrink-0 items-center justify-center text-brand-400 hover:text-brand-700">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

/**
 * Pending / cancelled / failed, not refunded, WITH a valid 10-digit number in
 * buyer_contact (the number reminders are sent to) → can get the payment
 * reminder. Older orders (before the 18 Oct Buy popup) mostly have no number:
 * no tick, no "Remind", never in "select all".
 */
function isRemindable(o: OrderRow): boolean {
  return (o.status === "created" || o.status === "failed") && /^[6-9]\d{9}$/.test(o.buyer_contact ?? "") && !o.refund_status;
}
