import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { saveLead } from "@/lib/leads";
import { normalizePhone } from "@/lib/orders";
import { isLocale } from "@/lib/i18n";
import { DatabaseUnavailableError } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/leads — "Get offers and new books on WhatsApp" box shown after a
 * visitor closes Razorpay without paying. Needs the consent box ticked.
 * Body: { phone, productId, locale, source, consent: true, website (honeypot) }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // Bots fill every field; people never see this one.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: "phone" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "consent" }, { status: 400 });
  const locale = isLocale(body.locale) ? body.locale : "mr";
  const productId = Number.isInteger(body.productId) ? Number(body.productId) : null;
  const source = body.source === "failed" ? "failed" : "cancelled";

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

  try {
    const result = await saveLead({ phone, productId, locale, source, ipHash });
    if (result === "rate_limited") return NextResponse.json({ error: "busy" }, { status: 429 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[leads] save failed", error instanceof DatabaseUnavailableError ? error.message : error);
    return NextResponse.json({ error: "busy" }, { status: 503 });
  }
}
