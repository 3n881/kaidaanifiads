"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Images,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import type { AdminProduct } from "@/lib/admin";
import { saveProduct } from "@/app/dashboard/actions";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n";

const EDITIONS: Locale[] = ["mr", "hi", "en"];
const inputClass =
  "w-full rounded-xl border border-brand-200 px-3 py-2.5 text-base outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15";

type ProductFormProps = {
  product?: AdminProduct;
  ebookOptions?: { id: number; title: string }[];
  selectedBookIds?: number[];
  defaultIsCombo?: boolean;
  initialLocale?: Locale;
};

export default function ProductForm({
  product,
  ebookOptions = [],
  selectedBookIds = [],
  defaultIsCombo = false,
  initialLocale = "mr",
}: ProductFormProps) {
  const [isCombo, setIsCombo] = useState(product?.is_combo ?? defaultIsCombo);
  const [activeLocale, setActiveLocale] = useState<Locale>(
    product ? initialLocale : "mr",
  );
  const [coverPreviews, setCoverPreviews] = useState<Record<Locale, string | null>>({
    mr: product?.cover_image_mr ?? product?.cover_image ?? null,
    hi: product?.cover_image_hi ?? null,
    en: product?.cover_image_en ?? null,
  });
  const [coverNames, setCoverNames] = useState<Partial<Record<Locale, string>>>({});
  const [pdfNames, setPdfNames] = useState<Partial<Record<Locale, string>>>({});
  const [previewNames, setPreviewNames] = useState<Record<Locale, string[]>>({
    mr: [],
    hi: [],
    en: [],
  });

  const titleFor = (locale: Locale) => {
    if (locale === "mr") return product?.title_mr ?? product?.title ?? "";
    return product?.[`title_${locale}`] ?? "";
  };
  const shortFor = (locale: Locale) => {
    if (locale === "mr") {
      return product?.short_description_mr ?? product?.short_description ?? "";
    }
    return product?.[`short_description_${locale}`] ?? "";
  };
  const descriptionFor = (locale: Locale) => {
    if (locale === "mr") {
      return product?.description_mr ?? product?.description ?? "";
    }
    return product?.[`description_${locale}`] ?? "";
  };
  const pagesFor = (locale: Locale) => {
    if (locale === "mr") return product?.pages_mr ?? product?.pages ?? "";
    return product?.[`pages_${locale}`] ?? "";
  };
  const galleryFor = (locale: Locale) => {
    if (locale === "mr") {
      return product?.gallery_images_mr?.length
        ? product.gallery_images_mr
        : product?.gallery_images ?? [];
    }
    return product?.[`gallery_images_${locale}`] ?? [];
  };
  const pdfUploaded = (locale: Locale) => {
    if (locale === "mr") return Boolean(product?.pdf_path_mr || product?.pdf_path);
    return Boolean(product?.[`pdf_path_${locale}`]);
  };

  return (
    <form action={saveProduct} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="edition_locale" value={activeLocale} />
      <input type="hidden" name="legacy_title" value={product?.title ?? ""} />
      <input
        type="hidden"
        name="legacy_short_description"
        value={product?.short_description ?? ""}
      />
      <input
        type="hidden"
        name="legacy_description"
        value={product?.description ?? ""}
      />
      <input type="hidden" name="legacy_pages" value={product?.pages ?? 0} />
      <input
        type="checkbox"
        name="is_combo"
        checked={isCombo}
        readOnly
        className="sr-only"
        aria-hidden="true"
      />

      <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
        <p className="text-sm font-bold text-brand-900">What are you adding?</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <TypeChoice selected={!isCombo} onSelect={() => setIsCombo(false)}>
            Single ebook
          </TypeChoice>
          <TypeChoice selected={isCombo} onSelect={() => setIsCombo(true)}>
            Combo pack
          </TypeChoice>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h2 className="font-bold text-brand-900">Language edition</h2>
        <p className="mt-1 text-xs leading-relaxed text-brand-500">
          Save one edition at a time. Each language keeps its own title, descriptions,
          page count, cover, preview pages and PDF.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Book language edition">
          {EDITIONS.map((locale) => {
            const ready = Boolean(titleFor(locale) && coverPreviews[locale]);
            const disabled = !product && locale !== "mr";
            return (
              <button
                key={locale}
                type="button"
                disabled={disabled}
                onClick={() => setActiveLocale(locale)}
                aria-pressed={activeLocale === locale}
                className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeLocale === locale
                    ? "border-brand-teal bg-brand-50 text-brand-900"
                    : "border-brand-100 text-brand-600 hover:bg-brand-50"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {ready && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  {LOCALE_LABELS[locale]}
                </span>
              </button>
            );
          })}
        </div>
        {!product && (
          <p className="mt-2 text-[11px] text-brand-400">
            Save Marathi first to create the product, then add Hindi and English.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {EDITIONS.map((locale) => (
            <fieldset
              key={locale}
              disabled={activeLocale !== locale}
              className={activeLocale === locale ? "space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" : "hidden"}
            >
              <legend className="px-1 text-lg font-bold text-brand-900">
                {LOCALE_LABELS[locale]} customer-facing details
              </legend>
              <Field id={`title_${locale}`} label="Title" required>
                <input
                  id={`title_${locale}`}
                  name={`title_${locale}`}
                  required
                  defaultValue={titleFor(locale)}
                  className={inputClass}
                />
              </Field>
              <Field
                id={`short_description_${locale}`}
                label="Short description"
                hint="One or two lines shown on product cards"
                required
              >
                <textarea
                  id={`short_description_${locale}`}
                  name={`short_description_${locale}`}
                  rows={2}
                  required
                  defaultValue={shortFor(locale)}
                  className={inputClass}
                />
              </Field>
              <Field id={`description_${locale}`} label="Full description" required>
                <textarea
                  id={`description_${locale}`}
                  name={`description_${locale}`}
                  rows={6}
                  required
                  defaultValue={descriptionFor(locale)}
                  className={inputClass}
                />
              </Field>
              {!isCombo && (
                <Field id={`pages_${locale}`} label="Pages in this edition" required>
                  <input
                    id={`pages_${locale}`}
                    name={`pages_${locale}`}
                    type="number"
                    min={1}
                    required
                    defaultValue={pagesFor(locale)}
                    className={inputClass}
                  />
                </Field>
              )}
            </fieldset>
          ))}

          <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-bold text-brand-900">Shared selling details</h2>
            <p className="text-xs text-brand-500">
              Price, category, rating and URL stay the same for every language.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field id="mrp" label="MRP ₹" required>
                <input id="mrp" name="mrp" type="number" min={0} required defaultValue={product?.mrp ?? ""} className={inputClass} />
              </Field>
              <Field id="price" label="Selling price ₹" required>
                <input id="price" name="price" type="number" min={1} required defaultValue={product?.price ?? ""} className={inputClass} />
              </Field>
            </div>
            <Field id="category" label="Category">
              <select id="category" name="category" defaultValue={product?.category ?? "Other"} className={inputClass}>
                <option>Property Law</option>
                <option>Civil Law</option>
                <option>Other</option>
              </select>
            </Field>
            <details className="rounded-xl border border-brand-100 p-4">
              <summary className="cursor-pointer text-sm font-bold text-brand-700">Advanced options</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field id="slug" label="URL" hint="Leave blank for automatic">
                  <input id="slug" name="slug" defaultValue={product?.slug} placeholder="automatic" className={inputClass} />
                </Field>
                <Field id="rating" label="Rating">
                  <input id="rating" name="rating" type="number" step="0.1" min={0} max={5} defaultValue={product?.rating ?? 4.8} className={inputClass} />
                </Field>
                <Field id="sort_order" label="Sort order">
                  <input id="sort_order" name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} className={inputClass} />
                </Field>
              </div>
            </details>
          </section>
        </div>

        <aside className="space-y-5">
          {EDITIONS.map((locale) => (
            <fieldset
              key={locale}
              disabled={activeLocale !== locale}
              className={activeLocale === locale ? "space-y-5 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]" : "hidden"}
            >
              <legend className="px-1 font-bold text-brand-900">
                {LOCALE_LABELS[locale]} files and images
              </legend>
              <p className="text-[11px] leading-relaxed text-brand-500">
                One language-specific cover plus up to five page previews. Saving this
                edition does not replace another language’s files.
              </p>
              <div>
                {coverPreviews[locale] && (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob or Supabase admin preview.
                  <img
                    src={coverPreviews[locale] ?? undefined}
                    alt={`${LOCALE_LABELS[locale]} cover preview`}
                    width={120}
                    height={160}
                    className="mb-3 h-36 w-auto rounded-lg border border-brand-100 object-cover"
                  />
                )}
                <UploadField
                  name={`cover_file_${locale}`}
                  accept="image/jpeg,image/png,image/webp"
                  maxBytes={5 * 1024 * 1024}
                  sizeLabel="5 MB"
                  label={coverPreviews[locale] ? "Replace cover" : "Upload cover image"}
                  selectedName={coverNames[locale]}
                  onFile={(file) => {
                    setCoverPreviews((current) => ({ ...current, [locale]: URL.createObjectURL(file) }));
                    setCoverNames((current) => ({ ...current, [locale]: file.name }));
                  }}
                />
              </div>
              <MultiImageUpload
                name={`preview_files_${locale}`}
                existingCount={galleryFor(locale).length}
                selectedNames={previewNames[locale]}
                onFiles={(names) => setPreviewNames((current) => ({ ...current, [locale]: names }))}
              />

              <div className="space-y-3 border-t border-brand-100 pt-4">
                <div>
                  <h3 className="inline-flex items-center gap-2 text-sm font-bold text-brand-900">
                    <FileText className="h-4 w-4" /> {LOCALE_LABELS[locale]} PDF
                  </h3>
                  {pdfUploaded(locale) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> PDF uploaded
                    </p>
                  )}
                </div>
                <UploadField
                  name={`pdf_file_${locale}`}
                  accept="application/pdf"
                  maxBytes={50 * 1024 * 1024}
                  sizeLabel="50 MB"
                  label={`${pdfUploaded(locale) ? "Replace" : "Upload"} ${LOCALE_LABELS[locale]} PDF`}
                  selectedName={pdfNames[locale]}
                  onFile={(file) => setPdfNames((current) => ({ ...current, [locale]: file.name }))}
                />
                <p className="text-[11px] text-brand-400">
                  {isCombo
                    ? "Upload the combo as one PDF with every book, or tick the included books below — buyers get both."
                    : "The PDF remains private and is available only after verified payment."}
                </p>
              </div>
            </fieldset>
          ))}

          {isCombo && (
            <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
              <Field id="set_size" label="Books in this set" hint="Shown as “3 Book Set”. Ticked books below override it.">
                <input id="set_size" name="set_size" type="number" min={2} required defaultValue={product?.set_size ?? (selectedBookIds.length || 2)} className={inputClass} />
              </Field>
              <h2 className="mt-4 font-bold text-brand-900">Included books</h2>
              <p className="mt-1 text-xs text-brand-500">
                Optional — only if each book is also sold separately. Buyers get each ticked book’s PDF.
              </p>
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-brand-100 p-2">
                {ebookOptions.length ? ebookOptions.map((book) => (
                  <label key={book.id} className="flex min-h-12 cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-brand-50">
                    <input type="checkbox" name="combo_book" value={book.id} defaultChecked={selectedBookIds.includes(book.id)} className="mt-0.5 h-5 w-5 accent-brand-teal" />
                    <span className="font-deva text-xs text-brand-700">{book.title}</span>
                  </label>
                )) : (
                  <p className="p-2 text-xs text-brand-400">Add individual ebooks first.</p>
                )}
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <Toggle name="featured" label="Show as featured" defaultChecked={product?.featured ?? false} />
            <Toggle name="active" label="Publish on website" defaultChecked={product?.active ?? false} />
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton locale={activeLocale} />
        <Link href="/dashboard/products" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
      </div>
    </form>
  );
}

function TypeChoice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`min-h-12 rounded-xl border p-3 text-sm font-bold ${selected ? "border-brand-teal bg-brand-50 text-brand-900" : "border-brand-100 text-brand-500"}`}>{children}</button>;
}

function Field({ id, label, hint, required, children }: { id: string; label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs font-semibold text-brand-700">{label}{required && <span className="text-danger-600"> *</span>}</label>{children}{hint && <span id={`${id}-hint`} className="mt-1 block text-[11px] text-brand-400">{hint}</span>}</div>;
}

function UploadField({ name, accept, label, selectedName, maxBytes, sizeLabel, onFile }: { name: string; accept: string; label: string; selectedName?: string; maxBytes: number; sizeLabel: string; onFile?: (file: File) => void }) {
  const [error, setError] = useState("");
  return <label className="block min-h-12 cursor-pointer rounded-xl border border-dashed border-brand-300 px-3 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"><span className="flex items-center gap-2"><Upload className="h-4 w-4" />{label}</span><span className="mt-1 block text-[10px] font-normal text-brand-400">Maximum {sizeLabel}</span>{selectedName && !error && <span className="mt-1 block truncate text-[11px] font-semibold text-green-600">Selected: {selectedName}</span>}{error && <span role="alert" className="mt-1 block text-[11px] font-semibold text-danger-600">{error}</span>}<input name={name} type="file" accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > maxBytes) { setError(`File is too large. Maximum ${sizeLabel}.`); event.target.value = ""; return; } setError(""); onFile?.(file); }} /></label>;
}

