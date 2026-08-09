"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Loader2, Download, MessageCircle } from "lucide-react";
import type { Product } from "@/data/catalog";
import { SITE } from "@/data/catalog";
import PriceTag from "./PriceTag";

type Step = "form" | "processing" | "done" | "error";

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
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: (res: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
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
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
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
        <Download className="h-4 w-4" />
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
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fail = (msg: string) => {
    setError(msg);
    setStep("error");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("कृपया तुमचे नाव भरा.");
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return setError("कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा.");

    setStep("processing");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: product.slug, name, whatsapp: phone }),
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error || "काहीतरी चूक झाली.");

      // Test mode (no Razorpay keys) — order recorded + delivered.
      if (data.testMode || data.demo) {
        setDownloadUrl(data.downloadUrl ?? null);
        return setStep("done");
      }

      // Live: open Razorpay checkout.
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay)
        return fail("पेमेंट विंडो लोड होऊ शकली नाही.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: SITE.name,
        description: data.productTitle,
        order_id: data.razorpayOrderId,
        prefill: { name, contact: phone },
        theme: { color: "#0A2342" },
        handler: async (r: RazorpayResponse) => {
          setStep("processing");
          try {
            const c = await fetch("/api/checkout/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId, ...r }),
            });
            const cd = await c.json();
            if (!c.ok) return fail(cd.error || "पेमेंट पडताळणी अयशस्वी.");
            setDownloadUrl(cd.downloadUrl ?? null);
            setStep("done");
          } catch {
            fail("पेमेंट पडताळणीत अडचण आली.");
          }
        },
        modal: { ondismiss: () => setStep("form") },
      });
      rzp.open();
    } catch {
      fail("नेटवर्क अडचण. पुन्हा प्रयत्न करा.");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-deva text-base font-bold text-brand-900 line-clamp-2">
              {product.title}
            </h3>
            <div className="mt-1">
              <PriceTag product={product} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="बंद करा"
            className="rounded-full p-1 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "form" && (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-700">
                तुमचे नाव / Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. राजेश पाटील"
                className="w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-700">
                व्हॉट्सॲप नंबर / WhatsApp Number
              </label>
              <div className="flex items-center rounded-xl border border-brand-200 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
                <span className="px-3 text-sm text-brand-500">+91</span>
                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  inputMode="numeric"
                  placeholder="10 अंकी नंबर"
                  className="w-full rounded-r-xl bg-transparent py-2.5 pr-3 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-brand-400">
                याच नंबरवर तुम्हाला ई-बुकची PDF लिंक मिळेल.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-danger-500/10 px-3 py-2 text-xs font-medium text-danger-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90 active:scale-[0.98]"
            >
              सुरक्षित पेमेंट — ₹{product.price} भरा
            </button>
            <p className="text-center text-[11px] text-brand-400">
              Google Pay / PhonePe / Paytm / UPI / Card
            </p>
          </form>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
            <p className="text-sm font-medium text-brand-700">
              प्रक्रिया सुरू आहे…
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-brand-teal" />
            <p className="text-base font-bold text-brand-900">
              धन्यवाद, {name.split(" ")[0]}!
            </p>
            <p className="font-deva text-sm text-brand-600">
              तुमची ऑर्डर यशस्वी झाली. डाउनलोड लिंक तुमच्या व्हॉट्सॲप नंबरवर
              (+91 {phone}) पाठवली आहे.
            </p>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white hover:bg-brand-teal/90"
              >
                <Download className="h-4 w-4" /> PDF डाउनलोड करा
              </a>
            ) : (
              <p className="font-deva rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                या पुस्तकाची PDF अजून अपलोड झालेली नाही — आमची टीम लवकरच पाठवेल.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-1 w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              बंद करा
            </button>
            <a
              href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-teal"
            >
              <MessageCircle className="h-3.5 w-3.5" /> मदत हवी आहे?{" "}
              {SITE.supportPhone}
            </a>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <X className="h-10 w-10 rounded-full bg-danger-500/10 p-2 text-danger-600" />
            <p className="font-deva text-sm font-semibold text-brand-900">
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setStep("form");
              }}
              className="mt-1 w-full rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-teal/90"
            >
              पुन्हा प्रयत्न करा
            </button>
          </div>
        )}

        <p className="mt-4 border-t border-brand-100 pt-3 text-center text-[10px] leading-relaxed text-brand-400">
          केवळ शैक्षणिक व माहितीच्या उद्देशाने. हा कायदेशीर सल्ला नाही.
        </p>
      </div>
    </div>,
    document.body,
  );
}
