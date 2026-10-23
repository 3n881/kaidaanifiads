import type { Metadata } from "next";
import Form from "next/form";
import Link from "@/components/admin/AdminLink";
import { BellRing, CheckCircle2, FileDown, Megaphone, MessageCircle, Search, UserRound, XCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { getAdminProducts } from "@/lib/admin";
import { ResendAllRefused, ResendRefusedButton } from "@/components/admin/RefusedResend";
import { getRefusedStates, getWhatsAppLog, LOG_KINDS, type LogKindFilter, type WhatsAppKind } from "@/lib/whatsapp-log";

export const metadata: Metadata = {
  title: "Admin — WhatsApp",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KIND: Record<WhatsAppKind, { label: string; icon: React.ElementType; className: string }> = {
  pdf: { label: "Book PDF", icon: FileDown, className: "bg-green-100 text-green-800" },
  reminder: { label: "Auto reminder", icon: BellRing, className: "bg-amber-100 text-amber-800" },
  reminder_admin: { label: "Reminder by admin", icon: UserRound, className: "bg-blue-100 text-blue-800" },
  offer: { label: "Offer", icon: Megaphone, className: "bg-purple-100 text-purple-800" },
};
const KIND_TABS: Array<[LogKindFilter, string]> = [
  ["all", "All"],
  ["pdf", "Book PDF"],
  ["reminder", "Auto reminders"],
  ["reminder_admin", "By admin"],
  ["offer", "Offers"],
];
const PERIODS = [
  ["today", "Today"],
  ["week", "7 days"],
  ["all", "All"],
] as const;

const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Every WhatsApp message the store sent (migration 014). */
export default async function WhatsAppLogPage({ searchParams }: PageProps<"/dashboard/whatsapp">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const kind = LOG_KINDS.find((k) => k === one("kind")) ?? "all";
  const period = (["today", "week", "all"] as const).find((p) => p === one("period")) ?? "today";
  const failed = one("failed") === "1";
  const q = one("q").trim().slice(0, 60);
  const [rows, products] = await Promise.all([getWhatsAppLog({ kind, period, failed, q }), getAdminProducts()]);
  const states = await getRefusedStates(rows);
  // One "send again" per order and message type (newest refused row; rows are newest first).
  const openKeys = new Set<string>();
  const openIds = rows.filter((r) => {
    if (states.get(r.id) !== "open") return false;
    const key = `${r.kind === "pdf" ? "pdf" : "reminder"}:${r.order_id}`;
    if (openKeys.has(key)) return false;
    openKeys.add(key);
    return true;
  }).map((r) => r.id);
  const openSet = new Set(openIds);
  const titles = new Map(products.map((p) => [p.id, p.title_mr || p.title || p.title_hi || p.title_en || `#${p.id}`]));

  const href = (change: Partial<{ kind: string; period: string; failed: string; q: string }>) => {
    const next = { kind, period, failed: failed ? "1" : "", q, ...change };
    const params = new URLSearchParams();
    if (next.kind !== "all") params.set("kind", next.kind);
    if (next.period !== "today") params.set("period", next.period);
    if (next.failed) params.set("failed", next.failed);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return `/dashboard/whatsapp${qs ? `?${qs}` : ""}`;
  };
  const okCount = rows.filter((r) => r.ok).length;

  return (
    <AdminShell active="whatsapp" title="WhatsApp" description="Every WhatsApp message the store sent: book PDFs, automatic payment reminders, reminders sent from the dashboard, offers.">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Messages" value={rows.length} />
        <Stat label="Delivered to WhatsApp" value={okCount} tone="text-green-700" />
        <Stat label="Refused" value={rows.length - okCount} tone={rows.length - okCount ? "text-danger-600" : "text-brand-400"} />
      </div>

      <nav aria-label="Period" className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-xl bg-brand-50/70 p-1">
        {PERIODS.map(([value, label]) => (
          <Link key={value} href={href({ period: value })} scroll={false} aria-current={period === value ? "page" : undefined}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${period === value ? "bg-white text-brand-900 shadow-sm" : "text-brand-500"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Type" className="no-scrollbar mt-2 flex gap-1 overflow-x-auto rounded-xl bg-brand-50/70 p-1">
        {KIND_TABS.map(([value, label]) => (
          <Link key={value} href={href({ kind: value })} scroll={false} aria-current={kind === value ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${kind === value ? "bg-white text-brand-900 shadow-sm" : "text-brand-500"}`}>
            {label}
          </Link>
        ))}
        <Link href={href({ failed: failed ? "" : "1" })} scroll={false} aria-current={failed ? "page" : undefined}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${failed ? "bg-white text-danger-600 shadow-sm" : "text-brand-500"}`}>
          Refused only
        </Link>
      </nav>
      <ResendAllRefused ids={openIds} />
      <Form action="/dashboard/whatsapp" scroll={false} className="relative mt-3">
        {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
        {period !== "today" && <input type="hidden" name="period" value={period} />}
        {failed && <input type="hidden" name="failed" value="1" />}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-400" aria-hidden="true" />
        <input name="q" type="search" defaultValue={q} placeholder="Search name or phone"
          className="h-12 w-full rounded-2xl border border-brand-200 bg-white pl-12 pr-4 text-base outline-none placeholder:text-brand-400 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15" />
      </Form>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-brand-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-brand-700">No messages here yet.</p>
          <p className="mt-1 text-xs text-brand-400">Recording started on 18 Oct 2026; older messages are not listed.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const k = KIND[r.kind];
            return (
              <li key={r.id} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-extrabold ${k.className}`}>
                    <k.icon className="h-3.5 w-3.5" aria-hidden="true" /> {k.label}
                    {r.kind === "reminder" && r.step ? ` #${r.step}` : ""}
                  </span>
                  {r.ok ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sent</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-600"><XCircle className="h-4 w-4" aria-hidden="true" /> Refused</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-deva truncate text-base font-extrabold text-brand-900">{r.name || r.phone}</p>
                  {r.name && <p className="text-sm font-semibold text-green-700">{r.phone}</p>}
                  <p className="font-deva mt-1 line-clamp-2 text-sm text-brand-700">{r.product_id === null ? "—" : titles.get(r.product_id) ?? `#${r.product_id}`}</p>
                </div>
                {!r.ok && openSet.has(r.id) && <ResendRefusedButton id={r.id} />}
                {!r.ok && states.get(r.id) === "open" && !openSet.has(r.id) && (
                  <p className="text-xs font-semibold text-brand-400">Newer refused message above — send that one</p>
                )}
                {!r.ok && states.get(r.id) === "sent_later" && (
                  <p className="text-xs font-semibold text-green-700">Sent successfully later</p>
                )}
                {!r.ok && states.get(r.id) === "settled" && (
                  <p className="text-xs font-semibold text-brand-400">{r.kind === "pdf" ? "Order not paid — nothing to send" : "No longer needed — order paid or closed"}</p>
                )}
                <p className="mt-auto flex flex-wrap items-center gap-x-2 border-t border-brand-50 pt-2 text-[11px] text-brand-500">
                  <span>{istTime(r.created_at)}</span>
                  <span>· {r.sent_by === "auto" ? "automatic" : `by ${r.sent_by}`}</span>
                  {r.template && <span className="font-mono">· {r.template}</span>}
                  {r.order_id && (
                    <Link href={`/dashboard/orders/${r.order_id}`} className="ml-auto font-bold text-brand-teal">Order →</Link>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {rows.length >= 500 && <p className="mt-3 text-xs text-brand-500">Showing the latest 500. Narrow it with the period, type or search.</p>}
    </AdminShell>
  );
}

function Stat({ label, value, tone = "text-brand-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-3 shadow-[var(--shadow-card)] sm:p-4">
      <p className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">{label}</p>
    </div>
  );
}
