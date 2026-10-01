"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, X } from "lucide-react";
import { saveOrder } from "@/lib/purchases";
import { ORDER_COPY, type Locale } from "@/lib/i18n";

/** Remembers the order on this device and (once) starts the first download. */
export function OrderMemory({
  orderId,
  token,
  title,
  autoDownloadHref,
  locale = "mr",
}: {
  orderId: string;
  token: string;
  title: string;
  autoDownloadHref?: string;
  locale?: Locale;
}) {
  useEffect(() => {
    saveOrder({ orderId, token, title, locale });
    if (!autoDownloadHref) return;
    const flag = `kaf-dl-${orderId}`;
    try {
      if (window.sessionStorage.getItem(flag)) return;
      window.sessionStorage.setItem(flag, "1");
    } catch {
      // storage blocked — still try once per page load
    }
    // Same-tab navigation to an attachment response keeps this page open and
    // is not blocked by in-app browsers the way window.open() popups are.
    window.location.href = autoDownloadHref;
  }, [orderId, token, title, autoDownloadHref, locale]);
  return null;
}

/** Re-checks a pending order every few seconds while the webhook/confirm lands. */
export function PendingRefresh({ maxTries = 20, intervalMs = 3000 }) {
  const router = useRouter();
  const tries = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      tries.current += 1;
      if (tries.current > maxTries) {
        window.clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, maxTries, intervalMs]);

  if (gaveUp) {
    return (
      <p className="font-deva mt-3 text-xs text-amber-700">
        अजूनही पुष्टी झाली नाही. पैसे कापले गेले असल्यास हे पान नंतर पुन्हा उघडा किंवा
        WhatsApp सपोर्टशी संपर्क करा.
      </p>
    );
  }
  return (
    <Loader2 className="mx-auto mt-3 h-6 w-6 animate-spin text-brand-teal" aria-hidden="true" />
  );
}

type ContactState = "idle" | "sending" | "sent" | "error";

/**
 * Send the PDF to WhatsApp (and enable My Books lookup). When WhatsApp was
 * already sent, only a note + "send to another number" button is shown.
 * Otherwise the dialog opens by itself — after `waitForAutoMs` when an
 * automatic send is still expected (the webhook can land a few seconds after
 * this page): the page is refreshed meanwhile, and if the server then reports
 * `delivered`, the pending open is cancelled.
 */
export function WhatsAppOptIn({
  orderId,
  token,
  locale,
  delivered,
  waitForAutoMs = 0,
}: {
  orderId: string;
  token: string;
  locale: Locale;
  delivered: boolean;
  waitForAutoMs?: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<ContactState>("idle");
  const [message, setMessage] = useState("");
  const copy = ORDER_COPY[locale];

  useEffect(() => {
    if (delivered) return;
    const timers: number[] = [];
    if (waitForAutoMs > 0) {
      timers.push(window.setTimeout(() => router.refresh(), waitForAutoMs / 2));
      timers.push(window.setTimeout(() => router.refresh(), waitForAutoMs));
    }
    timers.push(window.setTimeout(() => dialogRef.current?.showModal(), waitForAutoMs + 1500));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [delivered, waitForAutoMs, router]);

  // Plain buttons, no <form>: a native form submit would reload this page
  // without its ?t= access token and show "page not found".
  const submit = async () => {
    if (state === "sending") return;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setState("error");
      setMessage(copy.invalidPhone);
      return;
    }
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/orders/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, accessToken: token, name, whatsapp: phone, locale }),
      });
      const result = (await response.json()) as { error?: string; delivered?: boolean };
      if (!response.ok) {
        setState("error");
        setMessage(result.error || "Number could not be saved.");
        return;
      }
      setState("sent");
      // Re-render from the server so the page shows "already sent".
      if (result.delivered) router.refresh();
      setMessage(
        result.delivered
          ? copy.sent
          : copy.saved,
      );
    } catch {
      setState("error");
      setMessage(locale === "en" ? "Number could not be saved. Please try again." : copy.invalidPhone);
    }
  };

  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <>
      {delivered ? (
        <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-center">
          <p className="font-deva flex items-center justify-center gap-2 text-sm font-bold text-brand-800">
            <MessageCircle className="h-4 w-4 text-[#128C7E]" aria-hidden="true" />
            {copy.alreadySent}
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="font-deva mt-1 text-xs font-semibold text-[#128C7E] underline"
          >
            {copy.otherNumber}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-sm font-bold text-brand-800 hover:bg-[#25D366]/15"
        >
          <MessageCircle className="h-4 w-4 text-[#128C7E]" aria-hidden="true" />
          {copy.whatsappTitle}
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby="whatsapp-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-brand-900 shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="whatsapp-dialog-title" className="font-deva text-lg font-extrabold">
                  {copy.whatsappTitle}
                </h2>
                <p id="whatsapp-dialog-description" className="font-deva mt-1 text-sm text-brand-500">
                  {copy.whatsappBody}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={copy.later} className="rounded-full p-1.5 text-brand-400 hover:bg-brand-50">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {state === "sent" ? (
            <div className="mt-5">
              <p className="font-deva rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{message}</p>
              <button type="button" onClick={() => dialogRef.current?.close()} className="mt-3 w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white">{UI_CLOSE[locale]}</button>
            </div>
          ) : (
            <div role="group" aria-describedby="whatsapp-dialog-description" className="mt-5 space-y-3">
              <div>
                <label htmlFor="whatsapp-name" className="font-deva mb-1 block text-xs font-semibold text-brand-700">{copy.name}</label>
                <input id="whatsapp-name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={onEnter} autoComplete="name" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal" />
              </div>
              <div>
                <label htmlFor="whatsapp-phone" className="font-deva mb-1 block text-xs font-semibold text-brand-700">{copy.phone}</label>
                <div className="flex rounded-xl border border-brand-200 bg-white focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
                  <span className="px-3 py-2.5 text-sm text-brand-500">+91</span>
                  <input id="whatsapp-phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} onKeyDown={onEnter} type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="send" aria-errormessage="whatsapp-error" className="w-full rounded-r-xl bg-transparent py-2.5 pr-3 text-sm outline-none" />
                </div>
              </div>
              {message && <p id="whatsapp-error" role="alert" className="text-xs font-medium text-danger-600">{message}</p>}
              <button type="button" onClick={() => void submit()} disabled={state === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#128C7E] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f766e] disabled:opacity-60">
                {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {state === "sending" ? copy.sending : copy.send}
              </button>
              <button type="button" onClick={() => dialogRef.current?.close()} className="w-full px-4 py-2 text-sm font-semibold text-brand-500">{copy.later}</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

const UI_CLOSE: Record<Locale, string> = { mr: "पूर्ण", hi: "हो गया", en: "Done" };
