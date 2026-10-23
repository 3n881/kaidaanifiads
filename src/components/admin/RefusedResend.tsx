"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw, X } from "lucide-react";
import { resendRefusedAction } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";
import { SKIP_LABELS } from "./ReminderControls";

// WhatsApp page: send refused book PDFs / payment reminders again — one card,
// or every refused message still waiting. The server re-checks each one.

const LABELS: Record<string, string> = {
  ...SKIP_LABELS,
  already_sent: "already sent since",
  not_paid: "order not paid",
  no_order: "no order to send for",
};

function summary({ sent, refused, skipped }: { sent: number; refused: number; skipped: Record<string, number> }) {
  const parts = [`${sent} sent`];
  if (refused) parts.push(`${refused} refused again — check the Interakt wallet / account`);
  for (const [reason, n] of Object.entries(skipped)) parts.push(`${n} skipped (${LABELS[reason] ?? reason})`);
  return { text: parts.join(" · "), bad: refused > 0 };
}

function useResend() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; bad: boolean } | null>(null);
  const send = (ids: string[]) =>
    startTransition(async () => {
      try {
        setResult(summary(await resendRefusedAction(ids)));
        router.refresh();
      } catch (error) {
        if (isStaleAction(error) && reloadForNewVersion()) return;
        setResult({ text: "Could not send right now. Please try again.", bad: true });
      }
    });
  return { pending, result, clear: () => setResult(null), send };
}

/** "Send again" on one refused card. */
export function ResendRefusedButton({ id }: { id: string }) {
  const { pending, result, send } = useResend();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => send([id])}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-xs font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />}
        Send again
      </button>
      {result && <span role="status" className={`text-[11px] font-semibold ${result.bad ? "text-danger-600" : "text-green-700"}`}>{result.text}</span>}
    </span>
  );
}

/** Above the list: send every refused message that still needs sending. */
export function ResendAllRefused({ ids }: { ids: string[] }) {
  const { pending, result, clear, send } = useResend();
  if (ids.length === 0 && !result) return null;
  return (
    <div className="mt-3 space-y-2">
      {ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm font-semibold text-red-700">
            {ids.length} refused message{ids.length === 1 ? "" : "s"} not sent yet (book PDFs / payment reminders).
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Send ${ids.length} refused WhatsApp message${ids.length === 1 ? "" : "s"} again now?`)) send(ids);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-teal px-4 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="h-4 w-4" aria-hidden="true" />}
            Send all again
          </button>
        </div>
      )}
      {result && (
        <p role="status" className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${result.bad ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>
          <span>{result.text}</span>
          <button type="button" onClick={clear} aria-label="Close" className="shrink-0">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
      )}
    </div>
  );
}
