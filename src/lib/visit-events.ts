import "server-only";

// Server side of the first-party visit funnel (migration 016): checks what the
// browser sends (src/lib/visit-tracking.ts) before it is stored.

export const VISIT_EVENTS = ["visit", "book_view", "buy_tap", "details", "razorpay_open"] as const;

/** Missing table/column/function (migration 016 not run yet): tracking is skipped, nothing breaks. */
export const isMissingSchema = (code: string | undefined) =>
  code === "42P01" || code === "42703" || code === "42883" || code === "PGRST205" || code === "PGRST202" || code === "PGRST204";

const ID_RE = /^[\w-]{8,64}$/;
const text = (v: unknown, max = 100) => {
  if (typeof v !== "string") return null;
  // Tags are labels, not messages: printable characters only.
  const s = v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return s || null;
};

export const cleanId = (v: unknown) => (typeof v === "string" && ID_RE.test(v) ? v : null);

/** utm_* tags, ad-click flag and referring site, as stored on events and orders. */
export function cleanVisitSource(body: Record<string, unknown>) {
  const referrer = text(body.referrer_host);
  return {
    utm_source: text(body.utm_source)?.toLowerCase() ?? null,
    utm_medium: text(body.utm_medium)?.toLowerCase() ?? null,
    utm_campaign: text(body.utm_campaign),
    utm_content: text(body.utm_content),
    from_ad: body.from_ad === true,
    referrer_host: referrer && /^[a-z0-9.-]+$/i.test(referrer) ? referrer.toLowerCase() : null,
  };
}
