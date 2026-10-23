"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2, X } from "lucide-react";
import { sendRemindersAction } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

// Orders page: send the "payment not completed" WhatsApp reminder by hand to
// pending / cancelled / failed buyers — one card, or several selected (bulk).
// The server applies the same rules as the automatic reminders.

export const SKIP_LABELS: Record<string, string> = {
  owns_book: "already own the book",
  not_pending: "already paid",
  paid_now: "Razorpay shows paid — PDF sent",
  paying: "payment still in progress",
  newer_attempt: "a newer attempt on the same book",
  razorpay_unreachable: "Razorpay not reachable, try again",
  no_number: "no number",
  too_soon: "reminded in the last 10 min",
  failed: "WhatsApp refused",
  off: "reminders are switched off",
};

/** Unpaid group of an order (pending = Razorpay left open, cancelled = closed with X, failed = payment declined). */
export type UnpaidKind = "pending" | "cancelled" | "failed";
const KIND_WORD: Record<UnpaidKind, string> = { pending: "pending", cancelled: "cancelled", failed: "failed" };

type Ctx = {
  eligible: Array<{ id: string; kind: UnpaidKind }>;
  /** The status tab on show (all, pending, cancelled, failed, …). */
  tab: string;
  selected: Set<string>;
  toggle: (id: string) => void;
  select: (ids: string[]) => void;
  clear: () => void;
  send: (ids: string[]) => void;
  sending: boolean;
  result: string | null;
  clearResult: () => void;
};

const ReminderContext = createContext<Ctx | null>(null);

function useReminders(): Ctx {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error("ReminderProvider missing");
  return ctx;
}

export function ReminderProvider({ eligible, tab, children }: { eligible: Array<{ id: string; kind: UnpaidKind }>; tab: string; children: React.ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<string | null>(null);
  const [sending, startTransition] = useTransition();

  const value = useMemo<Ctx>(
    () => ({
      eligible,
      tab,
      selected,
      sending,
      result,
      clearResult: () => setResult(null),
      toggle: (id) =>
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      select: (ids) => setSelected(new Set(ids)),
      clear: () => setSelected(new Set()),
      send: (ids) =>
        startTransition(async () => {
          try {
            const { sent, skipped } = await sendRemindersAction(ids);
            const parts = Object.entries(skipped).map(([reason, n]) => `${n} skipped (${SKIP_LABELS[reason] ?? reason})`);
            setResult([`${sent} reminder${sent === 1 ? "" : "s"} sent on WhatsApp`, ...parts].join(" · "));
            setSelected(new Set());
            router.refresh();
          } catch (error) {
            if (isStaleAction(error) && reloadForNewVersion()) return;
            setResult("Could not send right now. Please try again.");
          }
        }),
    }),
    [eligible, tab, selected, sending, result, router],
  );

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

/** Round tick on a card (like the original dashboard). */
export function ReminderCheckbox({ id }: { id: string }) {
  const { selected, toggle } = useReminders();
  const on = selected.has(id);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label="Select for reminder"
      onClick={() => toggle(id)}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
        on ? "border-brand-teal bg-brand-teal text-white" : "border-brand-200 bg-white text-transparent hover:border-brand-400"
      }`}
    >
      <Check className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** "Remind" on one card: sends to this order now. */
export function SendReminderButton({ id }: { id: string }) {
  const { send, sending } = useReminders();
  return (
    <button
      type="button"
      onClick={() => send([id])}
      disabled={sending}
      title="Send the payment reminder on WhatsApp now"
      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BellRing className="h-4 w-4" aria-hidden="true" />}
      <span className="hidden min-[400px]:inline">Remind</span>
    </button>
  );
}

/** Above the list: "select all" for the tab on show (or one button per group on other tabs) + result line. */
export function ReminderToolbar() {
  const { eligible, tab, selected, select, clear, result, clearResult } = useReminders();
  if (eligible.length === 0 && !result) return null;
  const idsOf = (kind?: UnpaidKind) => eligible.filter((e) => !kind || e.kind === kind).map((e) => e.id);
  const sameSet = (ids: string[]) => ids.length > 0 && ids.length === selected.size && ids.every((id) => selected.has(id));
  const groups = (["pending", "cancelled", "failed"] as const).filter((k) => idsOf(k).length > 0);
  // Pending / Cancelled / Failed tab → one button for that group; any other tab → one per group + all unpaid.
  const buttons: Array<{ label: string; ids: string[] }> =
    tab === "pending" || tab === "cancelled" || tab === "failed"
      ? [{ label: `Select all ${idsOf(tab).length} ${KIND_WORD[tab]} here`, ids: idsOf(tab) }]
      : [
          ...groups.map((k) => ({ label: `${KIND_WORD[k][0].toUpperCase()}${KIND_WORD[k].slice(1)} (${idsOf(k).length})`, ids: idsOf(k) })),
          ...(groups.length > 1 ? [{ label: `All unpaid (${eligible.length})`, ids: idsOf() }] : []),
        ];
  return (
    <div className="mt-3 space-y-2">
      {eligible.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tab !== "pending" && tab !== "cancelled" && tab !== "failed" && (
            <span className="text-xs font-semibold text-brand-500">Select for reminder:</span>
          )}
          {buttons.map((b) => {
            const on = sameSet(b.ids);
            return (
              <button
                key={b.label}
                type="button"
                aria-pressed={on}
                onClick={() => (on ? clear() : select(b.ids))}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  on ? "border-brand-teal bg-brand-teal text-white" : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                }`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${on ? "border-white bg-white text-brand-teal" : "border-brand-300"}`}>
                  {on && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
                {b.label}
              </button>
            );
          })}
          <span className="text-[11px] text-brand-400">paid orders are skipped</span>
        </div>
      )}
      {result && (
        <p role="status" className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
          <span>{result}</span>
          <button type="button" onClick={clearResult} aria-label="Close" className="shrink-0 text-green-700">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
      )}
    </div>
  );
}

/** Sticky bar at the bottom while orders are selected. */
export function ReminderBar() {
  const { eligible, selected, send, sending, clear } = useReminders();
  if (selected.size === 0) return null;
  const mix = (["pending", "cancelled", "failed"] as const)
    .map((k) => [k, eligible.filter((e) => e.kind === k && selected.has(e.id)).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${KIND_WORD[k]}`)
    .join(" · ");
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(10,35,66,0.3)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-bold text-brand-900">
          {selected.size} selected
          <button type="button" onClick={clear} className="ml-2 text-xs font-semibold text-brand-500 underline underline-offset-2">
            clear
          </button>
          {mix && <span className="block text-[11px] font-semibold text-brand-500">{mix}</span>}
        </p>
        <button
          type="button"
          onClick={() => send([...selected])}
          disabled={sending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 text-sm font-extrabold text-brand-teal shadow-sm disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BellRing className="h-4 w-4" aria-hidden="true" />}
          Send reminder to {selected.size}
        </button>
      </div>
    </div>
  );
}
