import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";

export interface AdminProduct {
  id: number;
  slug: string;
  title: string;
  title_mr: string | null;
  title_hi: string | null;
  title_en: string | null;
  short_description: string | null;
  short_description_mr: string | null;
  short_description_hi: string | null;
  short_description_en: string | null;
  description: string | null;
  description_mr: string | null;
  description_hi: string | null;
  description_en: string | null;
  mrp: number;
  price: number;
  pages: number | null;
  pages_mr: number | null;
  pages_hi: number | null;
  pages_en: number | null;
  language: string;
  is_combo: boolean;
  set_size: number | null;
  rating: number | null;
  category: string | null;
  cover_image: string | null;
  cover_image_mr: string | null;
  cover_image_hi: string | null;
  cover_image_en: string | null;
  pdf_path: string | null;
  pdf_path_mr: string | null;
  pdf_path_hi: string | null;
  pdf_path_en: string | null;
  gallery_images: string[] | null;
  gallery_images_mr: string[] | null;
  gallery_images_hi: string[] | null;
  gallery_images_en: string[] | null;
  available_locales: Array<"mr" | "hi" | "en"> | null;
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
  locale: "mr" | "hi" | "en";
  razorpay_payment_id: string | null;
  status: string;
  delivered: boolean | null;
  buyer_contact: string | null;
  download_count: number | null;
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

export interface ContactMessage {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  locale: string;
  handled: boolean;
}

/** Contact-page messages, newest first (admin inbox). */
export async function getContactMessages(limit = 200): Promise<ContactMessage[]> {
  await requireAdmin();
  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .select("id, created_at, name, email, phone, subject, message, locale, handled")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
}
