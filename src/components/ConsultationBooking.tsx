"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, CheckCircle2, ChevronDown, Loader2, MessageCircle, Phone, ShieldCheck, Video } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { SITE } from "@/data/catalog";
import { loadSavedBuyer } from "@/lib/buyer";
import { CONSULT_COPY, CONSULT_PRICE, MODES, SLOTS, TOPICS, type Mode, type Slot, type Topic } from "@/lib/consult-copy";
import { checkConsult, dayRange, DESCRIPTION_MIN, type ConsultField } from "@/lib/consult-form";
import { loadRazorpayScript, openRazorpay, type RazorpaySuccess } from "@/lib/razorpay-client";
import { trackPixel } from "@/lib/meta-pixel";
import { visitForCheckout } from "@/lib/visit-tracking";
import type { Locale } from "@/lib/i18n";

type Answer = {
  bookingNo?: string;
  bookingId?: string;
  error?: string;
  razorpay?: { keyId: string; orderId: string; amount: number; currency: string; prefill: Record<string, string> };
};

const MODE_ICON: Record<Mode, React.ElementType> = { phone: Phone, whatsapp: MessageCircle, video: Video };

/**
 * Paid consultation booking (client, 28 Nov): ₹999 online. Opens on the
 * topic of the book the buyer came from (?book=<id>), else they pick one.
 * Texts follow the website language. Phone: info, form, pinned pay button;
 * computers: info + FAQ left, form right.
 */
