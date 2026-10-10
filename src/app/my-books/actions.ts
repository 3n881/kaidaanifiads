"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { isInteraktConfigured } from "@/lib/interakt";
import { normalizePhone } from "@/lib/orders";
import { sendOrderOnWhatsApp } from "@/lib/delivery";
import { normalizeLocale } from "@/lib/i18n";

const ERRORS = {
  mr: { invalid: "कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा.", unavailable: "ही सुविधा सध्या उपलब्ध नाही. कृपया WhatsApp सपोर्टशी संपर्क करा.", failed: "लुकअप अयशस्वी. कृपया पुन्हा प्रयत्न करा." },
  hi: { invalid: "कृपया सही 10 अंकों का व्हॉट्सऐप नंबर भरें।", unavailable: "यह सुविधा अभी उपलब्ध नहीं है। कृपया WhatsApp सपोर्ट से संपर्क करें।", failed: "खोज नहीं हो सकी। कृपया फिर से कोशिश करें।" },
  en: { invalid: "Please enter a valid 10-digit WhatsApp number.", unavailable: "This service is not available right now. Please contact WhatsApp support.", failed: "Lookup failed. Please try again." },
} as const;

// Max orders re-sent per request (bounds cost if someone owns many orders).
const MAX_ORDERS_PER_REQUEST = 10;

/**
 * Sends the buyer's order links to their own WhatsApp number. Never returns
 * links or purchase details to the browser, so typing someone else's number
 * reveals nothing — only the number's owner receives the messages. The reply
 * is identical whether or not purchases exist (no enumeration). Each order's
 * WhatsApp sends are capped in the database.
 */
export async function sendMyBooks(
  whatsapp: string,
  locale?: string,
): Promise<{ error?: string; ok?: boolean }> {
  const e = ERRORS[normalizeLocale(locale)];
  const phone = normalizePhone(whatsapp);
  if (!phone) return { error: e.invalid };
  if (!hasServiceRole || !isInteraktConfigured) {
    return { error: e.unavailable };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .or(`whatsapp_number.eq.${phone},buyer_contact.eq.${phone}`)
    .order("created_at", { ascending: false })
    .limit(MAX_ORDERS_PER_REQUEST);

  if (error) {
    console.error("[my-books] lookup failed", error.message);
    return { error: e.failed };
  }

  for (const order of data ?? []) {
    try {
      await sendOrderOnWhatsApp(order.id, { phone });
    } catch (sendError) {
      console.error("[my-books] send failed", sendError);
    }
  }
  return { ok: true };
}
