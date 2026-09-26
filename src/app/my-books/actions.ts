"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { isInteraktConfigured } from "@/lib/interakt";
import { normalizePhone } from "@/lib/orders";
import { sendOrderOnWhatsApp } from "@/lib/delivery";

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
): Promise<{ error?: string; ok?: boolean }> {
  const phone = normalizePhone(whatsapp);
  if (!phone) return { error: "कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा." };
  if (!hasServiceRole || !isInteraktConfigured) {
    return { error: "ही सुविधा सध्या उपलब्ध नाही. कृपया WhatsApp सपोर्टशी संपर्क करा." };
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
    return { error: "लुकअप अयशस्वी. कृपया पुन्हा प्रयत्न करा." };
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
