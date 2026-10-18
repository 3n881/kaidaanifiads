import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";

// ---------------------------------------------------------------------------
// Record of every WhatsApp message sent through Interakt (migration 014):
// shown in /dashboard/whatsapp and on each order's page. Logging is best
// effort — it never blocks or fails a send.
// ---------------------------------------------------------------------------

export type WhatsAppKind = "pdf" | "reminder" | "reminder_admin" | "offer";

export interface WhatsAppLogRow {
  id: string;
  created_at: string;
  order_id: string | null;
  lead_id: string | null;
  phone: string;
  name: string | null;
  product_id: number | null;
  kind: WhatsAppKind;
  template: string | null;
  step: number | null;
  ok: boolean;
  sent_by: string;
}

export async function logWhatsApp(entry: {
  orderId?: string | null;
  leadId?: string | null;
  phone: string;
  name?: string | null;
  productId?: number | null;
  kind: WhatsAppKind;
  template?: string | null;
  step?: number | null;
  ok: boolean;
  by?: string;
}): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("whatsapp_log")
      .insert({
        order_id: entry.orderId ?? null,
        lead_id: entry.leadId ?? null,
        phone: entry.phone.replace(/\D/g, "").slice(-10),
        name: entry.name && entry.name !== "Guest" ? entry.name.slice(0, 80) : null,
        product_id: entry.productId ?? null,
        kind: entry.kind,
        template: entry.template ?? null,
        step: entry.step ?? null,
        ok: entry.ok,
        sent_by: entry.by || "auto",
      });
    // 42P01 = migration 014 not applied yet: sending still works.
    if (error && error.code !== "42P01") console.error("[whatsapp-log] not saved", error.message);
  } catch (error) {
    console.error("[whatsapp-log] not saved", error instanceof Error ? error.message : error);
  }
}

export const LOG_KINDS = ["all", "pdf", "reminder", "reminder_admin", "offer"] as const;
export type LogKindFilter = (typeof LOG_KINDS)[number];
const DAY_MS = 24 * 3600_000;

/** Admin-only: the message record, newest first (filters from the URL). */
export async function getWhatsAppLog(filters: { kind: LogKindFilter; period: "today" | "week" | "all"; failed: boolean; q: string }) {
  await requireAdmin();
  let query = getSupabaseAdmin().from("whatsapp_log").select("*").order("created_at", { ascending: false }).limit(500);
  if (filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.failed) query = query.eq("ok", false);
  if (filters.period !== "all") {
    const now = Date.now();
    const ist = 5.5 * 3600_000;
    const start = filters.period === "today" ? Math.floor((now + ist) / DAY_MS) * DAY_MS - ist : now - 7 * DAY_MS;
    query = query.gte("created_at", new Date(start).toISOString());
  }
  const digits = filters.q.replace(/\D/g, "").slice(-10);
  if (digits.length >= 3) query = query.ilike("phone", `%${digits}%`);
  else if (/\p{L}{2,}/u.test(filters.q)) query = query.ilike("name", `%${filters.q.replace(/[%_*,()"\\]/g, " ").trim()}%`);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [] as WhatsAppLogRow[];
    throw new Error(error.message);
  }
  return (data ?? []) as WhatsAppLogRow[];
}

/** Admin-only: messages for one order (order page timeline). */
export async function getOrderWhatsAppLog(orderId: string): Promise<WhatsAppLogRow[]> {
  await requireAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("whatsapp_log")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return [];
  return (data ?? []) as WhatsAppLogRow[];
}
