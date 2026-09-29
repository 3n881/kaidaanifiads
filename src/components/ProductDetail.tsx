"use client";

import Link from "next/link";
import { preconnect, preload } from "react-dom";
import {
  FileText,
  Zap,
  Star,
  ChevronRight,
  BookOpen,
  Info,
  AlertCircle,
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
import BuyButton from "./BuyButton";
import StickyBuyBar from "./StickyBuyBar";
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
    a: "पेमेंट यशस्वी झाल्यानंतर तुम्हाला लगेच Download Button दिसेल आणि PDF डाउनलोड होईल. ही लिंक याच मोबाईलवर ‘माझी पुस्तके’ मध्ये जतन राहते, त्यामुळे नंतरही पुन्हा डाउनलोड करता येते.",
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
      url: `https://kaydyachaanifaydyach.com/${
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

        {/* Info */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-teal px-2 py-0.5 text-xs font-black text-white">
              <span className="text-[9px] tracking-wider text-brand-gold">ID</span>
              {product.id}
            </span>
            {product.isCombo && (
              <span className="badge-combo font-deva inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Combo Pack{product.setSize ? ` · ${product.setSize} Book Set` : ""}
              </span>
            )}
          </div>
          <h1 className="font-deva text-2xl font-extrabold leading-snug text-brand-900 sm:text-3xl">
            {product.title}
          </h1>

          {/* trust row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-500">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <b className="text-brand-700">{product.rating}/5</b>
            </span>
            <span className="text-brand-200">|</span>
            <span>📦 {SITE.stats.trust} वाचकांनी विश्वास ठेवला</span>
            <span className="text-brand-200">|</span>
            <span className="inline-flex items-center gap-1 text-brand-600">
              <Zap className="h-4 w-4" /> Instant Digital Delivery
            </span>
          </div>

          {/* price block */}
          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-lg text-brand-400 line-through">
                ₹{product.mrp}
              </span>
              <span className="text-4xl font-extrabold text-brand-700">
                ₹{product.price}
              </span>
              <span className="font-deva pb-1 text-sm text-brand-500">फक्त</span>
              {pct > 0 && (
                <span className="badge-sale font-deva mb-1 rounded-md px-2 py-0.5 text-xs font-bold text-white">
                  {pct}% सवलत
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-brand-400">
              Inclusive of all taxes · No GST applicable
            </p>
            <p className="font-deva mt-1 text-xs font-medium text-sale-600">
              ऑफर मर्यादित वेळेसाठी फक्त
            </p>

            <div id="buy-now" className="mt-4">
              <BuyButton product={product} label={copy.downloadNow} />
              <p className="font-deva mt-2 text-center text-xs font-semibold text-brand-600">
                Login / Account ची गरज नाही · पेमेंटनंतर PDF लगेच डाउनलोड
              </p>
            </div>

            {/* chips */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Chip icon={FileText} title={`PDF (${LANGUAGE_LABELS[product.language]})`} />
              <Chip icon={BookOpen} title={`${product.pages} पाने`} />
              <Chip icon={Zap} title="Instant Download" />
            </div>
          </div>

          {/* notices */}
          <div className="mt-4 space-y-2">
            <Notice icon={Info}>
              📄 हे केवळ Digital PDF E-Book आहे — कोणतीही Physical / Printed प्रत
              पाठवली जात नाही.
            </Notice>
            <Notice icon={AlertCircle} tone="warn">
              ⚠️ एकदा PDF डाउनलोड केल्यानंतर परतावा (Refund) शक्य नाही.
            </Notice>
          </div>

          {/* mini how to buy */}
          <div className="mt-6">
            <h3 className="font-deva text-sm font-bold text-brand-800">
              खरेदी करण्याची पद्धत / How to Buy
            </h3>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MINI_STEPS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-xl border border-brand-100 bg-white p-3 text-center"
                >
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {s.n}
                  </span>
                  <p className="font-deva mt-2 text-xs font-semibold text-brand-800">
                    {s.label}
                  </p>
                  <p className="text-[10px] text-brand-400">{s.en}</p>
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
          <div className="mt-8">
            <h3 className="font-deva text-lg font-bold text-brand-900">
              वर्णन / Description
            </h3>
            <div className="mt-3">
              <ExpandableText text={product.description} />
            </div>
          </div>

          {/* buy again + payment methods + share */}
          <div className="mt-6 space-y-4 rounded-2xl border border-brand-100 bg-white p-4">
            <BuyButton product={product} label={`${copy.downloadNow} (Download Now)`} />
            <div>
              <p className="font-deva flex items-center gap-1.5 text-xs font-bold text-brand-700">
                <ShieldCheck className="h-4 w-4 text-green-600" /> सुरक्षित पेमेंट (Safe &amp; Secure Payment)
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((method) => (
                  <span key={method} className="rounded-md border border-brand-100 bg-brand-50/60 px-2 py-1 text-[11px] font-bold text-brand-600">
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <ShareButton title={product.title} />
          </div>

          {/* FAQ */}
          <div className="mt-8">
            <h3 className="font-deva text-lg font-bold text-brand-900">
              नेहमी विचारले जाणारे प्रश्न
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
    <div className="rounded-xl bg-white px-2 py-2.5 shadow-sm">
      <Icon className="mx-auto h-4 w-4 text-brand-600" />
      <p className="font-deva mt-1 text-[11px] font-semibold text-brand-700">
        {title}
      </p>
    </div>
  );
}

function Notice({
  icon: Icon,
  children,
  tone = "info",
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  const styles =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-brand-100 bg-brand-50/60 text-brand-700";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${styles}`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="font-deva">{children}</p>
    </div>
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
