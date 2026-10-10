"use client";

import Link from "next/link";
import { preconnect, preload } from "react-dom";
import {
  FileText,
  Zap,
  Star,
  ChevronRight,
  BookOpen,
  Flame,
  ShieldCheck,
  Share2,
  ChevronDown,
} from "lucide-react";
import type { Product } from "@/data/catalog";
import {
  LANGUAGE_LABELS,
  discountPercent,
  categoryOf,
  editionLocaleFor,
  localizeProduct,
} from "@/lib/catalog";
import { SITE } from "@/data/catalog";
import { coverSrc, coverSrcSet } from "@/lib/covers";
import { previewPdfUrl } from "@/lib/previews";
import { SITE_URL } from "@/lib/supabase/config";
import BuyButton from "./BuyButton";
import StickyBuyBar from "./StickyBuyBar";
import { TrackViewContent } from "./MetaPixel";
import ExpandableText from "./ExpandableText";
import DisclaimerBanner from "./DisclaimerBanner";
import Carousel from "./Carousel";
import ProductGallery from "./ProductGallery";
import { useLanguage } from "./LanguageProvider";
import { UI_COPY } from "@/lib/i18n";

// Our checkout: Buy opens the payment window directly, the PDF downloads right
// after payment, and the order stays in "माझी पुस्तके" on the device.
const MINI_STEPS = [
  { n: "1", label: "बटन दाबा", en: "Click" },
  { n: "2", label: "पेमेंट करा", en: "Pay" },
  { n: "3", label: "PDF मिळवा", en: "Download" },
  { n: "✓", label: "माझी पुस्तके", en: "My Books" },
];

const PAYMENT_METHODS = ["UPI", "GPay", "PhonePe", "Paytm", "Visa / MC", "NetBanking"];

// Same questions as the previous site; answers describe how this site delivers.
const PRODUCT_FAQ = [
  {
    q: "हे पुस्तक मला कसे मिळेल?",
    a: "पेमेंट यशस्वी झाल्यानंतर तुम्हाला लगेच Download Button दिसेल आणि PDF डाउनलोड होईल. पेमेंट करताना दिलेल्या मोबाईल नंबरवर पुस्तक PDF स्वरूपात WhatsApp वरही पाठवले जाते. ही लिंक याच मोबाईलवर ‘माझी पुस्तके’ मध्ये जतन राहते, त्यामुळे नंतरही पुन्हा डाउनलोड करता येते.",
  },
  {
    q: "पेमेंट सुरक्षित आहे का?",
    a: "हो, Razorpay 100% सुरक्षित आहे. GooglePay, PhonePe, Paytm किंवा कार्डद्वारे पेमेंट करा.",
  },
  {
    q: "मोबाईलवर वाचता येते का?",
    a: "हो! PDF फाइल कोणत्याही मोबाईल, लॅपटॉप किंवा टॅब्लेटवर वाचता येते.",
  },
  {
    q: "हे Physical पुस्तक आहे का?",
    a: "नाही. हे पूर्णपणे Digital PDF E-Book आहे. कोणतीही Printed / Hard Copy पाठवली जात नाही.",
  },
  {
    q: "किती डिव्हाइसवर वाचता येईल?",
    a: "PDF वर कोणतेही बंधन नाही — तुम्ही तुमच्या Mobile, Tablet, Laptop, Desktop — कोणत्याही डिव्हाइसवर वाचू शकता.",
  },
  {
    q: "भविष्यात Update मिळेल का?",
    a: "कायद्यात महत्त्वाचे बदल झाल्यास आम्ही Updated Edition प्रकाशित करतो. Current Version ची माहिती Product Page वर दिली आहे.",
  },
  {
    q: "हे पुस्तक कायदेशीर सल्ला देते का?",
    a: "नाही. हे पुस्तक केवळ संदर्भ आणि शैक्षणिक उद्देशाने आहे. हा कोणत्याही प्रकारचा कायदेशीर सल्ला (Legal Advice) नाही. तुमच्या विशिष्ट कायदेशीर समस्येसाठी नेहमी तज्ञ वकिलाचा सल्ला घ्या.",
  },
];