function MultiImageUpload({ name, existingCount, selectedNames, onFiles }: { name: string; existingCount: number; selectedNames: string[]; onFiles: (names: string[]) => void }) {
  const [error, setError] = useState("");
  return <label className="block min-h-12 cursor-pointer rounded-xl border border-dashed border-brand-300 px-3 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"><span className="flex items-center gap-2"><Images className="h-4 w-4" />{existingCount ? `Replace ${existingCount} page preview${existingCount === 1 ? "" : "s"}` : "Upload page previews"}</span><span className="mt-1 block text-[10px] font-normal text-brand-400">Choose up to 5 JPG, PNG or WebP images · 5 MB each</span>{selectedNames.length > 0 && !error && <span className="mt-1 block text-[11px] font-semibold text-green-600">Selected: {selectedNames.join(", ")}</span>}{error && <span role="alert" className="mt-1 block text-[11px] font-semibold text-danger-600">{error}</span>}<input name={name} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length > 5) { setError("Choose at most 5 preview images."); event.target.value = ""; return; } if (files.some((file) => file.size > 5 * 1024 * 1024)) { setError("Every preview image must be under 5 MB."); event.target.value = ""; return; } setError(""); onFiles(files.map((file) => file.name)); }} /></label>;
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-brand-800"><span>{label}</span><input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-brand-teal" /></label>;
}

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save {LOCALE_LABELS[locale]} edition</>}</button>;
}
