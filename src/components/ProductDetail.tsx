"use client";

import { useState } from "react";
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
  MessageCircle,
  Package,
  CheckCircle2,
  Circle,
  Check,
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
import { coverSrc, coverSrcSet, PHONE_COVER_MAX, PHONE_COVER_SIZES, PHONE_MEDIA, WIDE_COVER_SIZES, WIDE_MEDIA } from "@/lib/covers";
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
import { GALLERY_COPY, PRODUCT_COPY } from "@/lib/product-copy";

const PAYMENT_METHODS = ["UPI", "GPay", "PhonePe", "Paytm", "Visa / MC", "NetBanking"];

export default function ProductDetail({
  product: sourceProduct,
  relatedProducts = [],
  comboBooks: sourceComboBooks = [],
  comboOffers = [],
  offerBooks = {},
}: {
  product: Product;
  relatedProducts?: Product[];
  comboBooks?: Product[];
  /** Combos that include this (single) book — the offer cards. */
  comboOffers?: Product[];
  /** The books inside each offer, by combo id. */
  offerBooks?: Record<number, Product[]>;
}) {
  const { locale } = useLanguage();
  const product = localizeProduct(sourceProduct, locale);
  // Every other title, each shown in its own edition (as on the previous site).
  const related = relatedProducts.map((item) => localizeProduct(item, locale));
  const editionLocale = editionLocaleFor(sourceProduct, locale);
  const previewUrl = sourceProduct.availableLocales?.includes(editionLocale)
    ? previewPdfUrl(product.slug, editionLocale)
    : null;
  // Labels follow the edition on show (a Hindi-only book reads in Hindi).
  const copy = UI_COPY[editionLocale];
  const t = PRODUCT_COPY[editionLocale];
  const comboBooks = sourceComboBooks.map((item) => localizeProduct(item, locale));
  const offers = comboOffers.map((item) => localizeProduct(item, locale));
  const g = GALLERY_COPY[editionLocale];
  // Cover slider after this book's cover (client, 28 Oct): a combo's books, else
  // the combos with this book, else other titles.
  const slides = comboBooks.length
    ? comboBooks.map((item, i) => ({ product: item, label: g.bookOf(i + 1, comboBooks.length) }))
    : offers.length
      ? offers.map((item) => ({ product: item, label: t.comboBooks(item.setSize ?? 2) }))
      : related.slice(0, 4).map((item) => ({ product: item, label: g.more }));
  // Offer cards (client, 28 Oct): the biggest set is ticked first; the Buy
  // buttons and the phone's bottom bar always sell what is ticked.
  const biggest = offers.reduce<Product | null>((best, o) => (!best || (o.setSize ?? 0) > (best.setSize ?? 0) ? o : best), null);
  const [choiceId, setChoiceId] = useState<number | null>(biggest?.id ?? null);
  const chosen = offers.find((o) => o.id === choiceId) ?? product;
  // "2 / 3 books — get them" only when the set size is known (older combos may not have one).
  const chosenSize = chosen.isCombo ? chosen.setSize ?? 0 : 1;
  const buyLabel = chosenSize > 1 ? t.buySet(chosenSize, chosen.price) : `${copy.downloadNow} · ₹${chosen.price}`;
  // Swipe row under Buy (books without combos): other titles; the "you may
  // also like" row at the bottom would repeat it, so that one is left out.
  const alsoBuy = offers.length ? [] : related.slice(0, 6);
  // Warm the TLS connection so the Razorpay popup opens faster on Buy.
  preconnect("https://checkout.razorpay.com");
  preconnect("https://api.razorpay.com");
  // The cover is this page's LCP element — start fetching it from <head>.
  // One preload per screen size, matching the <picture> in ProductGallery
  // (phones max 600 px, larger screens up to 800 px).
  if (product.coverImage) {
    const phoneSet = coverSrcSet(product.coverImage, PHONE_COVER_MAX);
    const wideSet = coverSrcSet(product.coverImage);
    if (phoneSet && wideSet) {
      preload(coverSrc(product.coverImage), {
        as: "image",
        fetchPriority: "high",
        media: PHONE_MEDIA,
        imageSrcSet: phoneSet,
        imageSizes: PHONE_COVER_SIZES,
      });
      preload(coverSrc(product.coverImage), {
        as: "image",
        fetchPriority: "high",
        media: WIDE_MEDIA,
        imageSrcSet: wideSet,
        imageSizes: WIDE_COVER_SIZES,
      });
    } else {
      preload(coverSrc(product.coverImage), { as: "image", fetchPriority: "high" });
    }
  }
  const pct = discountPercent(product);
  const backHref = product.isCombo ? "/combos" : "/ebooks";
  const backLabel = product.isCombo ? t.combos : t.ebooks;
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
  };

  return (
    <div className="container-x py-6 lg:py-8">
      <TrackViewContent product={sourceProduct} />
      <StickyBuyBar product={chosen} label={chosenSize > 1 ? t.buySetShort(chosenSize) : undefined} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-brand-400 lg:mb-6">
        <Link href="/" className="hover:text-brand-700">
          {t.home}
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
          <ProductGallery key={`${product.id}-${locale}`} product={product} previewUrl={previewUrl} labelsLocale={editionLocale} others={slides} />
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
              📦 <strong className="text-gray-700">{SITE.stats.trust}</strong> {t.readersTrust}
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-green-600">{t.instantDelivery}</span>
          </div>

          {/* price — or the offer cards on a book that is also sold in combos */}
          {offers.length > 0 ? (
            <OfferCards book={product} offers={offers} offerBooks={offerBooks} chosenId={chosen.id} onChoose={setChoiceId} t={t} />
          ) : (
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
                <span className="font-deva text-[10px] font-bold text-gray-500 sm:text-xs">{t.only}</span>
              </div>
              <span className="font-deva mt-0.5 text-[10px] font-semibold text-gray-500">
                {t.taxes}
              </span>
            </div>
            {pct > 0 && (
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <span className="font-deva animate-pulse rounded-lg border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 md:text-xs">
                  {pct}% {t.off}
                </span>
                <span className="font-deva inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {copy.limitedOffer}
                </span>
              </div>
            )}
          </div>
          )}

          {/* notices */}
          <div className="font-deva mb-3 space-y-1.5">
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-800">
              {t.digitalOnly}
            </p>
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
              {t.noRefund}
            </p>
          </div>

          {/* buy */}
          <div id="buy-now" className="mb-4 flex flex-col gap-2">
            <BuyButton
              product={chosen}
              label={buyLabel}
              className="font-deva flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-center text-lg leading-tight font-extrabold text-brand-teal shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-gold/90 active:scale-[0.98]"
            />
            <p className="font-deva flex items-center justify-center gap-1 text-center text-[10px] text-brand-500">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              {t.buyNote}
            </p>
            <WhatsAppHint text={t.whatsappHint} />
          </div>

          {/* what's inside: the ticked combo (book page) or this combo (combo page) */}
          {chosen.isCombo && (offerBooks[chosen.id]?.length ?? 0) > 0 && (
            <BookChecklist books={offerBooks[chosen.id].map((b) => localizeProduct(b, locale))} price={chosen.price} t={t} />
          )}
          {product.isCombo && comboBooks.length > 0 && <BookChecklist books={comboBooks} price={product.price} t={t} />}

          {alsoBuy.length > 0 && <AlsoBuyRow book={product} items={alsoBuy} title={g.alsoBuy} t={t} g={g} />}

          {/* chips */}
          <div className="font-deva mb-4 flex flex-wrap gap-2 text-[10px] font-medium text-brand-500 md:text-xs">
            <Chip icon={FileText} title={`PDF (${LANGUAGE_LABELS[product.language]})`} />
            <Chip icon={BookOpen} title={`${product.pages} ${t.pages}`} />
            <Chip icon={Zap} title={t.instantDownload} />
          </div>

          {/* mini how to buy */}
          <div className="mb-4 rounded-2xl border border-brand-teal/10 bg-brand-teal/5 p-3 sm:p-4">
            <h4 className="font-deva mb-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-brand-teal/60 sm:text-[10px]">
              {t.howToBuy}
            </h4>
            <div className="flex items-start justify-between gap-1 text-center">
              {t.steps.map((s, i) => (
                <div key={s.label} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black shadow-sm ${
                        i === t.steps.length - 1 ? "border-green-200 bg-green-500 text-white" : "border-brand-teal/20 bg-white text-brand-teal"
                      }`}
                    >
                      {i === t.steps.length - 1 ? "✓" : i + 1}
                    </span>
                    <span className="font-deva text-[9px] font-bold leading-tight text-gray-800 sm:text-[10px]">
                      {s.label}
                      {s.en && (
                        <>
                          <br />
                          <span className="font-medium opacity-60">{s.en}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {i < t.steps.length - 1 && <div className="mb-4 h-px w-3 shrink-0 bg-brand-teal/20 sm:w-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* description */}
          <div className="mt-6">
            <h3 className="font-deva mb-1 text-sm font-bold text-brand-teal sm:text-base">
              {t.description}
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
                product={chosen}
                label={chosenSize > 1 ? buyLabel : `${copy.downloadNow} (Download Now)`}
                className="font-deva flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gold px-6 py-2 text-center leading-tight font-extrabold text-brand-teal shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-gold/90 active:scale-[0.98]"
              />
              <p className="font-deva flex items-center justify-center gap-1.5 text-center text-[10px] text-brand-500">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> {t.securePayment}
              </p>
              <WhatsAppHint text={t.whatsappHint} />
              <div className="flex flex-wrap items-center justify-center gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span key={method} className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {method}
                  </span>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <ShareButton title={product.title} label={t.share} copied={t.copied} />
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="cv-auto mt-8">
            <h3 className="font-deva flex items-center gap-2 text-base font-bold text-brand-teal sm:text-lg">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> {t.faqTitle}
            </h3>
            <div className="mt-3 divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
              {t.faq.map((item) => (
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
      {offers.length > 0 && related.length > 0 && (
        <section className="cv-auto mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-deva text-xl font-extrabold text-brand-900 sm:text-2xl">
                {t.relatedTitle}
              </h2>
              <p className="font-deva mt-1 text-sm text-brand-500">
                {t.relatedBody}
              </p>
            </div>
            <Link
              href="/ebooks"
              className="font-deva flex-shrink-0 text-sm font-semibold text-brand-teal hover:underline"
            >
              {t.viewAll}
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

/** Text-only offer cards: this book, then each combo size (2 books, all 3),
 *  with the price per book and the saving; a size with several combos asks
 *  for the second book. One tap ticks it — the Buy buttons follow. */
function OfferCards({
  book,
  offers,
  offerBooks,
  chosenId,
  onChoose,
  t,
}: {
  book: Product;
  offers: Product[];
  offerBooks: Record<number, Product[]>;
  chosenId: number;
  onChoose: (id: number | null) => void;
  t: (typeof PRODUCT_COPY)[keyof typeof PRODUCT_COPY];
}) {
  const sizes = [...new Set(offers.map((o) => o.setSize ?? 2))].sort((a, b) => a - b);
  const top = sizes[sizes.length - 1];
  const tiers = [
    { size: 1, items: [book] },
    ...sizes.map((size) => ({ size, items: offers.filter((o) => (o.setSize ?? 2) === size) })),
  ];
  return (
    <section className="mb-3" aria-label={t.offerPick}>
      <h3 className="font-deva mb-2 text-sm font-extrabold text-brand-teal">{t.offerPick}</h3>
      <div className="space-y-2" role="radiogroup">
        {tiers.map(({ size, items }) => {
          const picked = items.find((i) => i.id === chosenId);
          const shown = picked ?? items[0];
          const on = Boolean(picked);
          const saving = size > 1 ? size * book.price - shown.price : 0;
          const extra = size > 1 ? shown.price - book.price : 0;
          return (
            <div
              key={size}
              className={`rounded-2xl border-2 transition ${on ? "border-green-500 bg-green-50" : "border-brand-100 bg-white"}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChoose(size === 1 ? null : shown.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                {on ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-6 w-6 shrink-0 text-brand-200" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-deva flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-extrabold leading-tight text-brand-900">
                    {size === 1 ? t.thisBookOnly : t.setOf(size)}
                    {size === top && size > 1 && (
                      <span className="rounded-md bg-brand-gold px-1.5 py-0.5 text-[10px] font-extrabold text-brand-teal">⭐ {t.bestValue}</span>
                    )}
                  </span>
                  {size > 1 && (
                    <span className="font-deva mt-0.5 block text-xs font-bold text-green-700">
                      {t.perBook(Math.round(shown.price / size))} · {size === top ? t.save(saving) : t.justMore(extra)}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  {shown.mrp > shown.price && <span className="text-xs font-semibold text-gray-400 line-through">₹{shown.mrp}</span>}
                  <span className="text-2xl font-black text-green-600">₹{shown.price}</span>
                </span>
              </button>
              {/* Several combos of this size: which other book? */}
              {on && items.length > 1 && (
                <div className="px-3 pb-3">
                  <p className="font-deva mb-1.5 text-xs font-bold text-brand-600">{t.pickSecond}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChoose(item.id)}
                        aria-pressed={item.id === chosenId}
                        className={`font-deva rounded-full border px-3 py-1.5 text-left text-xs font-bold leading-snug ${
                          item.id === chosenId ? "border-green-600 bg-white text-green-800 ring-1 ring-green-600" : "border-brand-200 bg-white text-brand-700"
                        }`}
                      >
                        + {(offerBooks[item.id] ?? []).filter((b) => b.id !== book.id).map((b) => b.title).join(" + ") || item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-deva mt-1.5 text-[10px] font-semibold text-gray-500">{t.taxes}</p>
    </section>
  );
}

/** Text-only "you get" list for a combo, with the price if bought one by one. */
function BookChecklist({
  books,
  price,
  t,
}: {
  books: Product[];
  price: number;
  t: (typeof PRODUCT_COPY)[keyof typeof PRODUCT_COPY];
}) {
  const sum = books.reduce((total, b) => total + b.price, 0);
  return (
    <section className="mb-4 rounded-2xl border border-green-200 bg-white p-3">
      <h3 className="font-deva mb-2 text-sm font-extrabold text-brand-teal">
        {t.youGet} ({books.length})
      </h3>
      <ul className="space-y-1.5">
        {books.map((b) => (
          <li key={b.id}>
            <Link href={`/ebooks/${b.slug}`} className="font-deva flex items-start gap-2 text-sm font-semibold leading-snug text-brand-900 hover:underline">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
              <span className="min-w-0 flex-1">{b.title}</span>
              <span className="shrink-0 text-xs font-medium text-brand-400">
                {b.pages} {t.pages}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="font-deva mt-2 text-[11px] font-medium text-brand-500">📄 {t.onePdf}</p>
      {sum > price && (
        <p className="font-deva mt-2 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-800">{t.separately(sum, price)}</p>
      )}
    </section>
  );
}

/** Under Buy: a swipe row of books / combos, each with its own big Buy
 *  (client, 28 Oct). For a combo with this book, the saving against buying
 *  the books one by one at this book's price. */
function AlsoBuyRow({
  book,
  items,
  title,
  t,
  g,
}: {
  book: Product;
  items: Product[];
  title: string;
  t: (typeof PRODUCT_COPY)[keyof typeof PRODUCT_COPY];
  g: (typeof GALLERY_COPY)[keyof typeof GALLERY_COPY];
}) {
  return (
    <section className="mb-4 rounded-2xl border-2 border-brand-gold/60 bg-amber-50/60 py-3">
      <h3 className="font-deva flex items-center gap-1.5 px-3 text-sm font-extrabold text-brand-teal sm:text-base">
        <Package className="h-4 w-4 shrink-0" aria-hidden="true" /> {title}
      </h3>
      <ul className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-1">
        {items.map((item) => {
          const size = item.isCombo ? item.setSize ?? 0 : 1;
          const saving = item.isCombo && !book.isCombo && size > 1 ? size * book.price - item.price : 0;
          const href = `/${item.isCombo ? "combos" : "ebooks"}/${item.slug}`;
          return (
            <li key={item.id} className="flex w-[62%] max-w-[230px] shrink-0 snap-start flex-col rounded-xl border border-amber-200 bg-white p-2">
              <Link href={href} className="block">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-brand-50">
                  {item.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variant
                    <img src={coverSrc(item.coverImage)} alt={item.title} width={400} height={533} loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {saving > 0 && (
                    <span className="font-deva absolute left-1.5 top-1.5 rounded-md bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {t.comboSave(saving)}
                    </span>
                  )}
                </span>
                {size > 1 && <span className="font-deva mt-1.5 block text-[11px] font-bold text-brand-teal">{t.comboBooks(size)}</span>}
                <span className="font-deva mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-brand-900">{item.title}</span>
              </Link>
              <span className="mt-auto flex items-baseline gap-1.5 pt-1.5">
                {item.mrp > item.price && <span className="text-[11px] font-semibold text-gray-400 line-through">₹{item.mrp}</span>}
                <span className="text-xl font-black text-green-600">₹{item.price}</span>
              </span>
              <BuyButton
                product={item}
                showIcon={false}
                label={g.buyNow}
                className="font-deva mt-1.5 flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-3 py-2 text-sm font-extrabold text-brand-teal shadow-sm transition hover:brightness-95 active:scale-[0.98]"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Under the Buy buttons: Razorpay asks for a mobile number next — say it is
 *  the WhatsApp number the PDF goes to. */
function WhatsAppHint({ text }: { text: string }) {
  return (
    <p className="font-deva flex items-start justify-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-green-800">
      <MessageCircle className="mt-px h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
      {text}
    </p>
  );
}

/** Native share sheet on phones; copies the link elsewhere. */
function ShareButton({ title, label, copied }: { title: string; label: string; copied: string }) {
  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.alert(copied);
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
      <Share2 className="h-4 w-4" /> {label}
    </button>
  );
}
