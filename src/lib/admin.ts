import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";

export interface AdminProduct {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  mrp: number;
  price: number;
  pages: number | null;
  language: string;
  is_combo: boolean;
  set_size: number | null;
  rating: number | null;
  category: string | null;
  cover_image: string | null;
  pdf_path: string | null;
  featured: boolean | null;
  active: boolean | null;
  sort_order: number | null;
}

export interface AdminOrder {
  id: string;
  name: string;
  whatsapp_number: string;
  product_id: number | null;
  amount: number;
  razorpay_payment_id: string | null;
  status: string;
  delivered: boolean | null;
  created_at: string;
}

export interface StoreSettings {
  business: Record<string, string | boolean>;
  content: Record<string, string | boolean>;
  integrations: Record<string, string | boolean>;
  launch: Record<string, string | boolean>;
}

const EMPTY_SETTINGS: StoreSettings = {
  business: {},
  content: {},
  integrations: {},
  launch: {},
};

export async function getStoreSettings(): Promise<StoreSettings> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("store_settings")
    .select("business, content, integrations, launch")
    .eq("id", "main")
    .maybeSingle();
  if (error || !data) return EMPTY_SETTINGS;
  return {
    business: (data.business ?? {}) as StoreSettings["business"],
    content: (data.content ?? {}) as StoreSettings["content"],
    integrations: (data.integrations ?? {}) as StoreSettings["integrations"],
    launch: (data.launch ?? {}) as StoreSettings["launch"],
  };
}

/** All products for the admin table (includes inactive). Admin-guarded. */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .order("is_combo", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: false });
  if (error) throw error;
  return data as AdminProduct[];
}

export async function getAdminProductById(
  id: number,
): Promise<AdminProduct | null> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminProduct) ?? null;
}

/** Next available product id (ids aren't auto-generated so we compute max+1). */
export async function nextProductId(): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("products")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  const max = data?.[0]?.id ?? 0;
  return Number(max) + 1;
}

/** Ebooks (non-combos) as options for the combo membership picker. */
export async function getEbookOptions(): Promise<
  { id: number; title: string }[]
> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("products")
    .select("id, title")
    .eq("is_combo", false)
    .order("id", { ascending: false });
  return (data as { id: number; title: string }[]) ?? [];
}

/** Product ids currently assigned to a combo. */
export async function getComboItemIds(comboId: number): Promise<number[]> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("combo_items")
    .select("product_id")
    .eq("combo_id", comboId);
  return (data as { product_id: number }[] | null)?.map((r) => r.product_id) ?? [];
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as AdminOrder[]) ?? [];
}
