"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, ShieldCheck, X } from "lucide-react";
import type { Product } from "@/data/catalog";
import { SITE } from "@/data/catalog";
import { saveOrder } from "@/lib/purchases";
import PriceTag from "./PriceTag";

type Step = "processing" | "error";

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
  error?: string;
}

type RazorpayCtor = new (options: RazorpayOptions) => { open: () => void };

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
  label = "Download / PDF डाऊनलोड करा",
}: {
  product: Product;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  // Bumping the key remounts the modal = a fresh checkout attempt.
  const [attempt, setAttempt] = useState(0);
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
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <BuyModal
          key={attempt}
          product={product}
          onClose={() => setOpen(false)}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}
    </>
  );
}

function BuyModal({
  product,
  onClose,
  onRetry,
}: {
  product: Product;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [step, setStep] = useState<Step>("processing");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fail = useCallback((message: string) => {
    setError(message);
    setStep("error");
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const beginCheckout = async () => {
      try {
        const checkoutRequest = fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: product.slug }),
        });

        const [response, scriptReady] = await Promise.all([
          checkoutRequest,
          loadRazorpay(),
        ]);
        const data = (await response.json()) as CheckoutData;
        if (!response.ok) {
          return fail(data.error || "Checkout could not be started.");
        }

        // Remember the order on this device before payment starts, so a
        // buyer whose browser closes mid-payment can still find it later.
        saveOrder({
          orderId: data.orderId,
          token: data.accessToken,
          title: data.productTitle ?? product.title,
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
          handler: async (payment: RazorpayResponse) => {
            setStep("processing");
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
            ondismiss: () => fail("Payment was cancelled. You can try again."),
          },
        });
        razorpay.open();
      } catch {
        fail("Checkout could not be started. Please check your connection.");
      }
    };

    void beginCheckout();
  }, [fail, product.price, product.slug, product.title]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={step === "processing" ? undefined : onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3
              id="checkout-title"
              className="font-deva line-clamp-2 text-base font-bold text-brand-900"
            >
              {product.title}
            </h3>
            <div className="mt-1">
              <PriceTag product={product} />
            </div>
          </div>
          {step !== "processing" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="बंद करा"
              className="rounded-full p-1 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2
              className="h-8 w-8 animate-spin text-brand-teal"
              aria-hidden="true"
            />
            <p className="font-deva text-sm font-semibold text-brand-700">
              सुरक्षित पेमेंट उघडत आहे…
            </p>
            <p className="font-deva text-xs text-brand-500">
              Account, नाव किंवा मोबाईल नंबरची गरज नाही.
            </p>
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
              पुन्हा प्रयत्न करा / Try again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              बंद करा
            </button>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-brand-100 pt-3 text-center text-[10px] leading-relaxed text-brand-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Secure Razorpay payment · No account required
        </p>
      </div>
    </div>,
    document.body,
  );
}
