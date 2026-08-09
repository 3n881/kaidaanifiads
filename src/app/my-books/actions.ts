"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { createSignedPdfUrl } from "@/lib/delivery";

export interface PurchasedBook {
  id: string;
  title: string;
  slug: string | null;
  isCombo: boolean;
  amount: number;
  createdAt: string;
  downloadUrl: string | null;
}

interface OrderRow {
  id: string;
  amount: number;
  created_at: string;
  download_url: string | null;
  products:
    | { title: string; slug: string; is_combo: boolean; pdf_path: string | null }
    | { title: string; slug: string; is_combo: boolean; pdf_path: string | null }[]
    | null;
}

export async function lookupOrders(
  whatsapp: string,
): Promise<{ error?: string; orders: PurchasedBook[] }> {
  const phone = (whatsapp ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { error: "कृपया वैध १० अंकी व्हॉट्सॲप नंबर भरा.", orders: [] };
  }
  if (!hasServiceRole) return { orders: [] };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select(
      "id, amount, created_at, download_url, products(title, slug, is_combo, pdf_path)",
    )
    .eq("whatsapp_number", phone)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) return { error: "लुकअप अयशस्वी.", orders: [] };

  const rows = (data ?? []) as unknown as OrderRow[];
  const orders = await Promise.all(
    rows.map(async (o) => {
      const p = Array.isArray(o.products) ? o.products[0] : o.products;
      // Regenerate a fresh signed URL (stored one may have expired).
      const downloadUrl = p?.pdf_path
        ? await createSignedPdfUrl(p.pdf_path)
        : o.download_url;
      return {
        id: o.id,
        title: p?.title ?? "पुस्तक",
        slug: p?.slug ?? null,
        isCombo: p?.is_combo ?? false,
        amount: o.amount,
        createdAt: o.created_at,
        downloadUrl,
      };
    }),
  );

  return { orders };
}
