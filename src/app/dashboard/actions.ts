"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { nextProductId } from "@/lib/admin";
import { purgePublicPages } from "@/lib/cdn";
import { COVER_WIDTHS, coverVariantPath } from "@/lib/covers";

async function revalidatePublic(slug?: string, isCombo?: boolean) {
  revalidatePath("/");
  revalidatePath("/ebooks");
  revalidatePath("/combos");
  if (slug) revalidatePath(`/${isCombo ? "combos" : "ebooks"}/${slug}`);
  revalidatePath("/dashboard");
  // /ebooks and /combos prefixes cover every detail page and RSC variant.
  await purgePublicPages(["/", "/ebooks", "/combos"]);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uploadFile(
  bucket: "covers" | "pdfs",
  file: File,
  slug: string,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const isCover = bucket === "covers";
  const maxBytes = isCover ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`${isCover ? "Image" : "PDF"} must be smaller than ${isCover ? 5 : 50} MB`);
  }
  if (isCover && !file.type.startsWith("image/")) {
    throw new Error("Cover must be an image file");
  }
  if (!isCover && file.type !== "application/pdf") {
    throw new Error("Ebook file must be a PDF");
  }
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${slug}-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  if (bucket === "covers") {
    return admin.storage.from("covers").getPublicUrl(path).data.publicUrl;
  }
  return path; // private PDF: store the path, sign it at delivery time
}

/**
 * Product covers: resized to 200/400/800 px WebP at upload so phones never
 * download the multi-MB original. Names are versioned (`slug-v<ts>-<w>.webp`)
 * and cached for a year — a new upload gets a new URL, so no purge needed.
 * Returns the public URL of the 800 px variant (the others are derived).
 */
async function uploadCover(file: File, slug: string): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    throw new Error("Cover must be an image under 5 MB");
  }
  const admin = getSupabaseAdmin();
  const input = Buffer.from(await file.arrayBuffer());
  const base = `${slug}-v${Date.now()}`;
  for (const width of COVER_WIDTHS) {
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const { error } = await admin.storage
      .from("covers")
      .upload(coverVariantPath(base, width), output, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw new Error(`Cover upload failed: ${error.message}`);
  }
  return admin.storage.from("covers").getPublicUrl(coverVariantPath(base, 800)).data
    .publicUrl;
}

/** Create or update a product from the admin form. */
export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const admin = getSupabaseAdmin();

  const idRaw = formData.get("id");
  const isEdit = idRaw !== null && String(idRaw).length > 0;
  const id = isEdit ? Number(idRaw) : await nextProductId();

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");

  const slug =
    String(formData.get("slug") || "").trim() || slugify(title) || `book-${id}`;
  const isCombo = formData.get("is_combo") === "on";

  const row: Record<string, unknown> = {
    id,
    slug,
    title,
    short_description: String(formData.get("short_description") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    mrp: Number(formData.get("mrp") || 0),
    price: Number(formData.get("price") || 0),
    pages: Number(formData.get("pages") || 0),
    language: String(formData.get("language") || "Marathi"),
    is_combo: isCombo,
    set_size: isCombo ? Number(formData.get("set_size") || 0) || null : null,
    rating: Number(formData.get("rating") || 4.8),
    category: String(formData.get("category") || "Other"),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  // Optional file uploads
  const cover = formData.get("cover_file");
  if (cover instanceof File && cover.size > 0) {
    row.cover_image = await uploadCover(cover, slug);
  }
  const pdf = formData.get("pdf_file");
  if (pdf instanceof File && pdf.size > 0) {
    row.pdf_path = await uploadFile("pdfs", pdf, slug);
  }

  const { error } = await admin
    .from("products")
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);

  // Combo membership: replace combo_items with the checked books.
  if (isCombo) {
    await admin.from("combo_items").delete().eq("combo_id", id);
    const memberIds = formData
      .getAll("combo_book")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n !== id);
    if (memberIds.length) {
      await admin
        .from("combo_items")
        .insert(memberIds.map((product_id) => ({ combo_id: id, product_id })));
      await admin
        .from("products")
        .update({ set_size: memberIds.length })
        .eq("id", id);
    }
  }

  await revalidatePublic(slug, isCombo);
  redirect("/dashboard/products");
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await revalidatePublic();
}

export async function toggleActive(id: number, active: boolean) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  await admin.from("products").update({ active }).eq("id", id);
  await revalidatePublic();
}

const SETTINGS_SCOPES = ["business", "content", "integrations", "launch"] as const;

/** Saves approved public content and checklist states. Secrets are rejected. */
export async function saveStoreSettings(formData: FormData) {
  await requireAdmin();
  const scope = String(formData.get("scope") || "");
  if (!SETTINGS_SCOPES.includes(scope as (typeof SETTINGS_SCOPES)[number])) {
    throw new Error("Invalid settings section");
  }

  const blocked = /password|secret|api[_ -]?key|otp|token/i;
  const values: Record<string, string | boolean> = {};
  for (const [key, raw] of formData.entries()) {
    if (key === "scope" || key === "return_to" || key.startsWith("$")) continue;
    if (blocked.test(key)) throw new Error("Secrets cannot be saved here");
    if (raw instanceof File) {
      if (raw.size === 0) continue;
      const allowedFiles: Record<string, string> = {
        logo_file: "logo_url",
        favicon_file: "favicon_url",
        testimonial_1_photo_file: "testimonial_1_photo_url",
        testimonial_2_photo_file: "testimonial_2_photo_url",
        testimonial_3_photo_file: "testimonial_3_photo_url",
      };
      if (!allowedFiles[key] || (scope !== "business" && scope !== "content")) {
        throw new Error("Unsupported settings file");
      }
      if (!raw.type.startsWith("image/") || raw.size > 5 * 1024 * 1024) {
        throw new Error("Brand images must be under 5 MB");
      }
      values[allowedFiles[key]] = await uploadFile(
        "covers",
        raw,
        `settings-${allowedFiles[key].replace("_url", "")}`,
      );
      continue;
    }
    values[key] = raw === "on" ? true : String(raw).trim().slice(0, 5000);
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("store_settings").upsert(
    { id: "main", [scope]: values, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);

  const returnTo = String(formData.get("return_to") || "/dashboard/setup");
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}

/** Re-sends the order link on WhatsApp. Admin only; bypasses the per-order cap. */
export async function resendDelivery(orderId: string) {
  await requireAdmin();
  const { sendOrderOnWhatsApp } = await import("@/lib/delivery");
  await sendOrderOnWhatsApp(orderId, { force: true });
  revalidatePath("/dashboard/orders");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/dashboard/login");
}
