"use client";

import { useState, useTransition } from "react";
import { Search, BookOpen, MessageCircle, Download, Package } from "lucide-react";
import { SITE } from "@/data/catalog";
import { lookupOrders, type PurchasedBook } from "./actions";

export default function MyBooksPage() {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<PurchasedBook[]>([]);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा.");
      setSearched(false);
      return;
    }
    startTransition(async () => {
      const res = await lookupOrders(phone);
      if (res.error) {
        setError(res.error);
        setSearched(false);
        return;
      }
      setBooks(res.orders);
      setSearched(true);
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
          तुमचा व्हॉट्सॲप नंबर टाका आणि तुमची खरेदी केलेली पुस्तके पुन्हा डाउनलोड करा.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
      >
        <div className="flex flex-1 items-center rounded-xl border border-brand-200 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
          <span className="px-3 text-sm text-brand-500">+91</span>
          <input
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            inputMode="numeric"
            placeholder="१० अंकी व्हॉट्सॲप नंबर"
            className="font-deva w-full bg-transparent py-3 pr-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="font-deva inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-5 py-3 text-sm font-bold text-white hover:bg-brand-teal/90 disabled:opacity-60"
        >
          <Search className="h-4 w-4" /> {pending ? "शोधत आहे…" : "पहा"}
        </button>
      </form>

      {error && (
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-medium text-danger-600">
          {error}
        </p>
      )}

      {searched && !error && (
        <div className="mx-auto mt-8 max-w-md">
          {books.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-teal/5 p-6 text-center">
              <p className="font-deva text-sm text-brand-700">
                या नंबरवर कोणतीही खरेदी आढळली नाही.
              </p>
              <a
                href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
                className="font-deva mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
              >
                <MessageCircle className="h-4 w-4" /> मदतीसाठी WhatsApp करा
              </a>
            </div>
          ) : (
            <ul className="space-y-3">
              {books.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                    {b.isCombo ? (
                      <Package className="h-5 w-5" />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-deva truncate text-sm font-bold text-brand-900">
                      {b.title}
                    </p>
                    <p className="text-xs text-brand-400">
                      ₹{b.amount} ·{" "}
                      {new Date(b.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  {b.downloadUrl ? (
                    <a
                      href={b.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-brand-teal px-3 py-2 text-xs font-bold text-white hover:bg-brand-teal/90"
                    >
                      <Download className="h-3.5 w-3.5" /> डाउनलोड
                    </a>
                  ) : (
                    <span className="text-[11px] text-brand-400">
                      लवकरच
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
