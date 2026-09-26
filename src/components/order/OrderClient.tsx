"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { saveOrder } from "@/lib/purchases";

/** Remembers the order on this device and (once) starts the first download. */
export function OrderMemory({
  orderId,
  token,
  title,
  autoDownloadHref,
}: {
  orderId: string;
  token: string;
  title: string;
  autoDownloadHref?: string;
}) {
  useEffect(() => {
    saveOrder({ orderId, token, title });
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
  }, [orderId, token, title, autoDownloadHref]);
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

/** Optional: send the order link to WhatsApp (and enable My Books lookup). */
export function WhatsAppOptIn({
  orderId,
  token,
}: {
  orderId: string;
  token: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<ContactState>("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setState("error");
      setMessage("कृपया वैध १० अंकी WhatsApp नंबर भरा.");
      return;
    }
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/orders/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, accessToken: token, name, whatsapp: phone }),
      });
      const result = (await response.json()) as { error?: string; delivered?: boolean };
      if (!response.ok) {
        setState("error");
        setMessage(result.error || "Number could not be saved.");
        return;
      }
      setState("sent");
      setMessage(
        result.delivered
          ? "पुस्तकाची लिंक WhatsApp वर पाठवली आहे."
          : "नंबर सेव्ह झाला. हे पुस्तक आता My Books मध्येही मिळेल.",
      );
    } catch {
      setState("error");
      setMessage("Number could not be saved. Please try again.");
    }
  };

  if (state === "sent") {
    return (
      <p className="font-deva rounded-xl bg-green-50 px-3 py-3 text-xs font-semibold text-green-700">
        {message}
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-left"
    >
      <div className="mb-2 flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" aria-hidden="true" />
        <div>
          <p className="font-deva text-xs font-bold text-brand-800">
            WhatsApp वर लिंक हवी आहे? (Optional)
          </p>
          <p className="font-deva text-[11px] text-brand-500">
            नंबर दिल्यास लिंक WhatsApp वर येईल आणि My Books मधूनही पुन्हा मिळेल.
          </p>
        </div>
      </div>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="name"
        placeholder="नाव (optional)"
        className="mb-2 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
      />
      <div className="flex rounded-lg border border-brand-200 bg-white focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
        <span className="px-3 py-2 text-sm text-brand-500">+91</span>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="send"
          aria-label="WhatsApp number"
          placeholder="10 अंकी WhatsApp नंबर"
          className="w-full rounded-r-lg bg-transparent py-2 pr-3 text-sm outline-none"
        />
      </div>
      {message && (
        <p className={`mt-2 text-[11px] ${state === "error" ? "text-danger-600" : "text-brand-600"}`}>
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
      >
        {state === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        WhatsApp वर पाठवा
      </button>
    </form>
  );
}
