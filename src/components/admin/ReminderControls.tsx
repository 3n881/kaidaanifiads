"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2, X } from "lucide-react";
import { sendRemindersAction } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

// Orders page: send the "payment not completed" WhatsApp reminder by hand to
// pending / cancelled / failed buyers — one card, or several selected (bulk).
// The server applies the same rules as the automatic reminders.

const SKIP_LABELS: Record<string, string> = {
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

type Ctx = {
  eligible: string[];
  selected: Set<string>;
  toggle: (id: string) => void;
  setAll: (on: boolean) => void;
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

export function ReminderProvider({ eligible, children }: { eligible: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<string | null>(null);
  const [sending, startTransition] = useTransition();

  const value = useMemo<Ctx>(
    () => ({
      eligible,
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
      setAll: (on) => setSelected(on ? new Set(eligible) : new Set()),
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
    [eligible, selected, sending, result, router],
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

/** Above the list: select all + result line. */
export function ReminderToolbar() {
  const { eligible, selected, setAll, result, clearResult } = useReminders();
  if (eligible.length === 0 && !result) return null;
  const allOn = eligible.length > 0 && selected.size === eligible.length;
  return (
    <div className="mt-3 space-y-2">
      {eligible.length > 0 && (
        <button
          type="button"
          onClick={() => setAll(!allOn)}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50"
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${allOn ? "border-brand-teal bg-brand-teal text-white" : "border-brand-300"}`}>
            {allOn && <Check className="h-3 w-3" aria-hidden="true" />}
          </span>
          {allOn ? "Clear selection" : `Select all ${eligible.length} pending here`}
        </button>
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
  const { selected, send, sending, setAll } = useReminders();
  if (selected.size === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(10,35,66,0.3)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-bold text-brand-900">
          {selected.size} selected
          <button type="button" onClick={() => setAll(false)} className="ml-2 text-xs font-semibold text-brand-500 underline underline-offset-2">
            clear
          </button>
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
