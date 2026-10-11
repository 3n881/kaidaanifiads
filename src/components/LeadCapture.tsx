"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { LEAD_CONSENT_TEXT, NOT_PAID_COPY } from "@/lib/lead-copy";

// Shown in the Buy window after a visitor closes Razorpay without paying.
// At most once a day per device, never again once a number was saved.
const STORE_KEY = "kaf-lead";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): { saved?: boolean; askedOn?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStore(value: { saved?: boolean; askedOn?: string }) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...value }));
  } catch {
    // private mode: the box may show again — harmless
  }
}

/** Decides once (on mount) whether to show the box today. */
export function shouldOfferLead(): boolean {
  const store = readStore();
  return !store.saved && store.askedOn !== today();
}

export default function LeadCapture({ locale, productId }: { locale: Locale; productId: number }) {
  const c = NOT_PAID_COPY[locale];
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "hidden">("idle");
  const [error, setError] = useState<string | null>(null);

  // Counts as "asked today" as soon as it is shown.
  useEffect(() => writeStore({ askedOn: today() }), []);

  if (state === "hidden") return null;

  if (state === "done") {
    return (
      <p className="font-deva flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm font-semibold text-green-700" role="status">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {c.leadDone}
      </p>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) return setError(c.badPhone);
    if (!consent) return setError(c.needConsent);
    setState("saving");
    try {
      const website = (new FormData(event.currentTarget).get("website") as string) || "";
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, productId, locale, source: "cancelled", consent: true, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      writeStore({ saved: true });
      setState("done");
    } catch {
      setState("idle");
      setError(c.busy);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-green-200 bg-green-50/60 p-4 text-left">
      <p className="font-deva flex items-center gap-2 text-sm font-bold text-brand-900">
        <MessageCircle className="h-4 w-4 text-green-600" aria-hidden="true" /> {c.leadTitle}
      </p>
      <p className="font-deva mt-0.5 text-xs text-brand-600">{c.leadBody}</p>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder={c.phone}
        aria-label={c.phone}
        className="font-deva mt-3 h-11 w-full rounded-xl border border-brand-200 bg-white px-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
      />
      <label className="font-deva mt-2 flex items-start gap-2 text-[11px] leading-snug text-brand-600">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-600" />
        <span>{LEAD_CONSENT_TEXT[locale]}</span>
      </label>
      {error && <p className="font-deva mt-2 text-xs font-semibold text-danger-600" role="alert">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={state === "saving"} className="font-deva inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
          {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {c.notify}
        </button>
        <button type="button" onClick={() => setState("hidden")} className="font-deva rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-500 hover:bg-white">
          {c.noThanks}
        </button>
      </div>
    </form>
  );
}
