"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, MessageCircle, Send } from "lucide-react";
import { SITE } from "@/data/catalog";
import { getSavedOrders, orderHref, type SavedOrder } from "@/lib/purchases";
import { sendMyBooks } from "./actions";

const EMPTY: SavedOrder[] = [];
let cachedRaw: string | null = null;
let cachedList: SavedOrder[] = EMPTY;

function readSaved(): SavedOrder[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("kaf-orders");
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = getSavedOrders();
  }
  return cachedList;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function MyBooksPage() {
  const saved = useSyncExternalStore(subscribe, readSaved, () => EMPTY);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा.");
      return;
    }
    startTransition(async () => {
      const res = await sendMyBooks(phone);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSent(true);
    });
  };

  return (
    <div className="container-x max-w-2xl py-12">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/5 text-brand-teal">
          <BookOpen className="h-7 w-7" />
        </span>
        <h1 className="font-deva mt-4 text-3xl font-extrabold text-brand-900">
          माझी पुस्तके
        </h1>
        <p className="font-deva mt-2 text-brand-500">
          खरेदी केलेली पुस्तके पुन्हा डाउनलोड करा — account ची गरज नाही.
        </p>
      </div>

      {saved.length > 0 && (
        <section className="mx-auto mt-8 max-w-md">
          <h2 className="font-deva mb-3 text-sm font-bold text-brand-700">
            या फोनवरील खरेदी
          </h2>
          <ul className="space-y-2">
            {saved.map((o) => (
              <li key={o.orderId}>
                <Link
                  href={orderHref(o)}
                  className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] hover:bg-brand-50/50"
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-brand-teal" />
                  <span className="min-w-0 flex-1">
                    <span className="font-deva block truncate text-sm font-bold text-brand-900">
                      {o.title}
                    </span>
                    <span className="text-xs text-brand-400">
                      {new Date(o.savedAt).toLocaleDateString("en-IN")}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto mt-10 max-w-md">
        <h2 className="font-deva text-sm font-bold text-brand-700">
          दुसऱ्या फोनवर खरेदी केली? लिंक WhatsApp वर मिळवा
        </h2>
        <p className="font-deva mt-1 text-xs text-brand-500">
          पेमेंट करताना किंवा नंतर दिलेला नंबर टाका. डाउनलोड लिंक त्याच WhatsApp नंबरवर पाठवली जाईल.
        </p>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center rounded-xl border border-brand-200 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
            <span className="px-3 text-sm text-brand-500">+91</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="१० अंकी व्हॉट्सॲप नंबर"
              className="font-deva w-full bg-transparent py-3 pr-3 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="font-deva inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-5 py-3 text-sm font-bold text-white hover:bg-brand-teal/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {pending ? "पाठवत आहे…" : "पाठवा"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center text-sm font-medium text-danger-600">{error}</p>
        )}
        {sent && (
          <p className="font-deva mt-4 rounded-2xl bg-green-50 p-4 text-center text-sm text-green-700">
            या नंबरवर खरेदी असल्यास, डाउनलोड लिंक काही मिनिटांत WhatsApp वर येईल.
          </p>
        )}

        <a
          href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
          className="font-deva mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
        >
          <MessageCircle className="h-4 w-4" /> मदतीसाठी WhatsApp करा
        </a>
      </section>
    </div>
  );
}
