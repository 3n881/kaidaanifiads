import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, MessageCircle, XCircle } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getDeliverableItems } from "@/lib/orders";
import { SITE } from "@/data/catalog";
import { OrderMemory, PendingRefresh, WhatsAppOptIn } from "@/components/order/OrderClient";
import InAppBrowserHint from "@/components/order/InAppBrowserHint";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "तुमची ऑर्डर",
  robots: { index: false, follow: false },
  // The URL carries the order access token — never leak it via Referer.
  referrer: "no-referrer",
};

const ABANDONED_AFTER_MS = 30 * 60 * 1000;

function isAbandoned(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > ABANDONED_AFTER_MS;
}

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/order/[orderId]">) {
  const { orderId } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  if (!hasServiceRole || !verifyOrderAccessToken(orderId, token)) notFound();

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, amount, created_at, product_id, whatsapp_number, products(title, slug, is_combo)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();

  const product = (Array.isArray(order.products) ? order.products[0] : order.products) as
    | { title: string; slug: string; is_combo: boolean }
    | null;
  const title = product?.title ?? "पुस्तक";
  const supportHref = `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Order ${orderId.slice(0, 8)} — download help`,
  )}`;

  if (order.status !== "paid") {
    // An unpaid order older than 30 min was abandoned (popup closed, UPI
    // cancelled) — stop polling and offer a retry instead.
    const failed = order.status === "failed" || isAbandoned(order.created_at);
    return (
      <div className="container-x max-w-md py-12 text-center">
        <OrderMemory orderId={orderId} token={token} title={title} />
        {failed ? (
          <XCircle className="mx-auto h-12 w-12 text-danger-600" aria-hidden="true" />
        ) : (
          <Clock className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        )}
        <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">
          {failed ? "पेमेंट पूर्ण झाले नाही" : "पेमेंटची पुष्टी होत आहे…"}
        </h1>
        <p className="font-deva mt-2 text-sm text-brand-600">{title}</p>
        {failed ? (
          product?.slug && (
            <Link
              href={`/${product.is_combo ? "combos" : "ebooks"}/${product.slug}`}
              className="font-deva mt-6 inline-block rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white"
            >
              पुन्हा प्रयत्न करा
            </Link>
          )
        ) : (
          <PendingRefresh />
        )}
        <a href={supportHref} className="font-deva mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal hover:underline">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> मदत हवी आहे? WhatsApp करा
        </a>
      </div>
    );
  }

  const items = await getDeliverableItems(order.product_id);
  const downloadHref = (itemId: number) =>
    `/api/download/${orderId}?t=${token}&item=${itemId}`;

  return (
    <div className="container-x max-w-md py-10">
      <OrderMemory
        orderId={orderId}
        token={token}
        title={title}
        autoDownloadHref={items.length === 1 ? downloadHref(items[0].id) : undefined}
      />
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">
          पेमेंट यशस्वी झाले!
        </h1>
        <p className="font-deva mt-1 text-sm text-brand-600">
          {items.length === 1
            ? "तुमचे डाउनलोड सुरू झाले आहे. न झाल्यास खालील बटन दाबा."
            : "खालील प्रत्येक पुस्तक डाउनलोड करा."}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <InAppBrowserHint />
        {items.length === 0 && (
          <p className="font-deva rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            पेमेंट मिळाले आहे. फाइल तयार होत आहे — कृपया WhatsApp सपोर्टशी संपर्क करा.
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
        <p className="font-deva text-center text-[11px] text-brand-500">
          हे पान bookmark करा — पुन्हा डाउनलोड करण्यासाठी कधीही उघडा. हे पान “माझी
          पुस्तके” मध्येही सेव्ह झाले आहे.
        </p>
        {!order.whatsapp_number && <WhatsAppOptIn orderId={orderId} token={token} />}
        <a href={supportHref} className="font-deva flex items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-brand-teal hover:underline">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> डाउनलोडमध्ये अडचण? WhatsApp करा
        </a>
      </div>
    </div>
  );
}
