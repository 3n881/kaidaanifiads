"use client";

import { useEffect, useState, useTransition } from "react";
import Form from "next/form";
import { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { refreshAdminData } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

/** Round refresh button: clears the 30-second dashboard cache, then re-reads the page. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Refresh orders"
      onClick={() =>
        startTransition(async () => {
          try {
            await refreshAdminData();
          } catch (error) {
            if (isStaleAction(error) && reloadForNewVersion()) return;
          }
          router.refresh();
        })
      }
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-800 shadow-[var(--shadow-card)] transition hover:bg-brand-50 active:scale-95"
    >
      <RefreshCw className={`h-5 w-5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
    </button>
  );
}

/** Thin bar under a tab while its list loads (place inside the <Link>). */
export function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-brand-teal transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
    />
  );
}

/** "2m old" badge — how long ago the list was read; ticks every 30 s. */
export function FreshnessBadge({ readAt }: { readAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const minutes = now === null ? 0 : Math.max(0, Math.floor((now - Date.parse(readAt)) / 60_000));
  const label = minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m old` : `${Math.floor(minutes / 60)}h old`;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${minutes >= 10 ? "bg-amber-100 text-amber-800" : "bg-amber-50 text-amber-700"}`}>
      {label}
    </span>
  );
}

/** Copies a value (phone number) — icon button like the original dashboard. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked (old browser) — nothing else to do.
        }
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-600 transition hover:bg-brand-50 active:scale-95"
    >
      {done ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

/** Custom date range (IST) — opens under the period tabs. */
export function CustomRange({ from, to, hidden, action }: { from: string; to: string; hidden: Record<string, string>; action: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Form action={action} scroll={false} onSubmit={() => setBusy(true)} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
      <input type="hidden" name="period" value="custom" />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="flex min-w-[140px] flex-1 flex-col text-xs font-semibold text-brand-600">
        From
        <input type="date" name="from" defaultValue={from} className="mt-1 h-10 rounded-lg border border-brand-200 bg-white px-2 text-sm text-brand-900" />
      </label>
      <label className="flex min-w-[140px] flex-1 flex-col text-xs font-semibold text-brand-600">
        To
        <input type="date" name="to" defaultValue={to} className="mt-1 h-10 rounded-lg border border-brand-200 bg-white px-2 text-sm text-brand-900" />
      </label>
      <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-teal px-4 text-sm font-bold text-white">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Show
      </button>
    </Form>
  );
}
