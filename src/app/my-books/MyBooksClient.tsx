"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, HelpCircle, MessageCircle, Phone, Send, Zap } from "lucide-react";
import { SITE, type Product } from "@/data/catalog";
import CoverImage from "@/components/CoverImage";
import { getSavedOrders, orderHref, type SavedOrder } from "@/lib/purchases";
import { sendMyBooks } from "./actions";

const digits = (phone: string) => phone.replace(/\D/g, "");

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

export default function MyBooksClient({ combos }: { combos: Product[] }) {
  const saved = useSyncExternalStore(subscribe, readSaved, () => EMPTY);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showHelp, setShowHelp] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      {/* App-style title bar (as on the original site) */}
      <div className="flex items-center gap-3 border-b bg-white/90 px-4 py-2 backdrop-blur-md">
        <Link href="/" aria-label="मुख्यपृष्ठ" className="rounded-full p-1.5 transition-colors hover:bg-gray-100 active:scale-95">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-deva text-sm font-black leading-none tracking-tight text-gray-800">माझी पुस्तके</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">My Digital Bookshelf</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-4">
        <div className="mb-4 space-y-3">
          {/* Send my books to WhatsApp */}
          <div className="rounded-2xl border border-gray-100/50 bg-white p-3 shadow-sm">
            <p className="font-deva mb-2 px-1 text-xs font-semibold text-gray-600">
              दुसऱ्या फोनवर खरेदी केली? पेमेंट करताना दिलेला नंबर टाका — पुस्तक PDF त्याच WhatsApp नंबरवर पाठवले जाईल.
            </p>
            <form onSubmit={submit} className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:border-brand-teal focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-teal/20">
                <span className="pl-3 pr-1 text-sm text-gray-500">+91</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="WhatsApp नंबर टाका…"
                  aria-label="WhatsApp नंबर"
                  className="font-deva h-11 w-full min-w-0 bg-transparent pr-3 text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="font-deva inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-teal px-4 text-sm font-bold text-white hover:bg-brand-teal/90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> {pending ? "पाठवत आहे…" : "पाठवा"}
              </button>
            </form>
            {error && <p className="mt-2 text-center text-sm font-medium text-danger-600">{error}</p>}
            {sent && (
              <p className="font-deva mt-3 rounded-xl bg-green-50 p-3 text-center text-sm text-green-700">
                या नंबरवर खरेदी असल्यास, पुस्तक PDF स्वरूपात काही मिनिटांत WhatsApp वर येईल.
              </p>
            )}
          </div>

          {/* quick help links */}
          <div className="flex items-center justify-between px-1">
            <a
              href={`tel:+${digits(SITE.contactPhone)}`}
              className="font-deva flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-brand-teal transition-all hover:bg-teal-50 active:scale-95"
            >
              <Phone className="h-3.5 w-3.5" /> कॉल करा
            </a>
            <a
              href={`https://wa.me/${digits(SITE.supportPhone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-deva flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-green-600 transition-all hover:bg-green-50 active:scale-95"
            >
              <MessageCircle className="h-3.5 w-3.5" /> मदत हवी?
            </a>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              className="font-deva flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-500 transition-all hover:bg-gray-100 active:scale-95"
            >
              <HelpCircle className="h-3.5 w-3.5" /> PDF कुठे मिळेल?
            </button>
          </div>
          {showHelp && (
            <p className="font-deva rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
              पेमेंट झाल्यावर PDF लगेच डाउनलोड होते आणि पेमेंट करताना दिलेल्या नंबरवर WhatsApp वरही पाठवली जाते.
              याच फोनवरील खरेदी खाली दिसते — तिथून पुन्हा डाउनलोड करा. फोन बदलला असल्यास वर नंबर टाकून पुस्तक
              WhatsApp वर मागवा.
            </p>
          )}
        </div>

        {/* purchases saved on this phone */}
        <div className="space-y-3">
          {saved.length > 0 ? (
            <>
              <h2 className="font-deva px-1 text-xs font-black uppercase tracking-wide text-gray-400">या फोनवरील खरेदी</h2>
              <ul className="space-y-2">
                {saved.map((o) => (
                  <li key={o.orderId}>
                    <Link
                      href={orderHref(o)}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:bg-gray-50"
                    >
                      <BookOpen className="h-5 w-5 shrink-0 text-brand-teal" />
                      <span className="min-w-0 flex-1">
                        <span className="font-deva block truncate text-sm font-bold text-gray-900">{o.title}</span>
                        <span className="text-xs text-gray-400">{new Date(o.savedAt).toLocaleDateString("en-IN")}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <span className="mb-3 rounded-full bg-gray-100 p-4">
                <BookOpen className="h-8 w-8" />
              </span>
              <p className="font-deva text-sm font-bold text-gray-500">या फोनवर अजून कोणतीही खरेदी नाही</p>
              <p className="font-deva mt-1 text-xs text-gray-400">दुसऱ्या फोनवर खरेदी केली असल्यास वर नंबर टाका</p>
            </div>
          )}
        </div>

        {/* combos upsell */}
        {combos.length > 0 && (
          <div className="mb-2 mt-6">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              <h2 className="font-deva text-xs font-black uppercase tracking-wide text-gray-400">तुमच्यासाठी खास कॉम्बोस</h2>
            </div>
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <p className="flex items-center gap-1.5 text-lg font-black text-gray-900">
                  <Zap className="h-5 w-5 fill-amber-400 text-amber-400" /> Best Value Combos
                </p>
                <p className="font-deva text-[11px] text-gray-400">कायदेशीर कॉम्बो पॅक्स</p>
              </div>
              <Link href="/combos" className="flex items-center gap-0.5 text-xs font-bold text-gray-900 hover:underline">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2">
              {combos.map((c) => (
                <Link
                  key={c.id}
                  href={`/combos/${c.slug}`}
                  className="flex w-72 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="relative w-16 shrink-0">
                      <CoverImage product={c} className="aspect-[3/4] w-16 rounded-lg" sizes="64px" />
                      <span className="absolute -left-1 -top-1 rounded bg-brand-gold px-1 text-[8px] font-black text-brand-teal">SALE</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-deva line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</p>
                      <p className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-base font-black text-red-600">₹{c.price}</span>
                        {c.mrp > c.price && <span className="text-xs text-gray-400 line-through">₹{c.mrp}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="font-deva rounded-xl bg-gray-100 py-2 text-center text-xs font-bold text-gray-800">
                    Check Details / अधिक माहिती
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
