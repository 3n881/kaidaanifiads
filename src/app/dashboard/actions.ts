"use server";

import sharp from "sharp";
import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/products";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_DATA_TAG } from "@/lib/sales";
import { ADMIN_UPLOAD_TIMEOUT_MS, getSupabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { nextProductId } from "@/lib/admin";
import { purgeFiles, purgePublicPages } from "@/lib/cdn";
import { COVER_WIDTHS, coverVariantPath } from "@/lib/covers";
import { toBookShape } from "@/lib/book-shape";
import { isLocale, type Locale } from "@/lib/i18n";
import { publishPreview, removePreview } from "@/lib/preview-pdf";
import { previewPdfPath } from "@/lib/previews";
import { READER_PAGES, uploadReaderPages } from "@/lib/reader-pages";

async function revalidatePublic(slug?: string, isCombo?: boolean) {
  // The cached catalog first (src/lib/products.ts), so the pages below are
  // rebuilt from the edit — updateTag = read-your-own-writes in a Server Action.
  updateTag(CATALOG_TAG);
  revalidatePath("/");
  revalidatePath("/ebooks");
  revalidatePath("/combos");
  if (slug) revalidatePath(`/${isCombo ? "combos" : "ebooks"}/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/dashboard");
  // /ebooks and /combos prefixes cover every detail page and RSC variant;
  // the sitemap so Google sees new books the same day (Cloudflare keeps it 1 day).
  await purgePublicPages(["/", "/ebooks", "/combos", "/sitemap.xml"]);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
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
  const input = await toBookShape(Buffer.from(await file.arrayBuffer()));
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
/**
 * The product form's action: same as saveProduct, but a refused save comes back
 * as a message for the form instead of the generic "server error" page
 * (production hides thrown messages). Redirects still go through.
 */
export async function saveProductWithFeedback(
  _previous: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    await saveProduct(formData);
    return null;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[saveProduct] failed", error);
    return { error: error instanceof Error ? error.message : "Saving failed. Please try again." };
  }
}

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

  // Only the Marathi title is required (it is the book's main name and URL);
  // any other field may be cleared and saved empty.
  const title = String(formData.get(`title_${locale}`) || "").trim();
  if (locale === "mr" && !title) {
    throw new Error("The Marathi title is required — it is the book's main name and web address");
  }
  const legacyTitle = locale === "mr"
    ? title
    : String(formData.get("legacy_title") || "").trim();
  if (!legacyTitle) throw new Error("Save the Marathi edition first");

  // A Marathi/Hindi title has no Latin letters, so slugify() leaves nothing
  // (it used to leave just "-"): fall back to book-<id>. The admin can type an
  // English address under "Advanced options → URL".
  const typedSlug = slugify(String(formData.get("slug") || ""));
  const titleSlug = slugify(legacyTitle);
  const slug =
    typedSlug || (titleSlug.replace(/-/g, "").length >= 3 ? titleSlug : "") || `book-${id}`;
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
      ? shortDescription || null
      : String(formData.get("legacy_short_description") || "").trim() || null,
    description: locale === "mr"
      ? description || null
      : String(formData.get("legacy_description") || "").trim() || null,
    mrp: Number(formData.get("mrp") || 0),
    price: Number(formData.get("price") || 0),
    pages: locale === "mr"
      ? pages || null
      : Number(formData.get("legacy_pages") || 0) || null,
    // Set once at creation; editing must not turn a Hindi book into Marathi.
    ...(isEdit ? {} : { language: "Marathi" }),
    is_combo: isCombo,
    set_size: isCombo ? Number(formData.get("set_size") || 0) || null : null,
    rating: Number(formData.get("rating") || 4.8),
    category: String(formData.get("category") || "Other"),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
    [`title_${locale}`]: title || null,
    [`short_description_${locale}`]: shortDescription || null,
    [`description_${locale}`]: description || null,
    [`pages_${locale}`]: pages || null,
  };

  // Only the active language fieldset is enabled in the browser, keeping each
  // request under the 95 MB Server Action limit.
  const cover = formData.get(`cover_file_${locale}`);
  const coverUploaded = cover instanceof File && cover.size > 0;
  if (cover instanceof File && cover.size > 0) {
    const coverUrl = await uploadCover(cover, `${slug}-${locale}`);
    row[`cover_image_${locale}`] = coverUrl;
    if (locale === "mr") row.cover_image = coverUrl;
  } else if (formData.get(`remove_cover_${locale}`) === "1") {
    row[`cover_image_${locale}`] = null;
    if (locale === "mr") row.cover_image = null;
  }
  const pdfFields = [
    ["pdf_file_mr", "pdf_path_mr", "mr"],
    ["pdf_file_hi", "pdf_path_hi", "hi"],
    ["pdf_file_en", "pdf_path_en", "en"],
  ] as const;
  // Preview PDFs keep a fixed name, so Cloudflare must drop the old copy.
  const changedPreviews: string[] = [];
  for (const [field, column, locale] of pdfFields) {
    const pdf = formData.get(field);
    if (pdf instanceof File && pdf.size > 0) {
      row[column] = await uploadFile("pdfs", pdf, `${slug}-${locale}`);
      // Sample-reader pages: rendered from this PDF in the admin's browser
      // (ProductForm) and sent along. Without them the reader falls back to
      // the preview PDF, so stale pages of an older PDF are cleared.
      const pageFiles = formData
        .getAll(`reader_pages_${locale}`)
        .filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024)
        .slice(0, READER_PAGES);
      try {
        row[`reader_pages_${locale}`] = pageFiles.length
          ? await uploadReaderPages(
              getSupabaseAdmin(ADMIN_UPLOAD_TIMEOUT_MS),
              slug,
              locale,
              await Promise.all(pageFiles.map((f) => f.arrayBuffer())),
            )
          : null;
      } catch (error) {
        console.error("[saveProduct] reader pages failed", slug, locale, error);
        row[`reader_pages_${locale}`] = null;
      }
      // Free "first 6 pages" preview shown on the product page. A failure
      // must not lose the upload, so it is logged, not thrown.
      try {
        await publishPreview(
          getSupabaseAdmin(ADMIN_UPLOAD_TIMEOUT_MS),
          slug,
          locale,
          await pdf.arrayBuffer(),
        );
      } catch (error) {
        console.error("[saveProduct] preview PDF failed", slug, locale, error);
      }
      changedPreviews.push(`/media/${previewPdfPath(slug, locale)}`);
    } else if (formData.get(`remove_${field.replace("_file", "")}`) === "1") {
      // The file stays in storage; only this edition stops delivering it.
      row[column] = null;
      row[`reader_pages_${locale}`] = null;
      if (locale === "mr") row.pdf_path = null;
      await removePreview(admin, slug, locale);
      changedPreviews.push(`/media/${previewPdfPath(slug, locale)}`);
    }
  }
  await purgeFiles(changedPreviews);

  // No cover picked and none saved yet → use the book's own first page (the
  // sample-reader image of page 1, already stored in every size). A cover
  // uploaded later replaces it.
  const firstPage = (row[`reader_pages_${locale}`] as string[] | null | undefined)?.[0];
  if (!coverUploaded && firstPage && formData.get(`remove_cover_${locale}`) !== "1") {
    let hasCover = false;
    if (isEdit) {
      const { data: current } = await admin
        .from("products")
        .select("cover_image, cover_image_mr, cover_image_hi, cover_image_en")
        .eq("id", id)
        .maybeSingle<Record<string, string | null>>();
      hasCover = Boolean(current?.[`cover_image_${locale}`] || (locale === "mr" && current?.cover_image));
    }
    if (!hasCover) {
      row[`cover_image_${locale}`] = firstPage;
      if (locale === "mr") row.cover_image = firstPage;
    }
  }

  const previewFiles = formData
    .getAll(`preview_files_${locale}`)
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (formData.get(`preview_state_${locale}`)) {
    // Kept previews (in order) + new uploads. Only URLs already on this
    // edition can be kept.
    let existingGallery: string[] = [];
    if (isEdit) {
      const { data: current } = await admin
        .from("products")
        .select("gallery_images, gallery_images_mr, gallery_images_hi, gallery_images_en")
        .eq("id", id)
        .maybeSingle<Record<string, string[] | null>>();
      existingGallery = locale === "mr"
        ? (current?.gallery_images_mr?.length ? current.gallery_images_mr : current?.gallery_images) ?? []
        : current?.[`gallery_images_${locale}`] ?? [];
    }
    const kept = formData
      .getAll(`keep_preview_${locale}`)
      .map(String)
      .filter((url) => existingGallery.includes(url));
    if (kept.length + previewFiles.length > 5) {
      throw new Error("At most 5 preview pages per edition (the cover makes 6 images total)");
    }
    const uploaded = await Promise.all(
      previewFiles.map((file, index) =>
        uploadCover(file, `${slug}-${locale}-preview-${kept.length + index + 1}`),
      ),
    );
    const gallery = [...kept, ...uploaded];
    row[`gallery_images_${locale}`] = gallery;
    if (locale === "mr") row.gallery_images = gallery;
  } else if (previewFiles.length > 5) {
    throw new Error("Upload at most 5 preview pages (the cover makes 6 images total)");
  } else if (previewFiles.length) {
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
  // An edition is on sale once its listing is complete and it has a PDF to
  // deliver. Most combos are one merged PDF on the combo itself.
  const availableLocales: Locale[] = (["mr", "hi", "en"] as const).filter(
    (edition) => editionReady(edition) && Boolean(pdfFor(edition)),
  );
  const { error: localeError } = await admin
    .from("products")
    .update({ available_locales: availableLocales })
    .eq("id", id);
  if (localeError) throw new Error(localeError.message);

  // Combo membership: replace combo_items with the checked books. Without
  // ticked books the combo keeps its own PDF and the set size from the form.
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
          (Boolean(pdfFor(memberLocale)) ||
            ((members ?? []).length === memberIds.length &&
              (members ?? []).every((member) =>
                member.available_locales?.includes(memberLocale),
              ))),
      );
      await admin
        .from("products")
        .update({ set_size: memberIds.length, available_locales: comboLocales })
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

/** Marks a contact-page message as handled (or back to open). */
export async function setMessageHandled(id: string, handled: boolean) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin().from("contact_messages").update({ handled }).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/messages");
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

/** Re-sends the order link on WhatsApp. Admin only; bypasses the per-order cap. false = not sent (refused). */
export async function resendDelivery(orderId: string): Promise<boolean> {
  const admin = await requireAdmin();
  const { sendOrderOnWhatsApp } = await import("@/lib/delivery");
  const sent = await sendOrderOnWhatsApp(orderId, { force: true, by: admin.email ?? "admin" });
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/whatsapp");
  return sent;
}

/**
 * WhatsApp page: send refused messages again (one, or "all refused"). A book
 * PDF goes again only if the order is paid and no PDF reached that order since;
 * a payment reminder goes through sendAdminReminder (all its checks: still
 * unpaid, newest attempt, doesn't own the book, Razorpay not paid). Each order
 * gets at most one PDF and one reminder per call. Offers aren't resent.
 */
export async function resendRefusedAction(logIds: string[]): Promise<{ sent: number; refused: number; skipped: Record<string, number> }> {
  const admin = await requireAdmin();
  const by = admin.email ?? "admin";
  const ids = [...new Set((Array.isArray(logIds) ? logIds : []).map(String))]
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50);
  const { sendOrderOnWhatsApp } = await import("@/lib/delivery");
  const { sendAdminReminder } = await import("@/lib/reminders");
  const db = getSupabaseAdmin();
  const { data: rows, error } = ids.length
    ? await db.from("whatsapp_log").select("id, created_at, order_id, kind").in("id", ids).eq("ok", false)
    : { data: [], error: null };
  if (error) throw new Error(error.message);

  let sent = 0;
  let refused = 0;
  const skipped: Record<string, number> = {};
  const skip = (reason: string) => (skipped[reason] = (skipped[reason] ?? 0) + 1);
  const done = new Set<string>();
  for (const row of rows ?? []) {
    if (!row.order_id || row.kind === "offer") {
      skip("no_order");
      continue;
    }
    const pdf = row.kind === "pdf";
    const key = `${pdf ? "pdf" : "reminder"}:${row.order_id}`;
    if (done.has(key)) continue;
    done.add(key);

    // Re-checked here (not only on the page): a second tap can't send twice.
    const { count, error: laterError } = await db
      .from("whatsapp_log")
      .select("id", { count: "exact", head: true })
      .eq("order_id", row.order_id)
      .in("kind", pdf ? ["pdf"] : ["reminder", "reminder_admin"])
      .eq("ok", true)
      .gt("created_at", row.created_at);
    if (laterError) throw new Error(laterError.message);
    if ((count ?? 0) > 0) {
      skip("already_sent");
      continue;
    }

    if (pdf) {
      const { data: order } = await db.from("orders").select("status").eq("id", row.order_id).maybeSingle();
      if (order?.status !== "paid") {
        skip("not_paid");
        continue;
      }
      if (await sendOrderOnWhatsApp(row.order_id, { force: true, by })) sent++;
      else refused++;
    } else {
      const result = await sendAdminReminder(row.order_id, by);
      if (result === "sent") sent++;
      else if (result === "failed") refused++;
      else skip(result);
    }
  }
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/whatsapp");
  revalidatePath("/dashboard/orders");
  return { sent, refused, skipped };
}

/**
 * Dashboard: send the "payment not completed" WhatsApp reminder now to one or
 * several pending / cancelled / failed orders (src/lib/reminders.ts rules).
 * Returns how each order went, for the result line on the Orders page.
 */
export async function sendRemindersAction(orderIds: string[]): Promise<{ sent: number; skipped: Record<string, number> }> {
  const admin = await requireAdmin();
  const { sendAdminReminder } = await import("@/lib/reminders");
  const ids = [...new Set((Array.isArray(orderIds) ? orderIds : []).map(String))]
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50);
  let sent = 0;
  const skipped: Record<string, number> = {};
  for (const id of ids) {
    const result = await sendAdminReminder(id, admin.email ?? "admin");
    if (result === "sent") sent++;
    else skipped[result] = (skipped[result] ?? 0) + 1;
  }
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/whatsapp");
  return { sent, skipped };
}

/** Analytics → Campaigns: total ad spend for one campaign (₹, empty = clear) → return on ad spend. */
export async function saveCampaignSpend(campaign: string, spend: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const name = campaign.trim().slice(0, 100);
  if (!name) return { ok: false, message: "No campaign" };
  const admin = getSupabaseAdmin();
  const value = spend.replace(/[₹,\s]/g, "");
  const { error } =
    value === ""
      ? await admin.from("campaign_spend").delete().eq("campaign", name)
      : Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) < 1e9
        ? await admin.from("campaign_spend").upsert({ campaign: name, spend: Math.round(Number(value) * 100) / 100, updated_at: new Date().toISOString() })
        : { error: { message: "Enter an amount in ₹" } };
  if (error) return { ok: false, message: error.message };
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/analytics");
  return { ok: true };
}

/** Refresh button on Overview / Orders: drop the 30-second dashboard cache, then the page re-reads. */
export async function refreshAdminData() {
  await requireAdmin();
  updateTag(ADMIN_DATA_TAG);
}

/** Admin "Check with Razorpay" on an order: payment + refund state. */
export async function syncOrderAction(orderId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const { syncOrderWithRazorpay } = await import("@/lib/refunds");
  const result = await syncOrderWithRazorpay(orderId);
  updateTag(ADMIN_DATA_TAG);
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return result;
}

/** Removes an interested buyer from WhatsApp offers (STOP / on request). */
export async function optOutLead(leadId: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("leads")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  updateTag(ADMIN_DATA_TAG);
  revalidatePath("/dashboard/leads");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/dashboard/login");
}
