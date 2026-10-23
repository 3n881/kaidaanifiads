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

/**
 * What became of each refused book PDF / payment reminder in `rows`:
 * "open" = still worth sending again; "sent_later" = the same message for that
 * order went through afterwards; "settled" = no longer applies (a reminder
 * whose order is paid or closed, a PDF whose order isn't paid). Offers and
 * rows without an order get no state.
 */
export type RefusedState = "open" | "sent_later" | "settled";
const messageGroup = (kind: WhatsAppKind) => (kind === "pdf" ? "pdf" : "reminder");

export async function getRefusedStates(rows: WhatsAppLogRow[]): Promise<Map<string, RefusedState>> {
  await requireAdmin();
  const refused = rows.filter((r) => !r.ok && r.order_id && r.kind !== "offer");
  const states = new Map<string, RefusedState>();
  if (refused.length === 0) return states;
  const orderIds = [...new Set(refused.map((r) => r.order_id!))];
  const okRows: Array<{ order_id: string; kind: WhatsAppKind; created_at: string }> = [];
  const status = new Map<string, string>();
  for (let i = 0; i < orderIds.length; i += 100) {
    const chunk = orderIds.slice(i, i + 100);
    const [sent, orders] = await Promise.all([
      getSupabaseAdmin().from("whatsapp_log").select("order_id, kind, created_at").in("order_id", chunk).eq("ok", true),
      getSupabaseAdmin().from("orders").select("id, status").in("id", chunk),
    ]);
    if (sent.error) throw new Error(sent.error.message);
    if (orders.error) throw new Error(orders.error.message);
    okRows.push(...(sent.data ?? []));
    for (const o of orders.data ?? []) status.set(o.id, o.status);
  }
  for (const r of refused) {
    const group = messageGroup(r.kind);
    const later = okRows.some((o) => o.order_id === r.order_id && messageGroup(o.kind) === group && o.created_at > r.created_at);
    const orderStatus = status.get(r.order_id!);
    const applies = group === "pdf" ? orderStatus === "paid" : orderStatus === "created" || orderStatus === "failed";
    states.set(r.id, later ? "sent_later" : applies ? "open" : "settled");
  }
  return states;
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
