import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CheckCircle2, Clock, Download, MessageCircle, XCircle } from "lucide-react";
import { DatabaseUnavailableError, getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getDeliverableItems } from "@/lib/orders";
import { reconcileOrder } from "@/lib/reconcile";
import { autoWhatsAppEnabled } from "@/lib/delivery";
import { SITE } from "@/data/catalog";
import { OrderMemory, PendingRefresh, WhatsAppOptIn } from "@/components/order/OrderClient";
import InAppBrowserHint from "@/components/order/InAppBrowserHint";
import DownloadWhere from "@/components/order/DownloadWhere";
import { ORDER_EXTRA } from "@/lib/order-copy";
import { isLocale, localizedTitle, normalizeLocale, ORDER_COPY, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "तुमची ऑर्डर",
  robots: { index: false, follow: false },
  // The URL carries the order access token — never leak it via Referer.
  referrer: "no-referrer",
};

const ABANDONED_AFTER_MS = 30 * 60 * 1000;
// How long a freshly paid order waits for the automatic WhatsApp before
// offering the number popup, and for how long after payment that applies.
const AUTO_WHATSAPP_WAIT_MS = 8000;
const AUTO_WHATSAPP_WAIT_WINDOW_MS = 3 * 60 * 1000;

function isAbandoned(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > ABANDONED_AFTER_MS;
}

