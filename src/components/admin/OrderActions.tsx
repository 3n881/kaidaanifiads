"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { syncOrderAction } from "@/app/dashboard/actions";
import ResendButton from "./ResendButton";

/** Order detail actions: check Razorpay, resend WhatsApp, copy the buyer's link. */
export default function OrderActions({ orderId, paid, buyerLink }: { orderId: string; paid: boolean; buyerLink: string | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setResult(await syncOrderAction(orderId)))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check with Razorpay
        </button>
        {paid && <ResendButton orderId={orderId} />}
        {paid && buyerLink && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(buyerLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {
                window.prompt("Copy the buyer's order link:", buyerLink);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy buyer's order link"}
          </button>
        )}
      </div>
      {result && <p className={`text-xs font-semibold ${result.ok ? "text-green-700" : "text-danger-600"}`}>{result.message}</p>}
      {paid && buyerLink && (
        <p className="text-[11px] text-brand-400">The buyer&apos;s order link opens their download page. Send it only to the buyer (WhatsApp) — anyone with it can download the PDF.</p>
      )}
    </div>
  );
}
