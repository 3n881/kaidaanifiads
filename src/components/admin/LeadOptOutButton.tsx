"use client";

import { useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { optOutLead } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

/** Stops WhatsApp offers to one interested buyer (they sent STOP / asked). */
export default function LeadOptOutButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Stop WhatsApp offers to this number?")) return;
        startTransition(async () => {
          try {
            await optOutLead(leadId);
          } catch (error) {
            // Page loaded before a deploy → reload to get the new version.
            if (isStaleAction(error) && reloadForNewVersion()) return;
            throw error;
          }
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />} Remove
    </button>
  );
}