function paidRecently(paidAt: string | null): boolean {
  return Boolean(paidAt) && Date.now() - new Date(paidAt!).getTime() < AUTO_WHATSAPP_WAIT_WINDOW_MS;
}

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/order/[orderId]">) {
  const { orderId } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  // Text follows the visitor's chosen site language (cookie set by the language
  // picker); the order keeps its own edition language for the PDF itself.
  const chosen = (await cookies()).get("kaf_locale")?.value;
  const uiLocale: Locale | null = isLocale(chosen) ? chosen : null;

  if (!hasServiceRole) notFound();
  // A link without (or with a broken) ?t= token: never say "not found" to a
  // buyer — their order is saved in My Books on the phone they paid on.
  if (!verifyOrderAccessToken(orderId, token)) return <IncompleteLink locale={uiLocale ?? "mr"} />;

  const admin = getSupabaseAdmin();
  const loadOrder = () =>
    admin
      .from("orders")
      .select("id, status, amount, created_at, paid_at, delivered, product_id, locale, whatsapp_number, razorpay_order_id, products(title, title_mr, title_hi, title_en, slug, is_combo)")
      .eq("id", orderId)
      .maybeSingle();
  let { data: order, error: orderError } = await loadOrder();
  // Supabase down/slow: the token proves this is a real order, so never 404 —
  // reassure the buyer and keep checking until the database is back.
  if (orderError) return <SystemBusy orderId={orderId} token={token} locale={uiLocale ?? "mr"} />;
  if (!order) notFound();

  // Still unpaid here? Ask Razorpay directly — covers payments whose confirm
  // and webhook both failed (e.g. during a database outage).
  if (order.status === "created") {
    try {
      if (await reconcileOrder(order)) ({ data: order, error: orderError } = await loadOrder());
    } catch (error) {
      if (!(error instanceof DatabaseUnavailableError)) throw error;
    }
    if (orderError) return <SystemBusy orderId={orderId} token={token} locale={uiLocale ?? "mr"} />;
    if (!order) notFound();
  }

  const product = (Array.isArray(order.products) ? order.products[0] : order.products) as
    | { title: string; title_mr?: string | null; title_hi?: string | null; title_en?: string | null; slug: string; is_combo: boolean }
    | null;
  const locale = normalizeLocale(order.locale);
  const textLocale = uiLocale ?? locale;
  const copy = ORDER_COPY[textLocale];
  const extra = ORDER_EXTRA[textLocale];
  const title = localizedTitle(product, locale) || extra.book;
  const supportHref = `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Order ${orderId.slice(0, 8)} — download help`,
  )}`;

  if (order.status !== "paid") {
    // An unpaid order older than 30 min was abandoned (popup closed, UPI
    // cancelled) — stop polling and offer a retry instead.
    const failed = order.status === "failed" || isAbandoned(order.created_at);
    return (
      <div className="container-x max-w-md py-12 text-center">
        <OrderMemory orderId={orderId} token={token} title={title} locale={locale} />
        {failed ? (
          <XCircle className="mx-auto h-12 w-12 text-danger-600" aria-hidden="true" />
        ) : (
          <Clock className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        )}
        <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">
          {failed ? copy.failed : copy.pending}
        </h1>
        <p className="font-deva mt-2 text-sm text-brand-600">{title}</p>
        {failed ? (
          product?.slug && (
            <Link
              href={`/${product.is_combo ? "combos" : "ebooks"}/${product.slug}`}
              className="font-deva mt-6 inline-block rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white"
            >
              {copy.retry}
            </Link>
          )
        ) : (
          <PendingRefresh gaveUpText={extra.gaveUp} />
        )}
        <a href={supportHref} className="font-deva mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal hover:underline">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> {extra.needHelp}
        </a>
      </div>
    );
  }

  let items;
  try {
    items = await getDeliverableItems(order.product_id, locale);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return <SystemBusy orderId={orderId} token={token} title={title} locale={textLocale} />;
    }
    throw error;
  }
  const downloadHref = (itemId: number) =>
    `/api/download/${orderId}?t=${token}&item=${itemId}`;

  // Just paid and WhatsApp goes out automatically (from the webhook, usually
  // a few seconds after this page opens): give it time before asking for a
  // number, so the buyer isn't asked for nothing and messaged twice.
  const waitForAutoMs =
    autoWhatsAppEnabled && !order.delivered && paidRecently(order.paid_at)
      ? AUTO_WHATSAPP_WAIT_MS
      : 0;

  return (
    <div className="container-x max-w-md py-10">
      <OrderMemory
        orderId={orderId}
        token={token}
        title={title}
        locale={locale}
        autoDownloadHref={items.length === 1 ? downloadHref(items[0].id) : undefined}
      />
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">
          {copy.paid}
        </h1>
        <p className="font-deva mt-1 text-sm text-brand-600">
          {items.length === 1
            ? copy.singleDownload
            : copy.multiDownload}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <InAppBrowserHint locale={textLocale} />
        {items.length === 0 && (
          <p className="font-deva rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {extra.preparing}
          </p>
        )}
        {items.map((item) => (
          <a
            key={item.id}
            href={downloadHref(item.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-brand-teal px-4 py-3 text-left text-sm font-bold text-white hover:bg-brand-teal/90"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-deva min-w-0 flex-1 truncate">{item.title}</span>
            <span className="text-xs font-semibold text-white/80">PDF</span>
          </a>
        ))}
        {items.length > 0 && (
          <DownloadWhere locale={textLocale} fileNames={items.map((item) => `${item.slug}-${locale}.pdf`)} />
        )}
        <p className="font-deva text-center text-[11px] text-brand-500">
          {copy.bookmark}
        </p>
        <WhatsAppOptIn
          orderId={orderId}
          token={token}
          locale={locale}
          copyLocale={textLocale}
          delivered={Boolean(order.delivered || order.whatsapp_number)}
          waitForAutoMs={waitForAutoMs}
        />
        <a href={supportHref} className="font-deva flex items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-brand-teal hover:underline">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> {copy.help}
        </a>
      </div>
    </div>
  );
}

function IncompleteLink({ locale }: { locale: Locale }) {
  const extra = ORDER_EXTRA[locale];
  return (
    <div className="container-x max-w-md py-12 text-center">
      <XCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
      <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">{extra.incompleteTitle}</h1>
      <p className="font-deva mt-2 text-sm text-brand-600">{extra.incompleteBody}</p>
      <Link
        href="/my-books"
        className="font-deva mt-6 inline-block rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white"
      >
        {extra.openMyBooks}
      </Link>
      <a
        href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}`}
        className="font-deva mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-teal hover:underline"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> {extra.needHelp}
      </a>
    </div>
  );
}

function SystemBusy({
  orderId,
  token,
  title,
  locale,
}: {
  orderId: string;
  token: string;
  title?: string;
  locale: Locale;
}) {
  const extra = ORDER_EXTRA[locale];
  return (
    <div className="container-x max-w-md py-12 text-center">
      <OrderMemory orderId={orderId} token={token} title={title ?? extra.yourOrder} />
      <Clock className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
      <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">{extra.busyTitle}</h1>
      <p className="font-deva mt-2 text-sm text-brand-600">{extra.busyBody}</p>
      <PendingRefresh maxTries={60} intervalMs={10000} gaveUpText={extra.gaveUp} />
    </div>
  );
}
