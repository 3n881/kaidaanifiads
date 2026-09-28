"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Images,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AdminProduct } from "@/lib/admin";
import { saveProduct } from "@/app/dashboard/actions";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { coverSrc } from "@/lib/covers";

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
  const coverFor = (locale: Locale) =>
    (locale === "mr"
      ? product?.cover_image_mr ?? product?.cover_image
      : product?.[`cover_image_${locale}`]) ?? null;
  // Tracks what each edition's cover will be after saving (for the tab ticks).
  const [coverPreviews, setCoverPreviews] = useState<Record<Locale, string | null>>({
    mr: coverFor("mr"),
    hi: coverFor("hi"),
    en: coverFor("en"),
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
              <Field
                id={`title_${locale}`}
                label="Title"
                required={locale === "mr"}
                hint={locale === "mr" ? "Required — the book’s main name and web address." : "Leave empty and save to clear this edition’s title."}
              >
                <input
                  id={`title_${locale}`}
                  name={`title_${locale}`}
                  required={locale === "mr"}
                  defaultValue={titleFor(locale)}
                  className={inputClass}
                />
              </Field>
              <Field
                id={`short_description_${locale}`}
                label="Short description"
                hint="One or two lines shown on product cards"
              >
                <textarea
                  id={`short_description_${locale}`}
                  name={`short_description_${locale}`}
                  rows={2}
                  defaultValue={shortFor(locale)}
                  className={inputClass}
                />
              </Field>
              <Field id={`description_${locale}`} label="Full description">
                <textarea
                  id={`description_${locale}`}
                  name={`description_${locale}`}
                  rows={6}
                  defaultValue={descriptionFor(locale)}
                  className={inputClass}
                />
              </Field>
              <Field id={`pages_${locale}`} label="Pages in this edition" hint={isCombo ? "Total pages of the combo PDF." : undefined}>
                <input
                  id={`pages_${locale}`}
                  name={`pages_${locale}`}
                  type="number"
                  min={1}
                  defaultValue={pagesFor(locale)}
                  className={inputClass}
                />
              </Field>
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
                One cover plus up to five page previews. Removals and new files apply
                when you save this edition; other languages are not touched.
              </p>
              <CoverField
                name={`cover_file_${locale}`}
                removeName={`remove_cover_${locale}`}
                label={`${LOCALE_LABELS[locale]} cover`}
                existingUrl={coverFor(locale)}
                onPreviewChange={(url) => setCoverPreviews((current) => ({ ...current, [locale]: url }))}
              />
              <PreviewsField
                locale={locale}
                existing={galleryFor(locale)}
              />
              <PdfField
                name={`pdf_file_${locale}`}
                removeName={`remove_pdf_${locale}`}
                label={`${LOCALE_LABELS[locale]} PDF`}
                uploaded={pdfUploaded(locale)}
                viewHref={product ? `/dashboard/products/${product.id}/pdf?lang=${locale}` : undefined}
                hint={isCombo
                  ? "One PDF containing every book in this combo. Buyers receive this file."
                  : "The PDF remains private and is available only after verified payment."}
              />
            </fieldset>
          ))}

          {isCombo && (
            <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
              <Field id="set_size" label="Books in this set" hint="Shown as “3 Book Set”. Ticked books below override it.">
                <input id="set_size" name="set_size" type="number" min={2} required defaultValue={product?.set_size ?? (selectedBookIds.length || 2)} className={inputClass} />
              </Field>
              {/* Collapsed unless already used: ticking a book sends buyers that
                  book's PDF in addition to the combo PDF above. */}
              <details open={selectedBookIds.length > 0} className="mt-4 rounded-xl border border-brand-100 p-3">
                <summary className="cursor-pointer text-sm font-bold text-brand-900">
                  Also send separate books ({selectedBookIds.length} ticked)
                </summary>
                <div className="mt-2 flex gap-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Usually leave this empty — the combo PDF above already has every book.
                    Tick a book only if it is part of this combo and also sold on its own:
                    buyers then get its PDF as an extra file.
                  </span>
                </div>
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-brand-100 p-2">
                  {ebookOptions.length ? ebookOptions.map((book) => (
                    <label key={book.id} className="flex min-h-12 cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-brand-50">
                      <input type="checkbox" name="combo_book" value={book.id} defaultChecked={selectedBookIds.includes(book.id)} className="mt-0.5 h-5 w-5 accent-brand-teal" />
                      <span className="font-deva text-xs text-brand-700">#{book.id} {book.title}</span>
                    </label>
                  )) : (
                    <p className="p-2 text-xs text-brand-400">No single ebooks yet.</p>
                  )}
                </div>
              </details>
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

const IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PREVIEWS = 5;
const smallButton =
  "inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition";

/** Cover: shows the current image with Replace / Remove; a newly chosen file
 *  can be cancelled before saving. Removal is sent as `removeName=1`. */
function CoverField({ name, removeName, label, existingUrl, onPreviewChange }: { name: string; removeName: string; label: string; existingUrl: string | null; onPreviewChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [removed, setRemoved] = useState(false);
  const [selected, setSelected] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const shown = selected?.url ?? (removed ? null : existingUrl);
  const cancel = () => {
    if (input.current) input.current.value = "";
    setSelected(null);
    onPreviewChange(removed ? null : existingUrl);
  };
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-brand-700">{label}</p>
      <input type="hidden" name={removeName} value={removed && !selected ? "1" : ""} />
      <input
        ref={input}
        name={name}
        type="file"
        accept={IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
            setError("Cover must be a JPG, PNG or WebP image under 5 MB.");
            event.target.value = "";
            return;
          }
          setError("");
          const url = URL.createObjectURL(file);
          setSelected({ name: file.name, url });
          onPreviewChange(url);
        }}
      />
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob or Supabase admin preview.
        <img src={shown} alt={`${label} preview`} width={120} height={160} className="mb-2 h-36 w-auto rounded-lg border border-brand-100 object-cover" />
      ) : (
        <div className="mb-2 flex h-36 w-28 items-center justify-center rounded-lg border border-dashed border-brand-200 text-[11px] text-brand-400">No cover</div>
      )}
      {selected && <p className="mb-2 truncate text-[11px] font-semibold text-green-600">New: {selected.name}</p>}
      {removed && !selected && <p className="mb-2 text-[11px] font-semibold text-amber-700">Cover will be removed when you save.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} className={`${smallButton} border-brand-200 text-brand-700 hover:bg-brand-50`}>
          <Upload className="h-3.5 w-3.5" /> {shown ? "Replace" : "Upload"}
        </button>
        {selected && (
          <button type="button" onClick={cancel} className={`${smallButton} border-brand-200 text-brand-600 hover:bg-brand-50`}>
            <X className="h-3.5 w-3.5" /> Cancel new
          </button>
        )}
        {!selected && existingUrl && !removed && (
          <button type="button" onClick={() => { setRemoved(true); onPreviewChange(null); }} className={`${smallButton} border-danger-200 text-danger-600 hover:bg-red-50`}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
        {!selected && removed && (
          <button type="button" onClick={() => { setRemoved(false); onPreviewChange(existingUrl); }} className={`${smallButton} border-brand-200 text-brand-600 hover:bg-brand-50`}>
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-[11px] font-semibold text-danger-600">{error}</p>}
    </div>
  );
}

/** Page previews: keep/remove each saved image and add new ones (5 total).
 *  Sends `preview_state_<l>` plus one `keep_preview_<l>` per kept URL. */
function PreviewsField({ locale, existing }: { locale: Locale; existing: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [kept, setKept] = useState<string[]>(existing);
  const [added, setAdded] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const room = MAX_PREVIEWS - kept.length - added.length;
  // The file input's FileList is what submits, so it must mirror `added`.
  const syncInput = (files: File[]) => {
    if (!input.current) return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.current.files = transfer.files;
  };
  const removeAdded = (index: number) => {
    const next = added.filter((_, i) => i !== index);
    setAdded(next);
    syncInput(next.map((item) => item.file));
  };
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-brand-700">Page previews ({kept.length + added.length}/{MAX_PREVIEWS})</p>
      <input type="hidden" name={`preview_state_${locale}`} value="1" />
      {kept.map((url) => <input key={url} type="hidden" name={`keep_preview_${locale}`} value={url} />)}
      <input
        ref={input}
        name={`preview_files_${locale}`}
        type="file"
        accept={IMAGE_TYPES}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          const current = added.map((item) => item.file);
          if (picked.some((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES)) {
            setError("Every preview must be a JPG, PNG or WebP image under 5 MB.");
            syncInput(current);
            return;
          }
          const accepted = picked.slice(0, Math.max(0, room));
          setError(picked.length > accepted.length ? `Only ${MAX_PREVIEWS} previews in total — extra images were skipped.` : "");
          const next = [...added, ...accepted.map((file) => ({ file, url: URL.createObjectURL(file) }))];
          setAdded(next);
          syncInput(next.map((item) => item.file));
        }}
      />
      {kept.length + added.length > 0 && (
        <div className="mb-2 grid grid-cols-5 gap-2">
          {kept.map((url, index) => (
            <Thumb key={url} src={coverSrc(url)} label={`Remove preview ${index + 1}`} onRemove={() => setKept((current) => current.filter((u) => u !== url))} />
          ))}
          {added.map((item, index) => (
            <Thumb key={item.url} src={item.url} isNew label={`Cancel new preview ${item.file.name}`} onRemove={() => removeAdded(index)} />
          ))}
        </div>
      )}
      {kept.length < existing.length && (
        <p className="mb-2 text-[11px] font-semibold text-amber-700">
          {existing.length - kept.length} saved preview{existing.length - kept.length === 1 ? "" : "s"} will be removed when you save.{" "}
          <button type="button" onClick={() => setKept(existing)} className="underline">Undo</button>
        </p>
      )}
      <button type="button" disabled={room <= 0} onClick={() => input.current?.click()} className={`${smallButton} border-brand-200 text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40`}>
        <Images className="h-3.5 w-3.5" /> Add previews
      </button>
      <span className="ml-2 text-[10px] text-brand-400">JPG, PNG or WebP · 5 MB each</span>
      {error && <p role="alert" className="mt-1 text-[11px] font-semibold text-danger-600">{error}</p>}
    </div>
  );
}

function Thumb({ src, label, isNew = false, onRemove }: { src: string; label: string; isNew?: boolean; onRemove: () => void }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-md border ${isNew ? "border-green-400" : "border-brand-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob or Supabase admin preview. */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={onRemove} aria-label={label} title={label} className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Edition PDF: View / Replace / Remove the saved file; cancel a new pick. */
function PdfField({ name, removeName, label, uploaded, viewHref, hint }: { name: string; removeName: string; label: string; uploaded: boolean; viewHref?: string; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [removed, setRemoved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const hasFile = uploaded && !removed;
  return (
    <div className="space-y-2 border-t border-brand-100 pt-4">
      <h3 className="inline-flex items-center gap-2 text-sm font-bold text-brand-900">
        <FileText className="h-4 w-4" /> {label}
      </h3>
      <input type="hidden" name={removeName} value={removed && !selected ? "1" : ""} />
      <input
        ref={input}
        name={name}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.type !== "application/pdf" || file.size > 50 * 1024 * 1024) {
            setError("Choose a PDF under 50 MB.");
            event.target.value = "";
            return;
          }
          setError("");
          setSelected(file.name);
        }}
      />
      {hasFile && !selected && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> PDF uploaded</span>
          {viewHref && (
            <a href={viewHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-teal underline underline-offset-2">
              <ExternalLink className="h-3.5 w-3.5" /> View PDF
            </a>
          )}
        </p>
      )}
      {selected && <p className="truncate text-[11px] font-semibold text-green-600">New: {selected}</p>}
      {removed && !selected && (
        <p className="text-[11px] font-semibold text-amber-700">
          PDF will be removed when you save. This edition can’t be sold or downloaded until a new PDF is uploaded.
        </p>
      )}
      {!uploaded && !selected && <p className="text-[11px] text-brand-400">No PDF yet.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} className={`${smallButton} border-brand-200 text-brand-700 hover:bg-brand-50`}>
          <Upload className="h-3.5 w-3.5" /> {hasFile || selected ? "Replace PDF" : "Upload PDF"}
        </button>
        {selected && (
          <button type="button" onClick={() => { if (input.current) input.current.value = ""; setSelected(null); }} className={`${smallButton} border-brand-200 text-brand-600 hover:bg-brand-50`}>
            <X className="h-3.5 w-3.5" /> Cancel new
          </button>
        )}
        {!selected && hasFile && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remove this PDF? Buyers of this edition, including past orders, can't download it until a new PDF is uploaded.")) setRemoved(true);
            }}
            className={`${smallButton} border-danger-200 text-danger-600 hover:bg-red-50`}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
        {!selected && removed && (
          <button type="button" onClick={() => setRemoved(false)} className={`${smallButton} border-brand-200 text-brand-600 hover:bg-brand-50`}>
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>
        )}
      </div>
      <p className="text-[10px] text-brand-400">Maximum 50 MB. {hint}</p>
      {error && <p role="alert" className="text-[11px] font-semibold text-danger-600">{error}</p>}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-brand-800"><span>{label}</span><input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-brand-teal" /></label>;
}

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save {LOCALE_LABELS[locale]} edition</>}</button>;
}
