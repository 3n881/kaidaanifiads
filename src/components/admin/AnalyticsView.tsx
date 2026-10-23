import Link from "@/components/admin/AdminLink";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  IndianRupee,
  Info,
  Megaphone,
  MessageCircle,
  RotateCcw,
  ShoppingBasket,
  Target,
  Users,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { CustomRange, FreshnessBadge, PendingHint, RefreshButton } from "@/components/admin/OrdersClientBits";
import { KpiCard, Trend } from "@/components/admin/OrdersView";
import type { AdminProduct } from "@/lib/admin";
import CampaignSpendInput from "@/components/admin/CampaignSpendInput";
import { FUNNEL_STEPS, type Analytics, type CampaignRow, type Counted } from "@/lib/analytics";
import { coverThumbSrc } from "@/lib/covers";
import type { OrderPeriod } from "@/lib/sales";

// Dashboard → Analytics. Phone first: every section is one card, lists are
// horizontal bars (labels never squeezed), day / hour charts are one colour
// with tap-or-hover numbers and a "Show as table" view.

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(n * 100 >= 10 ? 0 : 1)}%`);
const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts });
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

export default function AnalyticsView({ data, products, period, from, to }: { data: Analytics; products: AdminProduct[]; period: OrderPeriod; from: string; to: string }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const title = (id: number) => {
    const p = byId.get(id);
    return p ? p.title_mr || p.title || p.title_hi || p.title_en || `#${id}` : `#${id}`;
  };
  const href = (p: OrderPeriod) => `/dashboard/analytics${p === "all" ? "" : `?period=${p}`}`;
  const m = data.money;
  const periodName =
    period === "custom" && (from || to)
      ? [from, to].filter(Boolean).map((d) => dayLabel(d, { day: "numeric", month: "short" })).join(" – ")
      : PERIODS.find(([p]) => p === period)?.[1] ?? "All";

  return (
    <AdminShell active="analytics" title="Analytics" description="What sells, where sales are lost, and what brings buyers back." action={<RefreshButton />}>
      {/* Period */}
      <nav aria-label="Period" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-brand-100">
        {PERIODS.map(([value, label]) => (
          <Link
            key={value}
            href={href(value)}
            scroll={false}
            aria-current={period === value ? "page" : undefined}
            className={`relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold transition sm:px-4 ${period === value ? "bg-brand-teal text-white" : "text-brand-500 hover:text-brand-800"}`}
          >
            {label}
            <PendingHint />
          </Link>
        ))}
      </nav>
      {period === "custom" && <CustomRange action="/dashboard/analytics" from={from} to={to} hidden={{}} />}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-500">
        <span>
          Numbers for <b className="text-brand-700">{periodName}</b>
          {COMPARED[period] && <> · % {COMPARED[period]}</>} · live payments only
        </span>
        <FreshnessBadge readAt={data.readAt} />
      </p>

      {/* Findings */}
      {data.insights.length > 0 && (
        <section className="mt-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
          <h2 className="text-base font-extrabold text-brand-900 sm:text-lg">What the numbers say</h2>
          <ul className="mt-3 space-y-2">
            {data.insights.map((i) => {
              const Icon = i.tone === "good" ? CheckCircle2 : i.tone === "bad" ? AlertTriangle : Info;
              const tone = i.tone === "good" ? "border-green-200 bg-green-50 text-green-800" : i.tone === "bad" ? "border-red-200 bg-red-50 text-red-800" : "border-brand-100 bg-brand-50/60 text-brand-800";
              return (
                <li key={i.text} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm leading-snug ${tone}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{i.text}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Money */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" value={inr(m.revenue)} icon={IndianRupee} tone="green" foot={<Trend value={m.revenueChange} />} />
        <KpiCard label="Paid orders" value={String(m.paid)} icon={BadgeCheck} tone="blue" foot={<Trend value={m.paidChange} />} />
        <KpiCard label="Avg order" value={m.avgOrder === null ? "—" : inr(m.avgOrder)} icon={ShoppingBasket} tone="purple" foot={m.refunds ? `${m.refunds} refunded (−${inr(m.refundedAmount)})` : "Per paid order"} />
        <KpiCard
          label="Conversion"
          value={pct(m.conversion)}
          icon={Target}
          tone="orange"
          valueClass="text-orange-600"
          foot={`${m.paid} paid of ${m.tries} who tried`}
        />
      </div>

      <Card title="Sales by day" icon={IndianRupee} note={`${inr(data.daily.reduce((s, d) => s + d.revenue, 0))} · ${data.daily.reduce((s, d) => s + d.paid, 0)} paid`}>
        <ColumnChart
          label="Revenue per day"
          items={data.daily.map((d, i, list) => ({
            key: d.date,
            value: d.revenue,
            axis: list.length <= 16 ? (i % 2 === (list.length - 1) % 2 ? dayLabel(d.date, { day: "numeric" }) : "") : i % 7 === (list.length - 1) % 7 ? dayLabel(d.date, { day: "numeric", month: "short" }) : "",
            tip: [dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" }), `${inr(d.revenue)} · ${d.paid} paid · ${d.tries} tried`],
            row: [dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" }), String(d.tries), String(d.paid), inr(d.revenue)],
          }))}
          max={inr(Math.max(0, ...data.daily.map((d) => d.revenue)))}
          headers={["Day", "Tried", "Paid", "₹"]}
          newestFirst
        />
      </Card>

      {/* Visit funnel (our own tracking, migration 016) */}
      <Card title="From visit to payment" icon={Filter} note={data.traffic.since ? `our own visit count from ${dayLabel(istDay(data.traffic.since), { day: "numeric", month: "short" })}` : undefined}>
        {!data.traffic.ready ? (
          <TrackingNotReady />
        ) : data.traffic.funnel[0] === 0 ? (
          <p className="text-sm text-brand-500">No visits recorded in this period yet.</p>
        ) : (
          <>
            <Funnel steps={data.traffic.funnel} />
            {data.traffic.books.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-brand-800">Per book</h3>
                <ol className="mt-2 divide-y divide-brand-50">
                  {data.traffic.books.slice(0, 12).map((b) => (
                    <li key={b.productId} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-deva line-clamp-2 min-w-0 text-sm font-bold leading-snug text-brand-900">{title(b.productId)}</p>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-brand-700">{pct(b.steps[0] ? b.steps[4] / b.steps[0] : null)} paid</span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-5 gap-1 text-center">
                        {b.steps.map((n, i) => {
                          const prev = i ? b.steps[i - 1] : null;
                          const low = prev !== null && prev >= 5 && n / prev < 0.3;
                          return (
                            <div key={BOOK_STEPS[i]} className={`min-w-0 rounded-lg px-0.5 py-1 ${low ? "bg-red-50 text-red-800" : "bg-brand-50/60 text-brand-900"}`}>
                              <p className="text-sm font-extrabold tabular-nums">{n}</p>
                              <p className="truncate text-[10px] leading-tight opacity-75">{BOOK_STEPS[i]}</p>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
                {data.traffic.books.length > 12 && <p className="mt-1 text-xs text-brand-500">Top 12 of {data.traffic.books.length} books shown (most viewed first).</p>}
                <p className="mt-1 text-[11px] leading-snug text-brand-400">Red = fewer than 3 in 10 went on from the step before. Tapping Buy on a book list also counts as a book view.</p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Campaigns & ads */}
      <Card title="Campaigns & ads" icon={Megaphone} note="which link brought each visit and sale">
        {!data.traffic.ready ? (
          <TrackingNotReady />
        ) : data.traffic.campaigns.length === 0 ? (
          <p className="text-sm text-brand-500">No visits recorded in this period yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-brand-50">
              {data.traffic.campaigns.slice(0, 20).map((c) => (
                <CampaignItem key={c.key} c={c} />
              ))}
            </ul>
            {data.traffic.ads.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-brand-800">By ad</h3>
                <BarList
                  items={data.traffic.ads.map((a) => ({
                    label: `${a.ad} · ${a.label}`,
                    value: a.visits,
                    fill: a.sales,
                    right: `${inr(a.revenue)} · ${a.sales}/${a.visits}`,
                  }))}
                  fillLegend="₹ revenue · sales/visits · bar = visits, dark part = sales"
                />
              </div>
            )}
            {data.traffic.untrackedSales > 0 && (
              <p className="mt-3 text-[11px] leading-snug text-brand-400">
                {data.traffic.untrackedSales} paid order{data.traffic.untrackedSales === 1 ? "" : "s"} in this period had no visit record (page opened before tracking started, or the browser blocks storage) and {data.traffic.untrackedSales === 1 ? "is" : "are"} not in this list.
              </p>
            )}
          </>
        )}
        <details className="mt-3 text-xs text-brand-500">
          <summary className="cursor-pointer font-semibold text-brand-600">How to tag Meta ads</summary>
          <p className="mt-2 leading-snug">
            In Ads Manager open each ad → <b>Tracking</b> → <b>URL parameters</b> and paste:
          </p>
          <code className="mt-1 block break-all rounded-lg bg-brand-50 px-2 py-1.5 text-[11px] text-brand-800">
            {"utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}"}
          </code>
          <p className="mt-2 leading-snug">
            Each campaign then shows here by name and each ad under “By ad”. Type the total spend from Ads Manager next to a campaign to see the rupees it earns per rupee spent (all-time sales ÷ spend). Untagged ad clicks show as “Meta ad (no campaign tag)”.
          </p>
        </details>
      </Card>

      {/* Lost sales & recovery */}
      <Card title="Lost sales & who came back" icon={RotateCcw} note="one buyer + one book counts once, however many times they tried">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat label="Lost sales" value={String(data.lost.sales)} sub={`${inr(data.lost.value)} not paid`} tone="red" />
          <Stat label="Came back & paid" value={String(data.lost.recovered)} sub={`${inr(data.lost.recoveredValue)} · ${pct(data.lost.sales ? data.lost.recovered / data.lost.sales : null)}`} tone="green" />
          <Stat label="Still unpaid" value={inr(data.lost.stillLostValue)} sub={`${data.lost.stillLost} sales`} tone="amber" />
          <Stat
            label="Time to come back"
            value={data.lost.medianMinutesBack === null ? "—" : minutes(data.lost.medianMinutesBack)}
            sub={data.lost.otherBook ? `${data.lost.otherBook} bought another book instead` : "typical (median)"}
          />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-brand-800">How they dropped off → how many came back</h3>
            <BarList
              items={(
                [
                  ["failed", "Payment failed"],
                  ["cancelled", "Closed the payment window"],
                  ["pending", "Left without closing"],
                ] as const
              ).map(([k, label]) => ({
                label,
                value: data.lost.byKind[k].sales,
                fill: data.lost.byKind[k].recovered,
                right: `${data.lost.byKind[k].recovered} of ${data.lost.byKind[k].sales} back`,
              }))}
              fillLegend="dark part = came back and paid"
            />
            <p className="mt-1 text-[11px] leading-snug text-brand-400">
              Before 18 Oct the buyer&apos;s number was only known after paying or a failed payment, so each unfinished try from then counts separately.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-800">Does the WhatsApp reminder help?</h3>
            {data.lost.reminded.sales + data.lost.notReminded.sales === 0 ? (
              <p className="mt-2 text-sm text-brand-500">No lost sales with a WhatsApp number in this period.</p>
            ) : (
              <>
                <BarList
                  percent
                  items={[
                    { label: "Got a reminder", value: data.lost.reminded.sales, fill: data.lost.reminded.recovered, right: `${pct(rate(data.lost.reminded))} came back (${data.lost.reminded.recovered} of ${data.lost.reminded.sales})` },
                    { label: "No reminder", value: data.lost.notReminded.sales, fill: data.lost.notReminded.recovered, right: `${pct(rate(data.lost.notReminded))} came back (${data.lost.notReminded.recovered} of ${data.lost.notReminded.sales})` },
                  ].filter((i) => i.value > 0)}
                  fillLegend="bar = share who came back and paid"
                />
                <p className="mt-2 text-xs text-brand-500">
                  Reminded buyers who paid brought in <b className="text-brand-800">{inr(data.lost.reminded.value)}</b>. Only buyers with a WhatsApp number are counted.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Failures */}
      <Card title="Why payments failed" icon={CreditCard} note={`${data.failures.total} failed payments`}>
        {data.failures.total === 0 ? (
          <p className="text-sm text-brand-500">No failed payments in this period.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-brand-800">Reason (from Razorpay)</h3>
              <BarList items={counted(data.failures.reasons)} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-800">Tried to pay with</h3>
              {data.failures.methods.length ? <BarList items={counted(data.failures.methods)} /> : <p className="mt-2 text-sm text-brand-500">Not known yet.</p>}
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-brand-400">
          Reasons for older failed payments are fetched from Razorpay in the background (a few every 10 minutes). “Payment timed out” = the buyer didn&apos;t approve in the UPI app in time.
        </p>
      </Card>

      {/* Books */}
      <Card title="Books" icon={BookOpen} note="sorted by revenue">
        {data.books.length === 0 ? (
          <p className="text-sm text-brand-500">No orders in this period.</p>
        ) : (
          <>
            <ol className="divide-y divide-brand-50">
              {data.books.slice(0, 15).map((b) => {
                const p = byId.get(b.productId);
                const cover = p?.cover_image_mr || p?.cover_image;
                return (
                  <li key={b.productId} className="flex items-center gap-3 py-2.5">
                    <span className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-brand-50 ring-1 ring-brand-100">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP thumbnail
                        <img src={coverThumbSrc(cover)} alt="" width={36} height={48} loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-deva line-clamp-2 text-sm font-bold leading-snug text-brand-900">{title(b.productId)}</p>
                      <p className="mt-0.5 text-xs text-brand-500">
                        {b.paid} paid of {b.tries} tried · <b className={b.lowConversion ? "text-danger-600" : "text-brand-700"}>{pct(b.conversion)}</b>
                        {b.lowConversion && <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-danger-600"><AlertTriangle className="h-3 w-3" aria-hidden="true" /> few complete</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-brand-900">{inr(b.revenue)}</span>
                  </li>
                );
              })}
            </ol>
            {data.books.length > 15 && <p className="mt-2 text-xs text-brand-500">Top 15 of {data.books.length} books shown.</p>}
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-brand-800">Paid orders by language</h3>
                {data.languages.length ? (
                  <BarList items={data.languages.map((l) => ({ label: LANGUAGE[l.locale] ?? l.locale, value: l.paid, right: `${l.paid} · ${inr(l.revenue)}` }))} deva />
                ) : (
                  <p className="mt-2 text-sm text-brand-500">No paid orders yet.</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-800">Single books vs combos</h3>
                <BarList
                  items={[
                    { label: "Single books", value: data.kinds.single.paid, right: `${data.kinds.single.paid} · ${inr(data.kinds.single.revenue)}` },
                    { label: "Combo packs", value: data.kinds.combo.paid, right: `${data.kinds.combo.paid} · ${inr(data.kinds.combo.revenue)}` },
                  ]}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Customers */}
      <Card title="Customers" icon={Users}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat label="Buyers" value={String(data.customers.buyers)} sub="paid in this period" />
          <Stat label="New buyers" value={String(data.customers.newBuyers)} sub="first purchase" tone="green" />
          <Stat label="Repeat buyers" value={String(data.customers.repeatBuyers)} sub="2+ purchases ever" tone="blue" />
          <Stat label="Books per buyer" value={data.customers.booksPerBuyer === null ? "—" : data.customers.booksPerBuyer.toFixed(2)} sub="in this period" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-brand-800">Second-book chance</h3>
            <p className="mt-1 text-sm text-brand-700">
              <b className="text-2xl font-extrabold tabular-nums text-brand-900">{data.customers.oneBookBuyers}</b> of {data.customers.allTimeBuyers} buyers (all time) own just one book — the people a &ldquo;next book&rdquo; or combo offer suits best.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-800">Often bought together</h3>
            {data.customers.pairs.length ? (
              <ul className="mt-2 space-y-2">
                {data.customers.pairs.map((p) => (
                  <li key={`${p.a}-${p.b}`} className="rounded-xl bg-brand-50/60 px-3 py-2 text-sm">
                    <p className="font-deva line-clamp-2 font-semibold leading-snug text-brand-800">{title(p.a)} <span className="font-sans text-brand-400">+</span> {title(p.b)}</p>
                    <p className="mt-0.5 text-xs text-brand-500">{p.buyers} buyer{p.buyers === 1 ? "" : "s"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-brand-500">No buyer has two books yet.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Timing */}
      <Card title="When people buy" icon={Clock} note="India time, by when Buy was tapped">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <h3 className="text-sm font-bold text-brand-800">By hour of the day</h3>
            <ColumnChart
              label="Paid orders per hour"
              items={data.hours.map((h) => ({
                key: String(h.hour),
                value: h.paid,
                axis: h.hour % 3 === 0 ? hourLabel(h.hour) : "",
                tip: [`${hourLabel(h.hour)}–${hourLabel((h.hour + 1) % 24)}`, `${h.paid} paid · ${h.tries} tried · ${h.failed} failed`],
                row: [`${hourLabel(h.hour)}–${hourLabel((h.hour + 1) % 24)}`, String(h.tries), String(h.paid), String(h.failed)],
              }))}
              max={String(Math.max(0, ...data.hours.map((h) => h.paid)))}
              headers={["Hour", "Tried", "Paid", "Failed"]}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-800">By day of the week</h3>
            <ColumnChart
              label="Paid orders per weekday"
              items={data.weekdays.map((d) => ({
                key: String(d.day),
                value: d.paid,
                axis: WEEKDAYS[d.day],
                tip: [WEEKDAYS[d.day], `${d.paid} paid · ${d.tries} tried`],
                row: [WEEKDAYS[d.day], String(d.tries), String(d.paid)],
              }))}
              max={String(Math.max(0, ...data.weekdays.map((d) => d.paid)))}
              headers={["Day", "Tried", "Paid"]}
            />
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-2">
        {/* WhatsApp */}
        <Card title="WhatsApp" icon={MessageCircle} note={`recorded from ${dayLabel(data.whatsapp.since.slice(0, 10), { day: "numeric", month: "short" })}`} flush>
          {data.whatsapp.refusingNow && (
            <p className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                The latest messages were all refused — check the Interakt wallet.{" "}
                <Link href="/dashboard/whatsapp?failed=1&period=week" className="underline">See refused</Link>
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat label="Messages sent" value={String(data.whatsapp.sent)} sub={data.whatsapp.refused ? `${data.whatsapp.refused} refused` : "none refused"} tone={data.whatsapp.refused ? "amber" : "green"} />
            <Stat label="Book PDFs" value={String(data.whatsapp.pdf.sent)} sub={`${data.whatsapp.paidWithPdf} of ${data.whatsapp.paid} paid got one`} />
            <Stat label="Reminders" value={String(data.whatsapp.reminders.sent)} sub={data.whatsapp.reminders.refused ? `${data.whatsapp.reminders.refused} refused` : "payment reminders"} />
            <Stat label="Downloaded" value={pct(data.whatsapp.paid ? data.whatsapp.downloaded / data.whatsapp.paid : null)} sub={`${data.whatsapp.downloaded} of ${data.whatsapp.paid} paid`} />
          </div>
        </Card>

        {/* Ads */}
        <Card title="Meta ads" icon={Megaphone} note={`from ${dayLabel(data.ads.since.slice(0, 10), { day: "numeric", month: "short" })}`} flush>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat label="From an ad click" value={inr(data.ads.fromAds.revenue)} sub={`${data.ads.fromAds.paid} paid of ${data.ads.fromAds.tries} · ${pct(rate({ sales: data.ads.fromAds.tries, recovered: data.ads.fromAds.paid }))}`} tone="blue" />
            <Stat label="Other visitors" value={inr(data.ads.other.revenue)} sub={`${data.ads.other.paid} paid of ${data.ads.other.tries} · ${pct(rate({ sales: data.ads.other.tries, recovered: data.ads.other.paid }))}`} />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-brand-400">
            “From an ad click” = Meta&apos;s ad-click marker was on the buyer&apos;s browser at checkout. Which campaign and ad brought each sale: see “Campaigns &amp; ads” above.
          </p>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-brand-400">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Live payments from 11 Oct 2026. “Tried” counts each buyer once per book. Numbers refresh every 30 s (or press Refresh).
      </p>
    </AdminShell>
  );
}

const BOOK_STEPS = ["Viewed", "Buy", "Details", "Razorpay", "Paid"];
const istDay = (iso: string) => new Date(Date.parse(iso) + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

function TrackingNotReady() {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Visit tracking is waiting for its database table: run <b className="break-all">supabase/migrations/016_visit_events.sql</b> in the Supabase SQL editor. Numbers start from the first visit after that.
    </p>
  );
}

/** Funnel steps as bars (width = share of all visits) with the drop-off between steps. */
function Funnel({ steps }: { steps: number[] }) {
  const top = Math.max(1, steps[0]);
  return (
    <ol className="space-y-1">
      {steps.map((n, i) => {
        const prev = i ? steps[i - 1] : null;
        const goOn = prev ? n / prev : null;
        return (
          <li key={FUNNEL_STEPS[i]}>
            {prev !== null && (
              <p className={`py-0.5 pl-3 text-[11px] font-semibold ${goOn !== null && goOn <= 0.3 ? "text-danger-600" : "text-brand-400"}`}>
                ↓ {pct(goOn)} go on · {(prev - n).toLocaleString("en-IN")} left here
              </p>
            )}
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 font-semibold text-brand-800">{FUNNEL_STEPS[i]}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-brand-700">
                {n.toLocaleString("en-IN")}
                {i > 0 && <span className="font-normal text-brand-400"> · {pct(n / top)} of visits</span>}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-brand-50">
              <div className="h-full rounded-full bg-brand-teal/80" style={{ width: `${Math.max((n / top) * 100, n ? 1.5 : 0)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CampaignItem({ c }: { c: CampaignRow }) {
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold leading-snug text-brand-900">{c.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-500">
            {c.tagged && <span className="mr-1 rounded bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-600">{c.source}</span>}
            {c.visits} visits · {c.buyTaps} tapped Buy · {c.sales} sale{c.sales === 1 ? "" : "s"} · <b className="text-brand-700">{pct(c.conversion)}</b> of visits paid
          </p>
        </div>
        <span className="shrink-0 text-sm font-extrabold tabular-nums text-brand-900">{inr(c.revenue)}</span>
      </div>
      {c.tagged && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CampaignSpendInput campaign={c.label} spend={c.spend} />
          {c.roas !== null && (
            <span className={`text-xs font-bold ${c.roas >= 1 ? "text-green-700" : "text-danger-600"}`}>
              {c.roas.toFixed(2)}× return · {inr(Math.round(c.allTimeRevenue))} all-time sales
            </span>
          )}
        </div>
      )}
    </li>
  );
}

const rate = (g: { sales: number; recovered: number }) => (g.sales ? g.recovered / g.sales : null);
const counted = (list: Counted) => list.map(([label, n]) => ({ label, value: n, right: String(n) }));

function minutes(m: number) {
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} days`;
}

function Card({ title, icon: Icon, note, flush = false, children }: { title: string; icon: React.ElementType; note?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:p-6 ${flush ? "" : "mt-5 sm:mt-6"}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand-900 sm:text-xl">
          <Icon className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" /> {title}
        </h2>
        {note && <p className="text-xs text-brand-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const STAT_TONES = {
  neutral: "bg-brand-50/60 text-brand-900",
  green: "bg-green-50 text-green-800",
  red: "bg-red-50 text-red-800",
  amber: "bg-amber-50 text-amber-900",
  blue: "bg-blue-50 text-blue-900",
} as const;

function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: keyof typeof STAT_TONES }) {
  return (
    <div className={`min-w-0 rounded-xl p-3 ${STAT_TONES[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 break-words text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug opacity-80">{sub}</p>}
    </div>
  );
}

/**
 * Horizontal bars: label above, bar below, number on the right — reads on a
 * 320 px phone. `fill` draws a darker part inside the bar (e.g. came back);
 * `percent` sizes bars by fill ÷ value instead of value.
 */
function BarList({ items, fillLegend, percent = false, deva = false }: {
  items: Array<{ label: string; value: number; fill?: number; right: string }>;
  fillLegend?: string;
  percent?: boolean;
  deva?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <>
      <ul className="mt-2 space-y-2.5">
        {items.map((i) => {
          const width = percent ? (i.value ? ((i.fill ?? 0) / i.value) * 100 : 0) : (i.value / max) * 100;
          const fillWidth = !percent && i.fill !== undefined && i.value ? (i.fill / i.value) * 100 : null;
          return (
            <li key={i.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`min-w-0 break-words font-semibold text-brand-800 ${deva ? "font-deva" : ""}`}>{i.label}</span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-brand-700">{i.right}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-brand-50" title={i.right}>
                {/* Plain bars are solid; two-part bars are pale with the darker part inside. */}
                <div
                  className={`relative h-full rounded-full ${!percent && fillWidth === null ? "bg-brand-teal/80" : "bg-brand-teal/30"}`}
                  style={{ width: `${Math.max(width, i.value ? 2 : 0)}%` }}
                >
                  {(percent || fillWidth !== null) && (
                    <div className="absolute inset-y-0 left-0 rounded-full bg-brand-teal" style={{ width: percent ? "100%" : `${fillWidth}%` }} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {fillLegend && <p className="mt-2 text-[11px] text-brand-400">{fillLegend}</p>}
    </>
  );
}

/** One-colour column chart (days / hours): tap or hover a column for its numbers; the same numbers as a table below. */
function ColumnChart({ items, label, max, headers, newestFirst = false }: {
  items: Array<{ key: string; value: number; axis: string; tip: [string, string]; row: string[] }>;
  label: string;
  max: string;
  headers: string[];
  newestFirst?: boolean;
}) {
  const top = Math.max(0, ...items.map((i) => i.value));
  const last = items.length - 1;
  if (top === 0) return <p className="mt-2 text-sm text-brand-500">Nothing in this period yet.</p>;
  return (
    <>
      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-brand-100" aria-hidden="true" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-brand-400" aria-hidden="true">{max}</span>
        <ol className="flex h-36 items-end gap-[2px] border-b border-brand-200 sm:h-44" aria-label={label}>
          {items.map((i, n) => {
            const h = (i.value / top) * 100;
            return (
              <li key={i.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" tabIndex={0}>
                <span className="block w-full max-w-7 rounded-t-[4px] bg-brand-teal/80 transition-colors group-hover:bg-brand-teal group-focus:bg-brand-teal" style={{ height: `${Math.max(h, i.value ? 3 : 0)}%` }} />
                <span
                  className={`pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap ${n < 3 ? "left-0" : n > last - 3 ? "right-0" : "left-1/2 -translate-x-1/2"} rounded-lg bg-brand-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block group-focus:block`}
                >
                  <b>{i.tip[0]}</b>
                  <br />
                  {i.tip[1]}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-1.5 flex gap-[2px] text-[10px] text-brand-400" aria-hidden="true">
          {items.map((i) => (
            <span key={i.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">{i.axis}</span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs text-brand-500">
        <summary className="cursor-pointer font-semibold text-brand-600">Show as table</summary>
        <div className="max-h-72 overflow-y-auto">
          <table className="mt-2 w-full text-left">
            <thead>
              <tr className="text-brand-400">
                {headers.map((h, n) => (
                  <th key={h} className={`py-1 font-semibold ${n ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {(newestFirst ? [...items].reverse() : items).map((i) => (
                <tr key={i.key}>
                  {i.row.map((c, n) => (
                    <td key={n} className={`py-1 ${n ? "text-right tabular-nums" : ""} ${n === i.row.length - 1 ? "text-brand-800" : ""}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
