"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { normalizeLocale, type Locale } from "@/lib/i18n";

// Per sender IP: at most this many messages per hour (stops form spam).
const MAX_PER_HOUR = 5;

export type ContactResult = { ok: true } | { error: string };

const ERRORS = {
  mr: {
    name: "कृपया तुमचे नाव भरा.",
    contact: "कृपया वैध ईमेल किंवा १० अंकी मोबाईल नंबर भरा.",
    message: "कृपया तुमचा संदेश लिहा (किमान 5 अक्षरे).",
    tooMany: "खूप संदेश पाठवले गेले. कृपया थोड्या वेळाने प्रयत्न करा किंवा WhatsApp करा.",
    failed: "संदेश पाठवता आला नाही. कृपया पुन्हा प्रयत्न करा किंवा WhatsApp करा.",
  },
  hi: {
    name: "कृपया अपना नाम भरें।",
    contact: "कृपया सही ईमेल या 10 अंकों का मोबाइल नंबर भरें।",
    message: "कृपया अपना संदेश लिखें (कम से कम 5 अक्षर)।",
    tooMany: "बहुत सारे संदेश भेजे गए। कृपया थोड़ी देर बाद कोशिश करें या WhatsApp करें।",
    failed: "संदेश नहीं भेजा जा सका। कृपया फिर से कोशिश करें या WhatsApp करें।",
  },
  en: {
    name: "Please enter your name.",
    contact: "Please enter a valid email or a 10-digit mobile number.",
    message: "Please write your message (at least 5 characters).",
    tooMany: "Too many messages. Please try again later or message us on WhatsApp.",
    failed: "Your message could not be sent. Please try again or message us on WhatsApp.",
  },
} satisfies Record<Locale, Record<string, string>>;

const clean = (value: FormDataEntryValue | null, max: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Saves a Contact-page message for the admin inbox (/dashboard/messages). */
export async function sendContactMessage(form: FormData): Promise<ContactResult> {
  const locale = normalizeLocale(form.get("locale"));
  const e = ERRORS[locale];

  // Honeypot: real visitors never see or fill this field.
  if (clean(form.get("website"), 200)) return { ok: true };

  const name = clean(form.get("name"), 80);
  const email = clean(form.get("email"), 120).toLowerCase();
  const phone = clean(form.get("phone"), 20).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const subject = clean(form.get("subject"), 120);
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);

  if (name.length < 2) return { error: e.name };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  if (!emailOk && !phoneOk) return { error: e.contact };
  if (message.length < 5) return { error: e.message };
  if (!hasServiceRole) return { error: e.failed };

  const h = await headers();
  const ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countError) {
    console.error("[contact] rate check failed", countError.message);
    return { error: e.failed };
  }
  if ((count ?? 0) >= MAX_PER_HOUR) return { error: e.tooMany };

  const { error } = await admin.from("contact_messages").insert({
    name,
    email: emailOk ? email : null,
    phone: phoneOk ? phone : null,
    subject: subject || null,
    message,
    locale,
    ip_hash: ipHash,
  });
  if (error) {
    console.error("[contact] insert failed", error.message);
    return { error: e.failed };
  }
  return { ok: true };
}
