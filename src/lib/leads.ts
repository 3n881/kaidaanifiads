import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { isLeadFollowupConfigured, sendLeadFollowup } from "./interakt";
import { localizedTitle, normalizeLocale, type Locale } from "./i18n";
import { LEAD_CONSENT_TEXT } from "./lead-copy";

// ---------------------------------------------------------------------------
// Interested buyers (migration 009). A visitor who closed Razorpay without
// paying may leave a WhatsApp number + explicit consent for offers / new
// books. One row per phone. The cron sends ONE next-day follow-up (marketing
// template, off until INTERAKT_LEAD_TEMPLATE_NAME is set).
// ---------------------------------------------------------------------------

const MAX_PER_IP_PER_HOUR = 5;
const FOLLOWUP_AFTER_HOURS = 20; // "next day"
const FOLLOWUP_WINDOW_HOURS = 72; // never follow up on an old sign-up

export async function saveLead(input: {
  phone: string;
  productId: number | null;
  locale: Locale;
  source: "cancelled" | "failed" | "checkout";
  ipHash: string | null;
  /** Exact sentence agreed to (defaults to the after-cancel box text). */
  consentText?: string;
}): Promise<"saved" | "rate_limited"> {
  const admin = getSupabaseAdmin();
  if (input.ipHash) {
    const { count, error } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", input.ipHash)
      .gte("updated_at", new Date(Date.now() - 3600_000).toISOString());
    if (error) throw new DatabaseUnavailableError("lead rate limit", error);
    if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) return "rate_limited";
  }
  const now = new Date().toISOString();
  const { error } = await admin.from("leads").upsert(
    {
      phone: input.phone,
      product_id: input.productId,
      locale: input.locale,
      source: input.source,
      consent_at: now,
      consent_text: input.consentText ?? LEAD_CONSENT_TEXT[input.locale],
      ip_hash: input.ipHash,
      updated_at: now,
      opted_out_at: null, // signing up again = consent given again
    },
    { onConflict: "phone" },
  );
  if (error) throw new DatabaseUnavailableError("save lead", error);
  return "saved";
}

interface LeadRow {
  id: string;
  phone: string;
  product_id: number | null;
  locale: string;
  created_at: string;
}

/**
 * Run by the cron: one follow-up per lead, about a day after sign-up. Skipped
 * when the person has bought since, or got a payment reminder in the last day
 * (never two messages the same day).
 */
export async function sendLeadFollowups(): Promise<{ due: number; sent: number }> {
  if (!isLeadFollowupConfigured) return { due: 0, sent: 0 };
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const { data, error } = await admin
    .from("leads")
    .select("id, phone, product_id, locale, created_at")
    .is("followup_sent_at", null)
    .is("opted_out_at", null)
    .lte("created_at", new Date(now - FOLLOWUP_AFTER_HOURS * 3600_000).toISOString())
    .gte("created_at", new Date(now - FOLLOWUP_WINDOW_HOURS * 3600_000).toISOString())
    .limit(200);
  if (error) throw new DatabaseUnavailableError("lead follow-up candidates", error);
  const due = (data ?? []) as LeadRow[];

  let sent = 0;
  for (const lead of due) {
    // Claim first so overlapping sweeps never double-send.
    const { data: claimed, error: claimError } = await admin
      .from("leads")
      .update({ followup_sent_at: new Date().toISOString() })
      .eq("id", lead.id)
      .is("followup_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw new DatabaseUnavailableError("claim lead follow-up", claimError);
    if (!claimed) continue;

    const dayAgo = new Date(now - 24 * 3600_000).toISOString();
    const { count, error: countError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_contact", lead.phone)
      .or(`and(status.eq.paid,created_at.gte.${lead.created_at}),reminder_sent_at.gte.${dayAgo}`);
    if (countError) throw new DatabaseUnavailableError("lead follow-up check", countError);
    if ((count ?? 0) > 0) continue;

    const { data: product } = await admin
      .from("products")
      .select("slug, is_combo, title, title_mr, title_hi, title_en")
      .eq("id", lead.product_id ?? -1)
      .maybeSingle();
    const locale = normalizeLocale(lead.locale);
    const base = SITE_URL.replace(/\/$/, "");
    const ok = await sendLeadFollowup({
      phone: lead.phone,
      productTitle: product ? localizedTitle(product, locale) : "कायद्याचं आणि फायद्याचं",
      productLink: product ? `${base}/${product.is_combo ? "combos" : "ebooks"}/${product.slug}` : `${base}/ebooks`,
      locale,
    });
    if (ok) sent++;
  }
  return { due: due.length, sent };
}
