import { NextResponse, type NextRequest } from "next/server";
import { DatabaseUnavailableError } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { createRazorpayOrder, isRazorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { normalizeLocale } from "@/lib/i18n";
import { checkConsult } from "@/lib/consult-form";
import { CONSULT_PRICE } from "@/lib/consult-copy";
import { createConsultBooking, markConsultPaid, setConsultRazorpayOrder } from "@/lib/consultations";
import { cleanId, cleanVisitSource } from "@/lib/visit-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A real buyer books once or twice; more from one address in 10 min is a bot.
const LIMIT = 6;
const WINDOW_MS = 10 * 60_000;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

const BUSY = "बुकिंग सध्या घेता आले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.";

/**
 * POST /api/consultations — a ₹999 consultation booking from /consultation.
 * Body: { form fields…, productId?, locale, visit? }. The price comes from the
 * server. Answers the booking number + a Razorpay order for the page to open.
 */
export async function POST(req: NextRequest) {
  if (!hasServiceRole) return NextResponse.json({ error: BUSY }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { form, bad } = checkConsult(body);
  if (bad.length) return NextResponse.json({ error: "form", fields: bad }, { status: 400 });

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: BUSY }, { status: 429 });

  const productId = Number.isInteger(Number(body.productId)) && Number(body.productId) > 0 ? Number(body.productId) : null;
  const visit = body.visit && typeof body.visit === "object" ? (body.visit as Record<string, unknown>) : null;
  const visitId = visit ? cleanId(visit.visitId) : null;

  try {
    const booking = await createConsultBooking({
      form,
      productId,
      locale: normalizeLocale(body.locale),
      amount: CONSULT_PRICE,
      visit: visit && visitId ? { visit_id: visitId, ...cleanVisitSource(visit) } : null,
    });

    if (!isRazorpayConfigured) {
      // Local development without Razorpay keys only: pretend it was paid.
      if (process.env.NODE_ENV === "production") return NextResponse.json({ error: BUSY }, { status: 503 });
      const fakeId = `demo_${booking.id}`;
      await setConsultRazorpayOrder(booking.id, fakeId);
      await markConsultPaid({ razorpayOrderId: fakeId, razorpayPaymentId: "demo" });
      return NextResponse.json({ bookingNo: booking.bookingNo, bookingId: booking.id, demo: true });
    }

    const rzp = await createRazorpayOrder(CONSULT_PRICE, booking.id);
    await setConsultRazorpayOrder(booking.id, rzp.id);
    return NextResponse.json({
      bookingNo: booking.bookingNo,
      bookingId: booking.id,
      razorpay: {
        keyId: razorpayKeyId,
        orderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        prefill: { name: form.name, contact: `+91${form.phone}` },
      },
    });
  } catch (error) {
    console.error("[consult] booking failed", error instanceof DatabaseUnavailableError ? error.message : error);
    return NextResponse.json({ error: BUSY }, { status: 503 });
  }
}
