"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_UPLOAD_TIMEOUT_MS, getSupabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { nextProductId } from "@/lib/admin";
import { purgePublicPages } from "@/lib/cdn";
import { COVER_WIDTHS, coverVariantPath } from "@/lib/covers";
import { isLocale, type Locale } from "@/lib/i18n";

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
  const admin = getSupabaseAdmin(ADMIN_UPLOAD_TIMEOUT_MS);
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
  const admin = getSupabaseAdmin(ADMIN_UPLOAD_TIMEOUT_MS);
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

  const localeValue = formData.get("edition_locale");
  if (!isLocale(localeValue)) throw new Error("Choose a valid edition language");
  const locale: Locale = localeValue;
  if (!isEdit && locale !== "mr") {
    throw new Error("Create the Marathi edition first, then add Hindi and English");
  }

  const title = String(formData.get(`title_${locale}`) || "").trim();
  if (!title) throw new Error("The selected edition needs a title");
  const legacyTitle = locale === "mr"
    ? title
    : String(formData.get("legacy_title") || "").trim();
  if (!legacyTitle) throw new Error("Save the Marathi edition first");

  const slug =
    String(formData.get("slug") || "").trim() || slugify(legacyTitle) || `book-${id}`;
  const isCombo = formData.get("is_combo") === "on";
  const shortDescription = String(
    formData.get(`short_description_${locale}`) || "",
  ).trim();
  const description = String(formData.get(`description_${locale}`) || "").trim();
  const pages = Number(formData.get(`pages_${locale}`) || 0);

  const row: Record<string, unknown> = {
    id,
    slug,
    title: legacyTitle,
    short_description: locale === "mr"
      ? shortDescription
      : String(formData.get("legacy_short_description") || "").trim(),
    description: locale === "mr"
      ? description
      : String(formData.get("legacy_description") || "").trim(),
    mrp: Number(formData.get("mrp") || 0),
    price: Number(formData.get("price") || 0),
    pages: locale === "mr"
      ? pages
      : Number(formData.get("legacy_pages") || 0),
    language: "Marathi",
    is_combo: isCombo,
    set_size: isCombo ? Number(formData.get("set_size") || 0) || null : null,
    rating: Number(formData.get("rating") || 4.8),
    category: String(formData.get("category") || "Other"),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
    [`title_${locale}`]: title,
    [`short_description_${locale}`]: shortDescription,
    [`description_${locale}`]: description,
    [`pages_${locale}`]: pages || null,
  };

  // Only the active language fieldset is enabled in the browser, keeping each
  // request under the 95 MB Server Action limit.
  const cover = formData.get(`cover_file_${locale}`);
  if (cover instanceof File && cover.size > 0) {
    const coverUrl = await uploadCover(cover, `${slug}-${locale}`);
    row[`cover_image_${locale}`] = coverUrl;
    if (locale === "mr") row.cover_image = coverUrl;
  }
  const pdfFields = [
    ["pdf_file_mr", "pdf_path_mr", "mr"],
    ["pdf_file_hi", "pdf_path_hi", "hi"],
    ["pdf_file_en", "pdf_path_en", "en"],
  ] as const;
  for (const [field, column, locale] of pdfFields) {
    const pdf = formData.get(field);
    if (pdf instanceof File && pdf.size > 0) {
      row[column] = await uploadFile("pdfs", pdf, `${slug}-${locale}`);
    }
  }

  const previewFiles = formData
    .getAll(`preview_files_${locale}`)
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (previewFiles.length > 4) {
    throw new Error("Upload at most 4 preview pages (the cover makes 5 images total)");
  }
  if (previewFiles.length) {
    const gallery = await Promise.all(
      previewFiles.map((file, index) =>
        uploadCover(file, `${slug}-${locale}-preview-${index + 1}`),
      ),
    );
    row[`gallery_images_${locale}`] = gallery;
    if (locale === "mr") row.gallery_images = gallery;
  }

  const { error } = await admin
    .from("products")
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);

  const { data: saved, error: savedError } = await admin
    .from("products")
    .select("title, title_mr, title_hi, title_en, short_description, short_description_mr, short_description_hi, short_description_en, description, description_mr, description_hi, description_en, pages, pages_mr, pages_hi, pages_en, cover_image, cover_image_mr, cover_image_hi, cover_image_en, pdf_path, pdf_path_mr, pdf_path_hi, pdf_path_en")
    .eq("id", id)
    .single();
  if (savedError) throw new Error(savedError.message);
  const savedRow = saved as Record<string, unknown>;
  const valueFor = (field: string, edition: Locale) =>
    savedRow[`${field}_${edition}`] || (edition === "mr" ? savedRow[field] : null);
  const editionReady = (edition: Locale) => Boolean(
    valueFor("title", edition) &&
      valueFor("short_description", edition) &&
      valueFor("description", edition) &&
      valueFor("cover_image", edition) &&
      (isCombo || valueFor("pages", edition)),
  );
  const pdfFor = (edition: Locale) =>
    savedRow[`pdf_path_${edition}`] || (edition === "mr" ? savedRow.pdf_path : null);
  const availableLocales = (["mr", "hi", "en"] as const).filter(
    (edition) => editionReady(edition) && (isCombo || pdfFor(edition)),
  );
  const { error: localeError } = await admin
    .from("products")
    .update({ available_locales: availableLocales })
    .eq("id", id);
  if (localeError) throw new Error(localeError.message);

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
      const { data: members, error: membersError } = await admin
        .from("products")
        .select("available_locales")
        .in("id", memberIds);
      if (membersError) throw new Error(membersError.message);
      const comboLocales = (["mr", "hi", "en"] as const).filter(
        (memberLocale) =>
          editionReady(memberLocale) &&
          (members ?? []).length === memberIds.length &&
          (members ?? []).every((member) =>
            member.available_locales?.includes(memberLocale),
          ),
      );
      await admin
        .from("products")
        .update({ set_size: memberIds.length, available_locales: comboLocales })
        .eq("id", id);
    } else {
      await admin
        .from("products")
        .update({ set_size: null, available_locales: [] })
        .eq("id", id);
    }
  }

  await revalidatePublic(slug, isCombo);
  redirect(`/dashboard/products/${id}?lang=${locale}&saved=1`);
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
