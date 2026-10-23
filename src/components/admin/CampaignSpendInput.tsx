"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { saveCampaignSpend } from "@/app/dashboard/actions";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

/** Analytics → Campaigns: total ₹ spent on one campaign (from Ads Manager); saved on blur or Enter. */
export default function CampaignSpendInput({ campaign, spend }: { campaign: string; spend: number | null }) {
  const router = useRouter();
  const initial = spend === null ? "" : String(spend);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (value.trim() === saved.trim()) return;
    startTransition(async () => {
      try {
        const result = await saveCampaignSpend(campaign, value);
        if (!result.ok) {
          setState("error");
          setMessage(result.message ?? "Not saved");
          return;
        }
        setSaved(value);
        setState("ok");
        router.refresh();
      } catch (error) {
        if (isStaleAction(error) && reloadForNewVersion()) return;
        setState("error");
        setMessage("Not saved — try again");
      }
    });
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-brand-500">
      <span className="shrink-0">Ad spend ₹</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="0"
        aria-label={`Total ad spend for ${campaign}`}
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-24 min-w-0 rounded-lg border border-brand-200 bg-white px-2 text-sm font-semibold tabular-nums text-brand-900 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
      />
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : state === "ok" ? (
        <Check className="h-3.5 w-3.5 text-green-600" aria-label="Saved" />
      ) : state === "error" ? (
        <span className="text-danger-600">{message}</span>
      ) : null}
    </label>
  );
}
