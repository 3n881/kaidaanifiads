"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Check, CheckCircle2, Circle, Loader2, MapPin, Package, ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { Product } from "@/data/catalog";
import { localizeProduct } from "@/lib/catalog";
import { coverThumbSrc } from "@/lib/covers";
import { loadSavedBuyer } from "@/lib/buyer";
import { checkAddress, INDIAN_STATES, type AddressField, type PrintAddress } from "@/lib/print-address";
import { COD_FEE, PRINT_COPY, PRINT_PRICE, printTotal, type PrintPayment } from "@/lib/print-copy";
import { useLanguage } from "./LanguageProvider";
import { SITE } from "@/data/catalog";
import { loadRazorpayScript, openRazorpay, type RazorpaySuccess } from "@/lib/razorpay-client";
import { pixelProduct, trackPixel } from "@/lib/meta-pixel";
import { visitForCheckout } from "@/lib/visit-tracking";

const ADDRESS_KEY = "kaf-print-address";

type OrderAnswer = {
  orderNo?: string;
  orderId?: string;
  error?: string;
  razorpay?: { keyId: string; orderId: string; amount: number; currency: string; prefill: Record<string, string> };
};
const EMPTY: PrintAddress = { name: "", phone: "", house: "", area: "", landmark: "", pincode: "", city: "", district: "", state: "Maharashtra" };

/**
 * Printed-book checkout (client, 26 Nov): delivery address + payment choice
 * (online ₹399 with free delivery, or Cash on Delivery ₹399 + ₹50), then the
 * order is placed via /api/print-orders (phase 2). Phone: one column with the
 * total and the order button pinned at the bottom; computers: form left,
 * summary + button right.
 */