export default function ProductDetail({
  product: sourceProduct,
  relatedProducts = [],
  comboBooks: sourceComboBooks = [],
}: {
  product: Product;
  relatedProducts?: Product[];
  comboBooks?: Product[];
}) {
  const { locale } = useLanguage();
  const product = localizeProduct(sourceProduct, locale);
  // Every other title, each shown in its own edition (as on the previous site).
  const related = relatedProducts.map((item) => localizeProduct(item, locale));
  const editionLocale = editionLocaleFor(sourceProduct, locale);
  const previewUrl = sourceProduct.availableLocales?.includes(editionLocale)
    ? previewPdfUrl(product.slug, editionLocale)
    : null;
  const copy = UI_COPY[locale];
  const comboBooks = sourceComboBooks.map((item) => localizeProduct(item, locale));
  // Warm the TLS connection so the Razorpay popup opens faster on Buy.
  preconnect("https://checkout.razorpay.com");
  preconnect("https://api.razorpay.com");
  // The cover is this page's LCP element — start fetching it from <head>.
  if (product.coverImage) {
    const srcSet = coverSrcSet(product.coverImage);
    preload(coverSrc(product.coverImage), {
      as: "image",
      fetchPriority: "high",
      ...(srcSet ? { imageSrcSet: srcSet, imageSizes: "(max-width: 768px) 90vw, 400px" } : {}),
    });
  }
  const pct = discountPercent(product);
  const backHref = product.isCombo ? "/combos" : "/ebooks";
  const backLabel = product.isCombo ? "कॉम्बो पॅक्स" : "ई-बुक्स";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription,
    category: categoryOf(product),
    inLanguage: product.language,
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL.replace(/\/$/, "")}/${
        product.isCombo ? "combos" : "ebooks"
      }/${product.slug}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      bestRating: 5,
      ratingCount: 128,
    },
  };

  return (
    <div className="container-x py-6 lg:py-8">
      <TrackViewContent product={sourceProduct} />
      <StickyBuyBar product={product} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-brand-400 lg:mb-6">
        <Link href="/" className="hover:text-brand-700">
          मुख्यपृष्ठ
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={backHref} className="hover:text-brand-700">
          {backLabel}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-deva truncate text-brand-600">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr] lg:gap-8">
        {/* Preview viewer — full width on phones; the sticky bar keeps price
            and Buy on screen (as on the previous site). */}
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-24 lg:max-w-none lg:self-start">
          <ProductGallery key={`${product.id}-${locale}`} product={product} previewUrl={previewUrl} />
        </div>

        {/* Info — styling follows the original site's book page */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold/30 bg-brand-teal px-2 py-0.5 text-brand-gold">
              <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">ID</span>
              <span className="border-l border-brand-gold/20 pl-1.5 font-mono text-[11px] font-bold tracking-widest">
                {product.id}
              </span>
            </span>
            {product.isCombo && (
              <span className="badge-combo font-deva inline-block rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Combo Pack{product.setSize ? ` · ${product.setSize} Book Set` : ""}
              </span>
            )}
          </div>
          <h1 className="font-deva mb-3 text-xl font-black leading-tight text-brand-teal sm:text-2xl md:text-3xl lg:text-4xl">
            {product.title}
          </h1>

          {/* trust row */}
          <div className="font-deva mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-0.5" aria-label={`${product.rating}/5`}>
              {[0, 1, 2, 3, 4].map((n) => (
                <Star key={n} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
              <span className="ml-1 font-semibold text-gray-700">{product.rating}/5</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              📦 <strong className="text-gray-700">{SITE.stats.trust}</strong> वाचकांचा विश्वास
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-green-600">✓ लगेच डिजिटल डिलिव्हरी</span>
          </div>

          {/* price */}
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-green-100 bg-green-50/60 p-3 md:p-4">
            <div className="flex flex-col">
              {product.mrp > product.price && (
                <span className="text-[11px] font-semibold text-gray-400 line-through decoration-red-400/60">
                  ₹{product.mrp}
                </span>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-green-600 sm:text-4xl md:text-5xl">
                  ₹{product.price}
                </span>
                <span className="font-deva text-[10px] font-bold text-gray-500 sm:text-xs">फक्त</span>
              </div>
              <span className="font-deva mt-0.5 text-[10px] font-semibold text-gray-500">
                सर्व कर समाविष्ट (Inclusive of all taxes)
              </span>
            </div>
            {pct > 0 && (
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <span className="font-deva animate-pulse rounded-lg border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 md:text-xs">
                  {pct}% सवलत
                </span>
                <span className="font-deva inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {copy.limitedOffer}
                </span>
              </div>
            )}
          </div>

          {/* notices */}
          <div className="font-deva mb-3 space-y-1.5">
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-800">
              📄 हे केवळ Digital PDF E-Book आहे — कोणतीही Physical / Printed प्रत पाठवली जात नाही.
            </p>
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
              ⚠️ एकदा PDF डाउनलोड केल्यानंतर परतावा (Refund) शक्य नाही.
            </p>
          </div>

          {/* buy */}
          <div id="buy-now" className="mb-4 flex flex-col gap-2">
            <BuyButton
              product={product}
              label={copy.downloadNow}
              className="font-deva flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gold px-6 py-2 text-center leading-tight font-extrabold text-brand-teal shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-gold/90 active:scale-[0.98]"
            />
            <p className="font-deva flex items-center justify-center gap-1 text-center text-[10px] text-brand-500">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              सुरक्षित पेमेंट | UPI, Card, Netbanking · Login / Account ची गरज नाही
            </p>
          </div>

          {/* chips */}
          <div className="font-deva mb-4 flex flex-wrap gap-2 text-[10px] font-medium text-brand-500 md:text-xs">
            <Chip icon={FileText} title={`PDF (${LANGUAGE_LABELS[product.language]})`} />
            <Chip icon={BookOpen} title={`${product.pages} पाने`} />
            <Chip icon={Zap} title="लगेच डाउनलोड" />
          </div>

          {/* mini how to buy */}
          <div className="mb-4 rounded-2xl border border-brand-teal/10 bg-brand-teal/5 p-3 sm:p-4">
            <h4 className="font-deva mb-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-brand-teal/60 sm:text-[10px]">
              खरेदी करण्याची पद्धत / How to Buy
            </h4>
            <div className="flex items-start justify-between gap-1 text-center">
              {MINI_STEPS.map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black shadow-sm ${
                        s.n === "✓" ? "border-green-200 bg-green-500 text-white" : "border-brand-teal/20 bg-white text-brand-teal"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span className="font-deva text-[9px] font-bold leading-tight text-gray-800 sm:text-[10px]">
                      {s.label}
                      <br />
                      <span className="font-medium opacity-60">{s.en}</span>
                    </span>
                  </div>
                  {i < MINI_STEPS.length - 1 && <div className="mb-4 h-px w-3 shrink-0 bg-brand-teal/20 sm:w-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* combo contents */}
          {product.isCombo && comboBooks.length > 0 && (
            <div className="mt-8">
              <h3 className="font-deva text-lg font-bold text-brand-900">
                या कॉम्बोमध्ये समाविष्ट पुस्तके ({comboBooks.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {comboBooks.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/ebooks/${b.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3 transition hover:border-brand-300"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="font-deva min-w-0 flex-1 truncate text-sm font-medium text-brand-900">
                        {b.title}
                      </span>
                      <span className="text-xs text-brand-400">
                        {b.pages} पाने
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* description */}
          <div className="mt-6">
            <h3 className="font-deva mb-1 text-sm font-bold text-brand-teal sm:text-base">
              वर्णन / Description
            </h3>
            <div className="mt-2">
              <ExpandableText text={product.description} />
            </div>
          </div>

          {/* buy again + payment methods + share */}
          <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-lg">
            <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-28 w-28 rounded-full bg-brand-gold/10 blur-2xl" />
            <div className="relative z-10 flex flex-col gap-3">
              <BuyButton
                product={product}
                label={`${copy.downloadNow} (Download Now)`}
                className="font-deva flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gold px-6 py-2 text-center leading-tight font-extrabold text-brand-teal shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-gold/90 active:scale-[0.98]"
              />
              <p className="font-deva flex items-center justify-center gap-1.5 text-center text-[10px] text-brand-500">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> सुरक्षित पेमेंट (Safe &amp; Secure Payment)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span key={method} className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {method}
                  </span>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <ShareButton title={product.title} />
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8">
            <h3 className="font-deva flex items-center gap-2 text-base font-bold text-brand-teal sm:text-lg">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> नेहमी विचारले जाणारे प्रश्न
            </h3>
            <div className="mt-3 divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
              {PRODUCT_FAQ.map((item) => (
                <details key={item.q} className="group px-4 py-3">
                  <summary className="font-deva flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-800">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-brand-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="font-deva mt-2 text-sm leading-relaxed text-brand-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          <DisclaimerBanner className="mt-8" />
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-deva text-xl font-extrabold text-brand-900 sm:text-2xl">
                तुम्हाला हे देखील आवडेल
              </h2>
              <p className="font-deva mt-1 text-sm text-brand-500">
                आमची इतर काही महत्वाची पुस्तके पहा
              </p>
            </div>
            <Link
              href="/ebooks"
              className="font-deva flex-shrink-0 text-sm font-semibold text-brand-teal hover:underline"
            >
              सर्व पहा
            </Link>
          </div>
          <Carousel products={related} />
        </section>
      )}
      {/* room for the always-on mobile buy bar */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  );
}

function Chip({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {title}
    </span>
  );
}

/** Native share sheet on phones; copies the link elsewhere. */
function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.alert("लिंक कॉपी झाली! / Link copied");
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
    >
      <Share2 className="h-4 w-4" /> मित्रांना शेअर करा (SHARE LINK)
    </button>
  );
}
