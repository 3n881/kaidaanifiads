"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Download,
  Loader2,
  MessageCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Product } from "@/data/catalog";
import { SITE } from "@/data/catalog";
import PriceTag from "./PriceTag";

type Step = "processing" | "done" | "error";
type ContactState = "idle" | "sending" | "sent" | "error";

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
  productTitle?: string;
  downloadUrl?: string | null;
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

function attemptDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        }
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      {open && <BuyModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

function BuyModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("processing");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactState, setContactState] = useState<ContactState>("idle");
  const [contactMessage, setContactMessage] = useState("");
  const started = useRef(false);
  const downloadAttempted = useRef(false);

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

        setOrderId(data.orderId);
        setAccessToken(data.accessToken);

        if (data.testMode) {
          setDownloadUrl(data.downloadUrl ?? null);
          setStep("done");
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
            const pendingTab = window.open("about:blank", "_blank");
            try {
              const confirmation = await fetch("/api/checkout/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderId, ...payment }),
              });
              const result = (await confirmation.json()) as CheckoutData;
              if (!confirmation.ok) {
                pendingTab?.close();
                return fail(result.error || "Payment verification failed.");
              }

              const url = result.downloadUrl ?? null;
              setAccessToken(result.accessToken || data.accessToken);
              setDownloadUrl(url);
              setStep("done");
              if (url && pendingTab) {
                pendingTab.location.href = url;
                downloadAttempted.current = true;
              } else {
                pendingTab?.close();
              }
            } catch {
              pendingTab?.close();
              fail("Payment was received, but confirmation could not be loaded.");
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
  }, [fail, product.price, product.slug]);

  useEffect(() => {
    if (
      step === "done" &&
      downloadUrl &&
      !downloadAttempted.current
    ) {
      downloadAttempted.current = true;
      attemptDownload(downloadUrl);
    }
  }, [downloadUrl, step]);

  const saveWhatsApp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setContactState("error");
      setContactMessage("कृपया वैध १० अंकी WhatsApp नंबर भरा.");
      return;
    }

    setContactState("sending");
    setContactMessage("");
    try {
      const response = await fetch("/api/orders/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, accessToken, name, whatsapp: phone }),
      });
      const result = (await response.json()) as {
        error?: string;
        delivered?: boolean;
      };
      if (!response.ok) {
        setContactState("error");
        setContactMessage(result.error || "Number could not be saved.");
        return;
      }
      setContactState("sent");
      setContactMessage(
        result.delivered
          ? "PDF लिंक WhatsApp वर पाठवली आहे."
          : "नंबर सेव्ह झाला. हे पुस्तक आता My Books मध्येही दिसेल.",
      );
    } catch {
      setContactState("error");
      setContactMessage("Number could not be saved. Please try again.");
    }
  };

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

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-3 text-center">
            <CheckCircle2
              className="h-12 w-12 text-brand-teal"
              aria-hidden="true"
            />
            <p className="font-deva text-base font-bold text-brand-900">
              पेमेंट यशस्वी झाले!
            </p>
            <p className="font-deva text-sm text-brand-600">
              तुमचे डाउनलोड सुरू झाले आहे. न झाल्यास खालील बटन दाबा.
            </p>

            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white hover:bg-brand-teal/90"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> PDF डाऊनलोड करा
              </a>
            ) : (
              <p className="font-deva rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                पेमेंट मिळाले आहे. डाउनलोड लिंकसाठी सपोर्टशी संपर्क करा.
              </p>
            )}

            {contactState !== "sent" ? (
              <form
                onSubmit={saveWhatsApp}
                className="mt-2 w-full rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-left"
              >
                <div className="mb-2 flex items-start gap-2">
                  <MessageCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-deva text-xs font-bold text-brand-800">
                      WhatsApp वर लिंक हवी आहे? (Optional)
                    </p>
                    <p className="font-deva text-[11px] text-brand-500">
                      नंबर दिल्यास WhatsApp delivery आणि My Books access मिळेल.
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
                    onChange={(event) =>
                      setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    enterKeyHint="send"
                    aria-label="WhatsApp number"
                    placeholder="10 अंकी WhatsApp नंबर"
                    className="w-full rounded-r-lg bg-transparent py-2 pr-3 text-sm outline-none"
                  />
                </div>
                {contactMessage && (
                  <p
                    className={`mt-2 text-[11px] ${
                      contactState === "error" ? "text-danger-600" : "text-brand-600"
                    }`}
                  >
                    {contactMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={contactState === "sending"}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
                >
                  {contactState === "sending" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  )}
                  WhatsApp वर पाठवा
                </button>
              </form>
            ) : (
              <p className="font-deva mt-2 w-full rounded-xl bg-green-50 px-3 py-3 text-xs font-semibold text-green-700">
                {contactMessage}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              पूर्ण झाले
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
              onClick={onClose}
              className="mt-1 w-full rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-teal/90"
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
