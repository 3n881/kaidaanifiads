"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Loader2, MessageCircle, Pencil, ShieldCheck, X } from "lucide-react";
import type { Product } from "@/data/catalog";
import { SITE } from "@/data/catalog";
import { saveOrder } from "@/lib/purchases";
import PriceTag from "./PriceTag";
import { UI_COPY, type Locale } from "@/lib/i18n";
import { editionLocaleFor, localizeProduct } from "@/lib/catalog";
import { useLanguage } from "./LanguageProvider";
import { pixelProduct, trackPixel } from "@/lib/meta-pixel";
import { trackVisit, visitForCheckout } from "@/lib/visit-tracking";
import { NOT_PAID_COPY } from "@/lib/lead-copy";
import { BUY_FORM_COPY } from "@/lib/buy-copy";
import { cleanBuyerName, cleanIndianMobile, loadSavedBuyer, saveBuyer } from "@/lib/buyer";

// details = our name + WhatsApp form (first, 2026-10-18) → processing (Razorpay opening / paying) → …
type Step = "details" | "processing" | "error" | "cancelled" | "failed";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  theme?: { color?: string };
  prefill?: { name?: string; contact?: string };
  readonly?: { contact?: boolean; email?: boolean; name?: boolean };
  hidden?: { contact?: boolean; email?: boolean };
  handler: (res: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface CheckoutData {
  testMode?: boolean;
  razorpayOrderId?: string;
  keyId?: string;
  amount?: number;
  currency?: string;
  orderId: string;
  accessToken: string;
  orderUrl: string;
  productTitle?: string;
  prefill?: { name: string; contact: string } | null;
  error?: string;
  field?: "name" | "phone" | "agree";
}

type RazorpayCtor = new (options: RazorpayOptions) => {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BuyButton({
  product,
  className = "",
  label,
  showIcon = true,
}: {
  product: Product;
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const { locale } = useLanguage();
  // The edition on sale can differ from the site language (Hindi-only book).
  const editionLocale = editionLocaleFor(product, locale);
  product = localizeProduct(product, locale);
  const copy = UI_COPY[locale];
  const [open, setOpen] = useState(false);
  // Bumping the key remounts the modal = a fresh checkout attempt.
  const [attempt, setAttempt] = useState(0);
  // After paying we go to the order page; pressing Back on a phone restores
  // this page from the back/forward cache exactly as it was left — with the
  // "Opening payment…" spinner still up and no way to close it. A restored
  // page closes the checkout window so Back shows the normal book page.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOpen(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Start fetching checkout.js on first touch/hover (before the click
        // completes) without making every visitor download it.
        onPointerEnter={() => void loadRazorpay()}
        onPointerDown={() => void loadRazorpay()}
        className={
          className ||
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        }
      >
        {showIcon && <Download className="h-4 w-4" aria-hidden="true" />}
        {label ?? copy.downloadPdf}
      </button>
      {open && (
        <BuyModal
          key={attempt}
          product={product}
          // The popup speaks the book's language, like the rest of the book page
          // (a Marathi book shows Marathi even when the site is set to Hindi).
          locale={editionLocale}
          editionLocale={editionLocale}
          onClose={() => setOpen(false)}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}
    </>
  );
}

function BuyModal({
  product,
  locale,
  editionLocale,
  onClose,
  onRetry,
}: {
  product: Product;
  locale: Locale;
  editionLocale: Locale;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  // Name + WhatsApp number (remembered on this device, src/lib/buyer.ts).
  // No tick box (client, 18 Oct): the notice above the pay button says continuing accepts it.
  const [buyer, setBuyer] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean; agree?: boolean }>({});
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [editing, setEditing] = useState(true);
  // Visible part of the screen (shrinks when the phone keyboard opens).
  const [view, setView] = useState<{ top: number; height: number; keyboard: boolean; narrow: boolean } | null>(null);
  // Set when Razorpay reports a failed attempt (bank/UPI declined). Razorpay
  // keeps its window open for a retry; when the buyer then closes it, we know
  // it was a failure (help screen), not a plain cancel (stay-in-touch box).
  const failedRef = useRef<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Fetch Razorpay's script while the buyer types.
    void loadRazorpay();
    const saved = loadSavedBuyer();
    // Read after mount (localStorage), so server and first client render match.
    const id = window.setTimeout(() => {
      if (saved.name || saved.phone) {
        // The agreement box is ticked by the buyer every time (owner, 18 Oct).
        setBuyer((current) => ({ ...current, name: saved.name, phone: saved.phone }));
        // A returning buyer with both details sees a one-tap summary.
        if (saved.name && saved.phone) setEditing(false);
      }
    }, 0);
    // Same moment as before (Buy tapped), so Meta's funnel stays comparable.
    trackPixel("InitiateCheckout", pixelProduct({ id: product.id, title: product.title, price: product.price }));
    trackVisit("buy_tap", product.id);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [product.id, product.price, product.title]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Never taller than the window (some browsers resize the window without a visualViewport event).
      const height = Math.min(vv.height, window.innerHeight);
      // narrow = phone layout (< 640 px, Tailwind "sm"); computers never cap the card's height.
      setView({ top: vv.offsetTop, height, keyboard: window.innerHeight - vv.height > 150, narrow: window.innerWidth < 640 });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const fail = useCallback((message: string) => {
    setError(message);
    setStep("error");
  }, []);

  const beginCheckout = useCallback(
    async (details: { name: string; phone: string }) => {
      if (started.current) return;
      started.current = true;
      setStep("processing");
      const pixelParams = pixelProduct({ id: product.id, title: product.title, price: product.price });
      // Admin funnel: details accepted (sent now — Razorpay may cover the page next).
      trackVisit("details", product.id, true);
      try {
        const checkoutRequest = fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: product.slug,
            locale: editionLocale,
            name: details.name,
            phone: details.phone,
            // Continuing = accepting the notice above the button (Terms, Privacy,
            // WhatsApp book/order messages and offers, STOP any time) — client's choice.
            offersConsent: true,
            agreed: true,
            consentLocale: locale,
            form: 2, // popup with the required agreement box (server checks it)
            // Which visit / campaign this sale belongs to (admin analytics; no personal data).
            visit: visitForCheckout(),
          }),
        });

        const [response, scriptReady] = await Promise.all([
          checkoutRequest,
          loadRazorpay(),
        ]);
        const data = (await response.json()) as CheckoutData;
        if (!response.ok) {
          // The server re-checks the details; send the buyer back to the field.
          if (data.error === "details") {
            started.current = false;
            setEditing(true);
            setErrors({ [data.field === "name" ? "name" : data.field === "agree" ? "agree" : "phone"]: true });
            setStep("details");
            return;
          }
          return fail(data.error || "Checkout could not be started.");
        }

        // Remember the order on this device before payment starts, so a
        // buyer whose browser closes mid-payment can still find it later.
        saveOrder({
          orderId: data.orderId,
          token: data.accessToken,
          title: data.productTitle ?? product.title,
          locale,
        });

        if (data.testMode) {
          window.location.assign(data.orderUrl);
          return;
        }

        if (!scriptReady || !window.Razorpay) {
          return fail("Payment window could not be loaded. Please try again.");
        }

        const razorpay = new window.Razorpay({
          key: data.keyId ?? "",
          amount: data.amount ?? product.price * 100,
          currency: data.currency || "INR",
          name: SITE.name,
          description: data.productTitle,
          order_id: data.razorpayOrderId ?? "",
          theme: { color: "#0A2342" },
          // Number from our popup: filled in and locked, so Razorpay doesn't
          // ask again. No e-mail needed (Razorpay's e-mail field hidden).
          ...(data.prefill
            ? { prefill: data.prefill, readonly: { contact: true }, hidden: { email: true } }
            : {}),
          handler: async (payment: RazorpayResponse) => {
            setStep("processing");
            // Sent from the book page, before redirecting: the order page URL
            // holds the access token and never loads the pixel. eventID =
            // our order id, so a later server-side event can de-duplicate.
            trackPixel(
              "Purchase",
              { ...pixelParams, value: (data.amount ?? product.price * 100) / 100 },
              data.orderId,
            );
            try {
              const confirmation = await fetch("/api/checkout/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderId, ...payment }),
              });
              const result = (await confirmation.json()) as { orderUrl?: string; error?: string };
              // Even if confirmation failed, the order page waits for the
              // webhook and shows the download as soon as payment lands.
              if (!confirmation.ok) {
                console.error("Payment confirmation failed", result.error);
              }
              window.location.assign(result.orderUrl || data.orderUrl);
            } catch {
              window.location.assign(data.orderUrl);
            }
          },
          modal: {
            ondismiss: () => {
              // Admin drop-off numbers only (closed the window vs left); fire and forget.
              void fetch("/api/orders/closed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderId, token: data.accessToken }),
                keepalive: true,
              }).catch(() => undefined);
              setStep(failedRef.current ? "failed" : "cancelled");
            },
          },
        });
        razorpay.on("payment.failed", (response) => {
          failedRef.current = response?.error?.description || "failed";
        });
        razorpay.open();
        trackVisit("razorpay_open", product.id, true);
      } catch {
        fail(UI_COPY[locale].checkoutFailed);
      }
    },
    [fail, locale, editionLocale, product.id, product.price, product.slug, product.title],
  );

  const copy = UI_COPY[locale];
  const notPaid = NOT_PAID_COPY[locale];
  const form = BUY_FORM_COPY[locale];

  const nameOk = Boolean(cleanBuyerName(buyer.name));
  const phoneOk = Boolean(cleanIndianMobile(buyer.phone));
  // Errors show once a field was left (or on Continue), never while typing the first time.
  const showName = errors.name || (touched.name && !nameOk);
  const showPhone = errors.phone || (touched.phone && !phoneOk);
  // Keyboard open: shorter header, no extra lines, so fields + pay button fit above it.
  const compact = step === "details" && Boolean(view?.keyboard);

  const keepInView = (event: React.FocusEvent<HTMLElement>) => {
    const target = event.currentTarget;
    // After the keyboard has opened (visual viewport resized), keep the field visible.
    window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  };

  const submitDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = cleanBuyerName(buyer.name);
    const phone = cleanIndianMobile(buyer.phone);
    const next = { name: !name, phone: !phone };
    setErrors(next);
    setTouched({ name: true, phone: true });
    if (next.name || next.phone) {
      setEditing(true);
      // Move to the first wrong field (the buyer pressed Continue, so the keyboard may open).
      window.setTimeout(() => document.getElementById(next.name ? "buyer-name" : "buyer-phone")?.focus(), 0);
      return;
    }
    saveBuyer(name, phone);
    void beginCheckout({ name, phone });
  };

  return createPortal(
    <div
      // Phones: bottom sheet that scrolls inside itself (keyboard). Computers: a
      // card with no inner scrollbar; only a very short window scrolls the backdrop.
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-start sm:overflow-y-auto sm:p-4 sm:py-8"
      // Follow the visible part of the screen: with the phone keyboard open the
      // popup sits right above it instead of hiding behind it (Android + iPhone).
      style={view ? { top: view.top, height: view.height, bottom: "auto" } : undefined}
      onClick={step === "processing" ? undefined : onClose}
    >
      <div
        className="no-scrollbar max-h-[92dvh] w-full max-w-md animate-fade-in-up overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pt-5 shadow-2xl sm:my-auto sm:max-h-none sm:overflow-visible sm:rounded-2xl"
        style={view?.narrow ? { maxHeight: Math.max(view.height - (view.keyboard ? 4 : 24), 260) } : undefined}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        <div className={`flex items-start justify-between gap-3 ${compact ? "mb-2" : "mb-4"}`}>
          <div className="min-w-0">
            <h3
              id="checkout-title"
              className={`font-deva font-bold text-brand-900 ${compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-base"}`}
            >
              {product.title}
            </h3>
            {!compact && (
              <div className="mt-1">
                <PriceTag product={product} />
              </div>
            )}
          </div>
          {step !== "processing" && (
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="shrink-0 rounded-full p-1 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {step === "details" && (
          <form onSubmit={submitDetails} noValidate>
            <div className={compact ? "space-y-3" : "space-y-4"}>
              {!compact && <p className="font-deva -mt-1 text-sm font-semibold text-brand-700">{form.heading}</p>}

              {!editing ? (
                // Returning buyer: details from last time, one tap to pay.
                <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-deva truncate text-sm font-bold text-brand-900">{buyer.name}</p>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800">
                      <WhatsAppGlyph className="h-4 w-4 shrink-0" /> +91 {buyer.phone.replace(/^(\d{5})(\d{5})$/, "$1 $2")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-deva inline-flex shrink-0 items-center gap-1 rounded-lg border border-green-300 bg-white px-2.5 py-1.5 text-xs font-bold text-green-800"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> {form.edit}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="buyer-name" className="font-deva mb-1.5 block text-sm font-bold text-brand-900">
                      {form.name} <span className="text-danger-600" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="buyer-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        required
                        maxLength={60}
                        value={buyer.name}
                        onFocus={keepInView}
                        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                        onChange={(e) => {
                          setBuyer({ ...buyer, name: e.target.value });
                          if (errors.name) setErrors((er) => ({ ...er, name: false }));
                        }}
                        onKeyDown={(e) => {
                          // Keyboard "Next" → WhatsApp number.
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById("buyer-phone")?.focus();
                          }
                        }}
                        placeholder={form.namePlaceholder}
                        aria-invalid={showName}
                        aria-describedby={showName ? "buyer-name-error" : undefined}
                        className={`font-deva h-12 w-full rounded-xl border bg-white pl-4 pr-10 text-base text-brand-900 outline-none placeholder:text-brand-300 focus:ring-2 ${
                          showName ? "border-danger-500 focus:ring-danger-500/20" : "border-brand-200 focus:border-brand-teal focus:ring-brand-teal/15"
                        }`}
                      />
                      {nameOk && <Check className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-600" aria-hidden="true" />}
                    </div>
                    {showName && (
                      <p id="buyer-name-error" role="alert" className="font-deva mt-1 text-xs font-semibold text-danger-600">{form.badName}</p>
                    )}
                  </div>

                  {/* WhatsApp number — highlighted: the PDF is sent here */}
                  <div className="rounded-2xl border-2 border-green-500/70 bg-green-50/70 p-3">
                    <label htmlFor="buyer-phone" className="font-deva mb-1.5 flex items-center gap-1.5 text-sm font-bold text-green-800">
                      <WhatsAppGlyph className="h-4 w-4" /> {form.whatsapp} <span className="text-danger-600" aria-hidden="true">*</span>
                    </label>
                    <div
                      className={`flex h-12 items-center overflow-hidden rounded-xl border bg-white focus-within:ring-2 ${
                        showPhone ? "border-danger-500 focus-within:ring-danger-500/20" : "border-green-300 focus-within:border-green-600 focus-within:ring-green-600/15"
                      }`}
                    >
                      <span className="flex h-full items-center border-r border-green-200 bg-green-50 px-3 text-base font-bold text-green-800" aria-hidden="true">
                        +91
                      </span>
                      <input
                        id="buyer-phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        enterKeyHint="go"
                        required
                        maxLength={14}
                        value={buyer.phone}
                        onFocus={keepInView}
                        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                        onChange={(e) => {
                          setBuyer({ ...buyer, phone: e.target.value.replace(/[^\d\s+-]/g, "") });
                          if (errors.phone) setErrors((er) => ({ ...er, phone: false }));
                        }}
                        placeholder={form.phonePlaceholder}
                        aria-invalid={showPhone}
                        aria-describedby={showPhone ? "buyer-phone-error" : "buyer-phone-hint"}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-lg font-semibold tracking-wide text-brand-900 outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-brand-300"
                      />
                      {phoneOk && <Check className="mr-3 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />}
                    </div>
                    {showPhone ? (
                      <p id="buyer-phone-error" role="alert" className="font-deva mt-1.5 text-xs font-semibold text-danger-600">{form.badPhone}</p>
                    ) : (
                      <p id="buyer-phone-hint" className="font-deva mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-green-800">
                        <span aria-hidden="true">📲</span> {form.whatsappHint}
                      </p>
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Pinned to the bottom of the popup: the Terms notice + pay button stay visible while typing */}
            <div className="sticky bottom-0 -mx-5 mt-3 border-t border-brand-100 bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_16px_-12px_rgba(10,35,66,0.25)] sm:pb-5">
              {/* One small grey line, nothing highlighted (client): Terms / Privacy links + offers note. */}
              <p className="font-deva mb-2 text-center text-[10px] leading-snug text-brand-400">
                {form.agree[0]}
                <a href="/terms" target="_blank" rel="noopener" className="underline decoration-brand-200 underline-offset-2">
                  {form.agree[1]}
                </a>
                {form.agree[2]}
                <a href="/privacy-policy" target="_blank" rel="noopener" className="underline decoration-brand-200 underline-offset-2">
                  {form.agree[3]}
                </a>
                {form.agree[4]}
              </p>
              <button
                type="submit"
                className="font-deva flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 text-base font-extrabold text-brand-teal shadow-[var(--shadow-gold)] transition hover:brightness-95 active:scale-[0.98]"
              >
                {form.pay(product.price)}
              </button>
              {!compact && (
                <p className="font-deva mt-2 flex items-start justify-center gap-1 text-center text-[11px] leading-snug text-brand-400">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {form.privacy}
                </p>
              )}
            </div>
          </form>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2
              className="h-8 w-8 animate-spin text-brand-teal"
              aria-hidden="true"
            />
            <p className="font-deva text-sm font-semibold text-brand-700">
              {copy.openingPayment}
            </p>
            <p className="font-deva text-xs text-brand-500">
              {copy.noAccount}
            </p>
          </div>
        )}

        {step === "cancelled" && (
          <div className="flex flex-col gap-3 py-2 text-center">
            <p className="font-deva text-base font-bold text-brand-900">{notPaid.cancelledTitle}</p>
            <p className="font-deva -mt-2 text-xs text-brand-500">{notPaid.cancelledBody}</p>
            <button type="button" onClick={onRetry} className="font-deva w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white hover:bg-brand-teal/90">
              {copy.retry}
            </button>
            <button type="button" onClick={onClose} className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              {copy.close}
            </button>
          </div>
        )}

        {step === "failed" && (
          <div className="flex flex-col gap-3 py-2 text-center">
            <X className="mx-auto h-10 w-10 rounded-full bg-danger-500/10 p-2 text-danger-600" aria-hidden="true" />
            <p className="font-deva text-base font-bold text-brand-900">{notPaid.failedTitle}</p>
            <p className="font-deva rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">{notPaid.failedSafe}</p>
            <p className="font-deva text-xs text-brand-600">{notPaid.failedTip}</p>
            <button type="button" onClick={onRetry} className="font-deva w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white hover:bg-brand-teal/90">
              {copy.retry}
            </button>
            <a
              href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Payment failed — ${product.title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-deva inline-flex items-center justify-center gap-1.5 rounded-xl border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> {notPaid.help}
            </a>
            <button type="button" onClick={onClose} className="text-xs font-semibold text-brand-500 hover:underline">
              {copy.close}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <X
              className="h-10 w-10 rounded-full bg-danger-500/10 p-2 text-danger-600"
              aria-hidden="true"
            />
            <p className="font-deva text-sm font-semibold text-brand-900">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="font-deva mt-1 w-full rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-teal/90"
            >
              {copy.retry}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              {copy.close}
            </button>
          </div>
        )}

        {step !== "details" && (
          <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-brand-100 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 text-center text-[10px] leading-relaxed text-brand-400 sm:pb-5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Secure Razorpay payment · No account required
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** WhatsApp mark (lucide has none). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.39 9.39 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42a9.36 9.36 0 0 1 6.66 2.76 9.36 9.36 0 0 1 2.76 6.67c0 5.19-4.23 9.42-9.43 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.51 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8.01" />
    </svg>
  );
}
