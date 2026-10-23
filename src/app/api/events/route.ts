import { after, NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { isPrivatePath } from "@/lib/meta-pixel";
import { VISIT_EVENTS, cleanId, cleanVisitSource, isMissingSchema } from "@/lib/visit-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP limit, in memory on this server (one Lightsail box): a real visit sends
// a handful of events; anything far above that is a bot or a loop.
const LIMIT_PER_MINUTE = 60;
const hits = new Map<string, { minute: number; count: number }>();
// Crawlers, link previews and speed tests aren't visitors.
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|pagespeed|headless|python|curl|wget|k6\//i;
// Migration 016 not run yet → don't ask the database again for 5 minutes.
let missingUntil = 0;

function limited(ip: string): boolean {
  const minute = Math.floor(Date.now() / 60000);
  const entry = hits.get(ip);
  if (!entry || entry.minute !== minute) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { minute, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > LIMIT_PER_MINUTE;
}

/**
 * POST /api/events — one funnel step from the public site (navigator.sendBeacon).
 * Body: { name, visitorId, visitId, path, productId?, utm_*?, from_ad?, referrer_host? }
 * Always answers 204 at once; the row is written after the response.
 */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!hasServiceRole || Date.now() < missingUntil) return done;
  if (BOT_RE.test(req.headers.get("user-agent") ?? "")) return done;
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return new NextResponse(null, { status: 429 });

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return done;
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return done;
  }
  const name = VISIT_EVENTS.find((e) => e === body.name);
  const visitorId = cleanId(body.visitorId);
  const visitId = cleanId(body.visitId);
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;
  if (!name || !visitorId || !visitId || (path && isPrivatePath(path))) return done;
  const productId = Number.isInteger(body.productId) && Number(body.productId) > 0 ? Number(body.productId) : null;

  const row = { name, visitor_id: visitorId, visit_id: visitId, path, product_id: productId, ...cleanVisitSource(body) };
  after(async () => {
    try {
      const { error } = await getSupabaseAdmin().from("events").insert(row);
      if (error && isMissingSchema(error.code)) missingUntil = Date.now() + 5 * 60 * 1000;
      else if (error) console.error("[events] not saved", error.code, error.message);
    } catch (error) {
      console.error("[events] not saved", error instanceof Error ? error.message : error);
    }
  });
  return done;
}