export default function ConsultationBooking({ initialTopic, bookId, bookTitle }: { initialTopic: Topic; bookId: number | null; bookTitle: string | null }) {
  const { locale } = useLanguage();
  const c = CONSULT_COPY[locale];
  const { min, max } = dayRange();
  const [form, setForm] = useState({
    topic: initialTopic,
    name: "",
    phone: "",
    district: "",
    description: "",
    date: min,
    slot: "morning" as Slot,
    mode: "phone" as Mode,
    language: locale as Locale,
    consent: false,
  });
  const [touched, setTouched] = useState<Partial<Record<ConsultField, boolean>>>({});
  const [showAll, setShowAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ bookingNo: string } | null>(null);
  const pending = useRef<{ key: string; data: Answer } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Name + number remembered from an earlier purchase on this device.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = loadSavedBuyer();
      setForm((f) => ({ ...f, name: f.name || saved.name, phone: f.phone || saved.phone }));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  // The pinned pay bar (phones) lifts the WhatsApp / back-to-top buttons.
  useEffect(() => {
    if (done) return;
    document.body.dataset.buybar = "on";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, [done]);

  const { bad } = checkConsult(form);
  const badSet = new Set(bad);
  const wrong = (f: ConsultField) => badSet.has(f) && (showAll || touched[f]);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (bad.length) {
      setShowAll(true);
      setError(c.errors.first);
      formRef.current?.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    const clean = checkConsult(form).form;
    const pixel = { content_ids: [`consult-${clean.topic}`], content_name: c.topics[clean.topic], content_type: "product", content_category: "consultation", value: CONSULT_PRICE, currency: "INR" };
    trackPixel("InitiateCheckout", pixel);
    setSending(true);
    let data: Answer;
    try {
      const key = JSON.stringify(clean);
      if (pending.current?.key === key) {
        data = pending.current.data; // same details: reopen the same booking's payment
      } else {
        const [response] = await Promise.all([
          fetch("/api/consultations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...clean, productId: bookId, locale, visit: visitForCheckout() }),
          }),
          loadRazorpayScript(),
        ]);
        data = (await response.json().catch(() => ({}))) as Answer;
        if (!response.ok || !data.bookingNo) throw new Error(data.error || "failed");
        if (data.razorpay) pending.current = { key, data };
      }
    } catch {
      setSending(false);
      setError(c.busy);
      return;
    }
    const finish = () => {
      trackPixel("Purchase", pixel, data.bookingId);
      pending.current = null;
      setSending(false);
      setDone({ bookingNo: data.bookingNo! });
      window.scrollTo({ top: 0 });
    };
    if (!data.razorpay) return finish(); // local development without Razorpay keys

    let failed = false;
    const checkout = openRazorpay({
      key: data.razorpay.keyId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      name: SITE.name,
      description: `${c.navLabel} · ${c.topics[clean.topic]}`.slice(0, 250),
      order_id: data.razorpay.orderId,
      prefill: data.razorpay.prefill,
      readonly: { contact: true },
      hidden: { email: true },
      theme: { color: "#0A2342" },
      handler: async (paid: RazorpaySuccess) => {
        await fetch("/api/consultations/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paid), keepalive: true }).catch(() => undefined);
        finish();
      },
      modal: {
        ondismiss: () => {
          setSending(false);
          setError(failed ? c.payFailed : c.payNotDone);
        },
      },
    });
    if (!checkout) {
      setSending(false);
      setError(c.busy);
      return;
    }
    checkout.on("payment.failed", () => {
      failed = true;
    });
  }

  if (done) {
    return (
      <div className="container-x py-8">
        <div className="font-deva mx-auto max-w-lg rounded-3xl border border-green-100 bg-white p-5 text-center shadow-sm sm:p-8">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-black text-brand-teal">{c.doneTitle}</h1>
          <p className="mt-2 text-sm text-brand-700">{c.doneText}</p>
          <p className="mt-4 inline-block rounded-xl bg-brand-50 px-4 py-2 text-sm">
            {c.bookingNo}: <strong className="font-mono text-brand-900">{done.bookingNo}</strong>
          </p>
          <div className="mt-5 rounded-2xl border border-brand-100 p-4 text-left text-sm text-brand-800">
            <p className="mb-1 text-xs font-bold text-brand-500">{c.summary}</p>
            <p className="font-bold text-brand-900">{c.topics[form.topic]}</p>
            <p className="mt-1">{form.date} · {c.slots[form.slot]} · {c.modes[form.mode]} · {c.languages[form.language]}</p>
            <p className="mt-1">{form.name} · {form.phone}</p>
          </div>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-bold text-white">{c.backHome}</Link>
        </div>
      </div>
    );
  }

  const input = "font-deva h-12 w-full rounded-xl border-2 bg-white px-3 text-base text-brand-900 outline-none transition placeholder:text-sm placeholder:text-brand-300 focus:border-brand-teal";
  const label = "font-deva mb-1 flex items-center gap-1 text-xs font-bold text-brand-800";
  const err = (f: ConsultField) => wrong(f) && <span role="alert" className="font-deva mt-1 block text-[11px] font-semibold text-danger-600">{c.errors[f]}</span>;
  const chip = (selected: boolean) =>
    `font-deva flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-center text-xs font-bold transition sm:text-sm ${selected ? "border-green-600 bg-green-50 text-green-800" : "border-brand-100 bg-white text-brand-700"}`;

  const payButton = (extra = "") => (
    <button type="submit" form="consult-form" disabled={sending} className={`font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3.5 text-base font-extrabold text-brand-teal shadow-lg transition hover:brightness-95 active:scale-[0.98] disabled:opacity-70 ${extra}`}>
      {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      {c.pay(CONSULT_PRICE)}
    </button>
  );

  const info = (
    <div className="space-y-5">
      <div className="rounded-3xl bg-brand-teal p-5 text-white sm:p-7">
        <h1 className="font-deva text-2xl font-black leading-tight sm:text-3xl">{c.heroTitle}</h1>
        <p className="font-deva mt-2 text-sm leading-relaxed text-white/85">{c.heroText}</p>
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-2xl bg-white/10 px-4 py-2">
          <span className="font-deva text-xs text-white/80">{c.priceLabel}</span>
          <span className="text-3xl font-black text-brand-gold">₹{CONSULT_PRICE}</span>
          <span className="font-deva text-xs text-white/80">{c.perSession}</span>
        </div>
        <ul className="font-deva mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
          {c.points.map((p) => (
            <li key={p} className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" /> {p}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        <h2 className="font-deva mb-3 text-sm font-extrabold text-brand-900">{c.stepsTitle}</h2>
        <ol className="font-deva grid gap-2 sm:grid-cols-3">
          {c.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-2 text-sm text-brand-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-teal text-xs font-bold text-white">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  const faq = (
    <div className="space-y-4">
      <div className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
        <h2 className="font-deva px-4 py-3 text-sm font-extrabold text-brand-900">{c.faqTitle}</h2>
        {c.faq.map((item) => (
          <details key={item.q} className="group px-4 py-3">
            <summary className="font-deva flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-800">
              {item.q} <ChevronDown className="h-4 w-4 shrink-0 text-brand-400 transition group-open:rotate-180" />
            </summary>
            <p className="font-deva mt-2 text-sm text-brand-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container-x py-5 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:gap-8">
        <div className="space-y-5">
          {info}
          <div className="hidden lg:block">{faq}</div>
        </div>

        <form id="consult-form" ref={formRef} onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-deva text-lg font-black text-brand-teal">{c.formTitle}</h2>
          {bookTitle && (
            <p className="font-deva flex items-start gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {c.fromBook(bookTitle)}
            </p>
          )}

          <label className="block">
            <span className={label}>{c.topic} <span className="text-danger-600">*</span></span>
            <select name="topic" value={form.topic} onChange={(e) => set("topic", e.target.value as Topic)} className={`${input} border-brand-100`}>
              {TOPICS.map((t) => <option key={t} value={t}>{c.topics[t]}</option>)}
            </select>
          </label>

          <label className="block">
            <span className={label}>{c.name} <span className="text-danger-600">*</span></span>
            <input name="name" value={form.name} autoComplete="name" placeholder={c.namePlaceholder} onChange={(e) => set("name", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} aria-invalid={!!wrong("name")} className={`${input} ${wrong("name") ? "border-danger-500" : "border-brand-100"}`} />
            {err("name")}
          </label>

          <label className="block">
            <span className={label}>{c.phone} <span className="text-danger-600">*</span></span>
            <div className={`flex h-12 items-center overflow-hidden rounded-xl border-2 bg-white focus-within:border-brand-teal ${wrong("phone") ? "border-danger-500" : "border-brand-100"}`}>
              <span className="border-r border-brand-100 px-3 text-base font-semibold text-brand-500">+91</span>
              <input name="phone" value={form.phone} inputMode="numeric" autoComplete="tel-national" placeholder={c.phonePlaceholder} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} aria-invalid={!!wrong("phone")} className="font-deva h-full min-w-0 flex-1 bg-transparent px-3 text-base text-brand-900 outline-none placeholder:text-sm placeholder:text-brand-300" />
            </div>
            {err("phone") || <span className="font-deva mt-1 block text-[11px] text-brand-500">{c.phoneHint}</span>}
          </label>

          <label className="block">
            <span className={label}>{c.district} <span className="text-danger-600">*</span></span>
            <input name="district" value={form.district} placeholder={c.districtPlaceholder} onChange={(e) => set("district", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, district: true }))} aria-invalid={!!wrong("district")} className={`${input} ${wrong("district") ? "border-danger-500" : "border-brand-100"}`} />
            {err("district")}
          </label>

          <label className="block">
            <span className={label}>{c.problem} <span className="text-danger-600">*</span></span>
            <textarea name="description" value={form.description} rows={4} placeholder={c.problemPlaceholder} onChange={(e) => set("description", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, description: true }))} aria-invalid={!!wrong("description")} className={`font-deva w-full rounded-xl border-2 bg-white px-3 py-2.5 text-base text-brand-900 outline-none placeholder:text-sm placeholder:text-brand-300 focus:border-brand-teal ${wrong("description") ? "border-danger-500" : "border-brand-100"}`} />
            {err("description") || <span className="font-deva mt-1 block text-[11px] text-brand-500">{c.problemHint(DESCRIPTION_MIN)}</span>}
          </label>

          <label className="block">
            <span className={label}>{c.day} <span className="text-danger-600">*</span></span>
            <input type="date" name="date" value={form.date} min={min} max={max} onChange={(e) => set("date", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, date: true }))} className={`${input} ${wrong("date") ? "border-danger-500" : "border-brand-100"}`} />
            {err("date")}
          </label>

          <fieldset>
            <legend className={label}>{c.slot}</legend>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => <button key={s} type="button" aria-pressed={form.slot === s} onClick={() => set("slot", s)} className={chip(form.slot === s)}>{c.slots[s]}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend className={label}>{c.mode}</legend>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => {
                const Icon = MODE_ICON[m];
                return <button key={m} type="button" aria-pressed={form.mode === m} onClick={() => set("mode", m)} className={chip(form.mode === m)}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {c.modes[m]}</button>;
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className={label}>{c.language}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["mr", "hi", "en"] as const).map((l) => <button key={l} type="button" aria-pressed={form.language === l} onClick={() => set("language", l)} className={chip(form.language === l)}>{c.languages[l]}</button>)}
            </div>
          </fieldset>

          <label className={`font-deva flex items-start gap-2 rounded-xl border-2 p-3 text-xs leading-relaxed text-brand-700 ${wrong("consent") ? "border-danger-500" : "border-brand-100"}`}>
            <input type="checkbox" name="consent" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-600" />
            <span>{c.consent}</span>
          </label>
          {err("consent")}

          {error && <p role="alert" className="font-deva rounded-xl border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm font-semibold text-danger-600">{error}</p>}
          <div className="hidden sm:block">{payButton()}</div>
          <p className="font-deva flex items-center justify-center gap-1 text-center text-[11px] text-brand-500"><ShieldCheck className="h-3.5 w-3.5 text-green-600" aria-hidden="true" /> {c.secure}</p>
        </form>

        <div className="lg:hidden">{faq}</div>
      </div>

      {/* phones: price + pay button pinned above the bottom menu */}
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-brand-100 bg-white/95 px-4 pb-2.5 pt-2 shadow-[0_-4px_16px_rgba(10,35,66,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <span className="shrink-0 text-xl font-extrabold text-green-600">₹{CONSULT_PRICE}</span>
          <div className="min-w-0 flex-1">{payButton("py-3 text-sm")}</div>
        </div>
      </div>
      <div className="h-24 sm:hidden" aria-hidden="true" />
    </div>
  );
}
