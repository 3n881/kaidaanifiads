"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, Check } from "lucide-react";
import { resendDelivery } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

/** `compact`: icon only on phones (label from sm up). */
export default function ResendButton({ orderId, compact = false }: { orderId: string; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      aria-label="Resend PDF on WhatsApp"
      title="Resend PDF on WhatsApp"
      onClick={() =>
        startTransition(async () => {
          try {
            await resendDelivery(orderId);
          } catch (error) {
            // Page loaded before a deploy → reload to get the new version.
            if (isStaleAction(error) && reloadForNewVersion()) return;
            throw error;
          }
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        })
      }
      disabled={pending}
      className={`inline-flex items-center gap-1.5 border border-brand-200 font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60 ${
        compact ? "h-10 justify-center rounded-xl px-3 text-sm" : "rounded-lg px-2.5 py-1.5 text-xs"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : done ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Send className="h-3.5 w-3.5" />
      )}
      <span className={compact ? "hidden sm:inline" : undefined}>{done ? "पाठवले" : "Resend"}</span>
    </button>
  );
}
