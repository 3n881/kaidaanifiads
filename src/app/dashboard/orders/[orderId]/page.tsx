import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import OrderActions from "@/components/admin/OrderActions";
import { getAdminProducts } from "@/lib/admin";
import { orderPageUrl } from "@/lib/orders";
import { getOrderDetail, SALES_START } from "@/lib/sales";
import { getOrderWhatsAppLog } from "@/lib/whatsapp-log";

export const metadata: Metadata = { title: "Admin — Order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LANGUAGE: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };
const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?=[6-9]\d{9}$)/, "91")}`;

export default async function OrderDetailPage({ params }: PageProps<"/dashboard/orders/[orderId]">) {
  const { orderId } = await params;
  const [order, products, messages] = await Promise.all([getOrderDetail(orderId), getAdminProducts(), getOrderWhatsAppLog(orderId)]);
  if (!order) notFound();

  const product = products.find((p) => p.id === order.product_id);
  const book = product ? `#${product.id} ${product.title_mr || product.title}` : order.product_id ? `#${order.product_id}` : "—";
  const phone = order.buyer_contact || order.whatsapp_number;
  const paid = order.status === "paid";
  const isTest = order.created_at < SALES_START;
  const refunded = Number(order.refunded_amount || 0);
  const status = order.refund_status
    ? { label: order.refund_status === "full" ? "Refunded" : "Part refunded", className: "bg-purple-100 text-purple-700" }
    : paid ? { label: "Paid", className: "bg-green-100 text-green-700" }
    : order.status === "failed" ? { label: "Failed", className: "bg-danger-500/10 text-danger-600" }
    : { label: "Not paid", className: "bg-brand-100 text-brand-600" };

  // Colour = meaning: green success, red failure, amber waiting/attention,
  // purple refund, blue neutral start.
  type Tone = "neutral" | "success" | "danger" | "warning" | "refund";
  const timeline: Array<{ at: string | null; text: string; tone: Tone; label?: string }> = [];
  timeline.push({ at: order.created_at, text: "Buy tapped — Razorpay opened", tone: "neutral" });
  if (paid) timeline.push({ at: order.paid_at, text: `Paid ₹${order.amount}`, tone: "success" });
  else if (order.status === "failed") timeline.push({ at: null, text: "Payment failed (declined or cancelled at Razorpay)", tone: "danger" });
  else timeline.push({ at: null, text: "Not paid — Razorpay was closed or the payment is still pending", tone: "warning" });
  // WhatsApp messages from the record (since 18 Oct); older orders show the summary line instead.
  const KIND_TEXT = { pdf: "Book PDF sent on WhatsApp", reminder: "Payment reminder sent on WhatsApp", reminder_admin: "Payment reminder sent on WhatsApp", offer: "Offer sent on WhatsApp" } as const;
  for (const m of messages) {
    const who = m.sent_by === "auto" ? (m.kind === "reminder" && m.step ? ` (automatic #${m.step})` : " (automatic)") : ` (by ${m.sent_by})`;
    timeline.push({ at: m.created_at, text: m.ok ? `${KIND_TEXT[m.kind]}${who}` : `WhatsApp refused: ${KIND_TEXT[m.kind].toLowerCase()}${who}`, tone: m.ok ? (m.kind === "pdf" ? "success" : "warning") : "danger", label: m.kind === "pdf" ? "WhatsApp" : "Reminder" });
  }
  const loggedReminders = messages.some((m) => m.kind === "reminder");
  if (order.reminder_sent_at && !loggedReminders) timeline.push({ at: order.reminder_sent_at, text: (order.reminder_count ?? 0) > 1 && (order.reminder_count ?? 0) <= 4 && order.reminder_last_at ? `Payment reminders sent on WhatsApp: ${order.reminder_count}× (last one ${new Date(order.reminder_last_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })})` : "Payment reminder sent on WhatsApp", tone: "warning", label: "Reminder" });
  if (paid) {
    timeline.push(order.whatsapp_sends
      ? { at: null, text: `PDF sent on WhatsApp (${order.whatsapp_sends}×)`, tone: "success" }
      : { at: null, text: "PDF not sent on WhatsApp yet — use Resend", tone: "danger" });
    timeline.push(order.download_count
      ? { at: order.last_downloaded_at, text: `Downloaded (${order.download_count} total, last one shown)`, tone: "success" }
      : { at: null, text: "Not downloaded yet — follow up on WhatsApp", tone: "danger" });
  }
  if (refunded > 0) timeline.push({ at: order.refunded_at, text: `Refund ₹${refunded}${order.refund_status === "full" ? " (full)" : " (partial)"}`, tone: "refund" });
  const TONE: Record<Tone, { dot: string; text: string; chip: string; label: string }> = {
    neutral: { dot: "bg-blue-500", text: "text-brand-900", chip: "bg-blue-50 text-blue-700", label: "Start" },
    success: { dot: "bg-green-600", text: "text-green-800", chip: "bg-green-100 text-green-700", label: "Done" },
    danger: { dot: "bg-red-600", text: "text-red-800", chip: "bg-red-100 text-red-700", label: "Problem" },
    warning: { dot: "bg-amber-500", text: "text-amber-800", chip: "bg-amber-100 text-amber-800", label: "Waiting" },
    refund: { dot: "bg-purple-600", text: "text-purple-800", chip: "bg-purple-100 text-purple-700", label: "Refund" },
  };

  return (
    <AdminShell active="orders" title="Order details">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-xs font-bold text-brand-teal"><ArrowLeft className="h-3.5 w-3.5" /> All orders</Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Summary */}
          <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-deva text-lg font-extrabold text-brand-900">{book}</h2>
                <p className="font-deva mt-1 text-sm text-brand-500">{LANGUAGE[order.locale ?? "mr"] ?? order.locale} edition · ₹{order.amount}{refunded ? ` · −₹${refunded} refunded` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {isTest && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Test (before live)</span>}
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
              </div>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Fact label="Buyer name">{order.name && order.name !== "Guest" ? <span className="font-deva">{order.name}</span> : "—"}</Fact>
              <Fact label="Buyer phone">
                {phone ? <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-700"><MessageCircle className="h-3.5 w-3.5" /> {phone}</a> : "—"}
              </Fact>
              <Fact label="Buyer email">{order.buyer_email || "—"}</Fact>
              <Fact label="Downloads">{order.download_count ?? 0}{order.last_downloaded_at ? ` · last ${ist(order.last_downloaded_at)}` : ""}</Fact>
              <Fact label="WhatsApp PDF">{order.whatsapp_sends ? `Sent ${order.whatsapp_sends}×` : "Not sent"}</Fact>
              <Fact label="Ordered">{ist(order.created_at)}</Fact>
              <Fact label="Paid">{ist(order.paid_at)}</Fact>
              {refunded > 0 && <Fact label="Refunded">₹{refunded} · {ist(order.refunded_at)}</Fact>}
              {order.razorpay_refund_id && <Fact label="Refund id"><span className="font-mono text-xs">{order.razorpay_refund_id}</span></Fact>}
            </dl>
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-brand-900">Timeline</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-brand-100 pl-4">
              {timeline.map((e, i) => (
                <li key={`${i}-${e.text}`} className="relative">
                  <span className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${TONE[e.tone].dot}`} aria-hidden="true" />
                  <p className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${TONE[e.tone].text}`}>
                    {e.text}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[e.tone].chip}`}>{e.label ?? TONE[e.tone].label}</span>
                  </p>
                  {e.at && <p className="text-xs text-brand-500">{ist(e.at)}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-brand-900">Actions</h2>
            <div className="mt-3">
              <OrderActions orderId={order.id} paid={paid} buyerLink={paid ? orderPageUrl(order.id) : null} />
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-5 text-sm shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-brand-900">Razorpay</h2>
            <dl className="mt-3 space-y-2">
              <Fact label="Payment id">
                {order.razorpay_payment_id ? (
                  <a href={`https://dashboard.razorpay.com/app/payments/${order.razorpay_payment_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand-teal underline">
                    {order.razorpay_payment_id} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : "—"}
              </Fact>
              <Fact label="Razorpay order id"><span className="font-mono text-xs">{order.razorpay_order_id || "—"}</span></Fact>
              <Fact label="Our order id"><span className="font-mono text-xs">{order.id}</span></Fact>
            </dl>
            <p className="mt-3 text-[11px] text-brand-400">Refund in the Razorpay dashboard (Payments → this payment → Refund). It shows here automatically, or press Check with Razorpay.</p>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">{label}</dt>
      <dd className="mt-0.5 text-brand-800">{children}</dd>
    </div>
  );
}