export default function PrintCheckout({ product: source }: { product: Product }) {
  const { locale } = useLanguage();
  // Book title in the book's own edition; every form text follows the website language (owner, 26 Nov).
  const product = localizeProduct(source, locale);
  const pt = PRINT_COPY[locale];
  const [address, setAddress] = useState<PrintAddress>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<AddressField, boolean>>>({});
  const [showAll, setShowAll] = useState(false);
  const [payment, setPayment] = useState<PrintPayment>("online");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ orderNo: string; payment: PrintPayment; address: PrintAddress } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // An online order already created for this address: pressing again reopens its Razorpay window
  // instead of making a new order each time.
  const pending = useRef<{ key: string; data: OrderAnswer } | null>(null);

  // The pinned order bar (phones): lifts the WhatsApp / back-to-top buttons above it, as on book pages.
  useEffect(() => {
    if (done) return;
    document.body.dataset.buybar = "on";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, [done]);

  // Pre-fill: the last printed-book address on this device, else name + number from the e-book popup.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(ADDRESS_KEY) || "null") as Partial<PrintAddress> | null;
        if (saved) return setAddress((current) => ({ ...current, ...saved }));
      } catch {
        // ignore
      }
      const buyer = loadSavedBuyer();
      setAddress((current) => ({ ...current, name: buyer.name, phone: buyer.phone }));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const { bad } = checkAddress(address);
  const badSet = new Set(bad);
  const showError = (field: AddressField) => badSet.has(field) && (showAll || touched[field]);
  const total = printTotal(payment);

  const set = (field: AddressField) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === "phone" || field === "pincode" ? event.target.value.replace(/\D/g, "").slice(0, field === "phone" ? 10 : 6) : event.target.value;
    setAddress((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const blur = (field: AddressField) => () => setTouched((current) => ({ ...current, [field]: true }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (bad.length) {
      setShowAll(true);
      setError(pt.errors.first);
      formRef.current?.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    const clean = checkAddress(address).address;
    try {
      window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(clean));
    } catch {
      // private browsing
    }
    setSending(true);
    const pixel = { ...pixelProduct({ id: source.id, title: product.title, price: total }), content_category: "printed" };
    trackPixel("InitiateCheckout", pixel);
    const finish = () => {
      setDone({ orderNo: data.orderNo!, payment, address: clean });
      window.scrollTo({ top: 0 });
    };
    let data: OrderAnswer;
    try {
      const key = JSON.stringify([payment, clean]);
      if (payment === "online" && pending.current?.key === key) {
        data = pending.current.data;
      } else {
        const [response] = await Promise.all([
          fetch("/api/print-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: source.slug, locale, payment, address: clean, visit: visitForCheckout() }),
          }),
          payment === "online" ? loadRazorpayScript() : null,
        ]);
        data = (await response.json().catch(() => ({}))) as OrderAnswer;
        if (!response.ok || !data.orderNo) throw new Error(data.error || "failed");
        if (data.razorpay) pending.current = { key, data };
      }
    } catch {
      setSending(false);
      setError(pt.busy);
      return;
    }

    // COD, or local development without Razorpay keys: the order is placed.
    if (!data.razorpay) {
      setSending(false);
      if (payment === "online") trackPixel("Purchase", { ...pixel, value: total }, data.orderId);
      return finish();
    }

    const rz = data.razorpay;
    let failed = false;
    const checkout = openRazorpay({
      key: rz.keyId,
      amount: rz.amount,
      currency: rz.currency,
      name: SITE.name,
      description: `${pt.print} · ${product.title}`.slice(0, 250),
      order_id: rz.orderId,
      prefill: rz.prefill,
      readonly: { contact: true },
      hidden: { email: true },
      theme: { color: "#0A2342" },
      handler: async (paid: RazorpaySuccess) => {
        trackPixel("Purchase", { ...pixel, value: total }, data.orderId);
        // Shown at once; the server records it (confirm, else the webhook / 10-min check).
        await fetch("/api/print-orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paid),
          keepalive: true,
        }).catch(() => undefined);
        pending.current = null;
        setSending(false);
        finish();
      },
      modal: {
        ondismiss: () => {
          setSending(false);
          setError(failed ? pt.payFailed : pt.payNotDone);
        },
      },
    });
    if (!checkout) {
      setSending(false);
      setError(pt.busy);
      return;
    }
    checkout.on("payment.failed", () => {
      failed = true;
    });
  }

  if (done) return <Done pt={pt} product={product} done={done} />;

  const field = (name: AddressField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> & { hint?: string; optional?: boolean } = {}) => {
    const { hint, optional, ...input } = props;
    const wrong = showError(name);
    return (
      <label className="block">
        <span className="font-deva mb-1 flex items-center gap-1 text-xs font-bold text-brand-800">
          {label}
          {optional ? <span className="font-medium text-brand-400">({pt.optional})</span> : <span className="text-danger-600" aria-hidden="true">*</span>}
        </span>
        <input
          name={name}
          value={address[name]}
          onChange={set(name)}
          onBlur={blur(name)}
          aria-invalid={wrong}
          className={`font-deva h-12 w-full rounded-xl border-2 bg-white px-3 text-base text-brand-900 outline-none transition placeholder:text-sm placeholder:text-brand-300 focus:border-brand-teal ${
            wrong ? "border-danger-500 bg-danger-500/5" : "border-brand-100"
          }`}
          {...input}
        />
        {wrong ? (
          <span role="alert" className="font-deva mt-1 block text-[11px] font-semibold text-danger-600">{pt.errors[name as keyof typeof pt.errors]}</span>
        ) : hint ? (
          <span className="font-deva mt-1 block text-[11px] text-brand-500">{hint}</span>
        ) : null}
      </label>
    );
  };

  const summary = (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <h2 className="font-deva mb-3 text-sm font-extrabold text-brand-900">{pt.summaryTitle}</h2>
      <div className="mb-3 flex gap-3">
        {product.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverThumbSrc(product.coverImage)} alt="" width={64} height={85} className="h-[85px] w-16 shrink-0 rounded-md border border-brand-100 object-cover" />
        )}
        <div className="min-w-0">
          <p className="font-deva line-clamp-3 text-[13px] font-bold leading-snug text-brand-900">{product.title}</p>
          <p className="font-deva mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            <Package className="h-3.5 w-3.5" aria-hidden="true" /> {pt.printedCopy}
          </p>
        </div>
      </div>
      <dl className="font-deva space-y-1.5 border-t border-brand-50 pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-brand-600">{pt.bookLine}</dt><dd className="font-semibold text-brand-900">₹{PRINT_PRICE}</dd></div>
        {/* Delivery is free only when paid online; Cash on Delivery = ₹50 delivery charge. */}
        {payment === "cod" ? (
          <div className="flex justify-between"><dt className="text-brand-600">{pt.codFee}</dt><dd className="font-semibold text-brand-900">₹{COD_FEE}</dd></div>
        ) : (
          <div className="flex justify-between"><dt className="text-brand-600">{pt.delivery}</dt><dd className="font-semibold text-green-700">{pt.free}</dd></div>
        )}
        <div className="flex justify-between border-t border-brand-50 pt-2 text-base"><dt className="font-extrabold text-brand-900">{pt.total}</dt><dd className="font-black text-green-600">₹{total}</dd></div>
      </dl>
      <p className="font-deva mt-3 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">{pt.deliveryTime}</p>
    </div>
  );

  const button = (extra = "") => (
    <button
      type="submit"
      form="print-order-form"
      disabled={sending}
      className={`font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3.5 text-base font-extrabold text-brand-teal shadow-lg transition hover:brightness-95 active:scale-[0.98] disabled:opacity-70 ${extra}`}
    >
      {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : payment === "cod" ? <Banknote className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      {payment === "cod" ? pt.placeCod(total) : pt.payOnline(total)}
    </button>
  );

  return (
    <div className="container-x py-5 lg:py-8">
      <Link href={`/${source.isCombo ? "combos" : "ebooks"}/${source.slug}`} className="font-deva mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-800">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {pt.back}
      </Link>
      <h1 className="font-deva mb-1 text-xl font-black text-brand-teal sm:text-2xl">{pt.pageTitle}</h1>
      <ol className="font-deva mb-5 flex items-center gap-2 text-[11px] font-bold text-brand-400">
        {pt.steps.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i < 2 ? "bg-brand-teal text-white" : "bg-brand-100 text-brand-500"}`}>{i + 1}</span>
            <span className={i < 2 ? "text-brand-800" : ""}>{step}</span>
            {i < pt.steps.length - 1 && <span className="h-px w-5 bg-brand-200" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div className="lg:hidden">{summary}</div>

        <form id="print-order-form" ref={formRef} onSubmit={submit} noValidate className="space-y-5">
          <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-deva mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-900">
              <MapPin className="h-4 w-4 text-brand-teal" aria-hidden="true" /> {pt.addressTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("name", pt.name, { placeholder: pt.namePlaceholder, autoComplete: "name" })}</div>
              <div className="sm:col-span-2">
                {field("phone", pt.phone, { placeholder: pt.phonePlaceholder, inputMode: "numeric", autoComplete: "tel-national", hint: pt.phoneHint })}
              </div>
              <div className="sm:col-span-2">{field("house", pt.house, { placeholder: pt.housePlaceholder, autoComplete: "address-line1" })}</div>
              <div className="sm:col-span-2">{field("area", pt.area, { placeholder: pt.areaPlaceholder, autoComplete: "address-line2" })}</div>
              <div className="sm:col-span-2">{field("landmark", pt.landmark, { placeholder: pt.landmarkPlaceholder, optional: true })}</div>
              {field("pincode", pt.pincode, { placeholder: "411001", inputMode: "numeric", autoComplete: "postal-code" })}
              {field("city", pt.city, { placeholder: pt.cityPlaceholder, autoComplete: "address-level2" })}
              {field("district", pt.district, { placeholder: pt.districtPlaceholder })}
              <label className="block">
                <span className="font-deva mb-1 flex items-center gap-1 text-xs font-bold text-brand-800">
                  {pt.state} <span className="text-danger-600" aria-hidden="true">*</span>
                </span>
                <select
                  name="state"
                  value={address.state}
                  onChange={set("state")}
                  onBlur={blur("state")}
                  autoComplete="address-level1"
                  className="h-12 w-full rounded-xl border-2 border-brand-100 bg-white px-3 text-base text-brand-900 outline-none focus:border-brand-teal"
                >
                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-deva mb-3 text-sm font-extrabold text-brand-900">{pt.paymentTitle}</h2>
            <div className="space-y-2.5" role="radiogroup" aria-label={pt.paymentTitle}>
              {([
                { key: "online", icon: Smartphone, title: pt.online, note: pt.onlineNote, price: printTotal("online"), badge: pt.recommended },
                { key: "cod", icon: Truck, title: pt.cod, note: pt.codNote(COD_FEE), price: printTotal("cod"), badge: null },
              ] as const).map(({ key, icon: Icon, title, note, price, badge }) => {
                const selected = payment === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPayment(key)}
                    className={`font-deva relative flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                      selected ? "border-green-600 bg-green-50" : "border-brand-100 bg-white hover:border-brand-200"
                    }`}
                  >
                    {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" /> : <Circle className="h-5 w-5 shrink-0 text-brand-200" aria-hidden="true" />}
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? "bg-green-600 text-white" : "bg-brand-50 text-brand-600"}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-brand-900">
                        {title}
                        {badge && <span className="rounded-full bg-green-600 px-2 py-0.5 text-[9px] font-extrabold text-white">{badge}</span>}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-brand-500">{note}</span>
                    </span>
                    <span className="shrink-0 text-lg font-black text-green-600">₹{price}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {error && <p role="alert" className="font-deva rounded-xl border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm font-semibold text-danger-600">{error}</p>}

          {/* computers / tablets: the button under the form */}
          <div className="hidden sm:block lg:hidden">{button()}</div>
          <p className="font-deva text-center text-[11px] text-brand-500">
            {pt.agree}{" "}
            <Link href="/terms" target="_blank" className="underline">{pt.terms}</Link> ·{" "}
            <Link href="/privacy-policy" target="_blank" className="underline">{pt.privacy}</Link>
          </p>
        </form>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            {summary}
            {button()}
            <p className="font-deva flex items-center justify-center gap-1 text-center text-[11px] text-brand-500">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" aria-hidden="true" /> {payment === "cod" ? pt.codNote(COD_FEE) : pt.onlineNote}
            </p>
          </div>
        </aside>
      </div>

      {/* phones: total + order button pinned above the bottom menu */}
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-brand-100 bg-white/95 px-4 pb-2.5 pt-2 shadow-[0_-4px_16px_rgba(10,35,66,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="shrink-0 leading-tight">
            <span className="font-deva block text-[10px] font-semibold text-brand-500">{pt.total}</span>
            <span className="block text-xl font-extrabold text-green-600">₹{total}</span>
          </div>
          <div className="min-w-0 flex-1">{button("py-3 text-sm")}</div>
        </div>
      </div>
      <div className="h-24 sm:hidden" aria-hidden="true" />
    </div>
  );
}

function Done({ pt, product, done }: { pt: (typeof PRINT_COPY)["mr"]; product: Product; done: { orderNo: string; payment: PrintPayment; address: PrintAddress } }) {
  const a = done.address;
  return (
    <div className="container-x py-8">
      <div className="mx-auto max-w-lg rounded-3xl border border-green-100 bg-white p-5 text-center shadow-sm sm:p-8">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="font-deva text-2xl font-black text-brand-teal">{pt.doneTitle}</h1>
        <p className="font-deva mt-2 text-sm text-brand-700">{done.payment === "cod" ? pt.doneCod(printTotal("cod")) : pt.doneOnline}</p>
        <p className="font-deva mt-4 inline-block rounded-xl bg-brand-50 px-4 py-2 text-sm">
          {pt.orderNo}: <strong className="font-mono text-brand-900">{done.orderNo}</strong>
        </p>
        <div className="font-deva mt-5 rounded-2xl border border-brand-100 p-4 text-left text-sm">
          <p className="mb-1 font-bold text-brand-900">{product.title}</p>
          <p className="mb-3 text-xs font-semibold text-blue-700">{pt.printedCopy} · ₹{printTotal(done.payment)}{done.payment === "cod" ? " (COD)" : ""}</p>
          <p className="text-xs font-bold text-brand-500">{pt.shipTo}</p>
          <p className="mt-1 leading-relaxed text-brand-800">
            {a.name} · {a.phone}<br />
            {a.house}, {a.area}{a.landmark ? `, ${a.landmark}` : ""}<br />
            {a.city}, {a.district}, {a.state} – {a.pincode}
          </p>
        </div>
        <p className="font-deva mt-4 text-xs text-brand-500">{pt.whatsappUpdate}</p>
        <Link href="/ebooks" className="font-deva mt-5 inline-flex rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-bold text-white">
          {pt.continueShopping}
        </Link>
      </div>
    </div>
  );
}
