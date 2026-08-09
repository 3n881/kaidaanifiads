"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, Check } from "lucide-react";
import { resendDelivery } from "@/app/dashboard/actions";

export default function ResendButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await resendDelivery(orderId);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : done ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Send className="h-3.5 w-3.5" />
      )}
      {done ? "पाठवले" : "Resend"}
    </button>
  );
}
