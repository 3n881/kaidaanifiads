"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { ArrowLeft, FileText, Loader2, Save, Upload } from "lucide-react";
import type { AdminProduct } from "@/lib/admin";
import { saveProduct } from "@/app/dashboard/actions";

const inputClass = "w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15";

export default function ProductForm({ product, ebookOptions = [], selectedBookIds = [], defaultIsCombo = false }: {
  product?: AdminProduct;
  ebookOptions?: { id: number; title: string }[];
  selectedBookIds?: number[];
  defaultIsCombo?: boolean;
}) {
  const [isCombo, setIsCombo] = useState(product?.is_combo ?? defaultIsCombo);
  const [coverPreview, setCoverPreview] = useState<string | null>(product?.cover_image ?? null);
  const [coverName, setCoverName] = useState("");
  const [pdfName, setPdfName] = useState("");

  return <form action={saveProduct} className="space-y-5">
    {product && <input type="hidden" name="id" value={product.id} />}
    <input type="checkbox" name="is_combo" checked={isCombo} readOnly className="sr-only" aria-hidden="true" />

    <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-sm font-bold text-brand-900">What are you adding?</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <TypeChoice selected={!isCombo} onSelect={() => setIsCombo(false)}>Single ebook</TypeChoice>
        <TypeChoice selected={isCombo} onSelect={() => setIsCombo(true)}>Combo pack</TypeChoice>
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-bold text-brand-900">Customer-facing details</h2>
        <Field label="Title" required><input name="title" required defaultValue={product?.title} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Language"><select name="language" defaultValue={product?.language ?? "Marathi"} className={inputClass}><option>Marathi</option><option>Hindi</option><option>English</option></select></Field><Field label="Category"><select name="category" defaultValue={product?.category ?? "Other"} className={inputClass}><option>Property Law</option><option>Civil Law</option><option>Other</option></select></Field></div>
        <Field label="Short description" hint="One sentence shown on product cards"><textarea name="short_description" rows={2} defaultValue={product?.short_description ?? ""} className={inputClass} /></Field>
        <Field label="Full description"><textarea name="description" rows={6} defaultValue={product?.description ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Field label="MRP ₹"><input name="mrp" type="number" min={0} required defaultValue={product?.mrp ?? ""} className={inputClass} /></Field><Field label="Selling price ₹"><input name="price" type="number" min={1} required defaultValue={product?.price ?? ""} className={inputClass} /></Field>{!isCombo && <Field label="Pages"><input name="pages" type="number" min={1} defaultValue={product?.pages ?? ""} className={inputClass} /></Field>}</div>
        <details className="rounded-xl border border-brand-100 p-4"><summary className="cursor-pointer text-sm font-bold text-brand-700">Advanced options</summary><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="URL" hint="Leave blank for automatic"><input name="slug" defaultValue={product?.slug} placeholder="automatic" className={inputClass} /></Field><Field label="Rating"><input name="rating" type="number" step="0.1" min={0} max={5} defaultValue={product?.rating ?? 4.8} className={inputClass} /></Field><Field label="Sort order"><input name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} className={inputClass} /></Field></div></details>
      </section>

      <aside className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="font-bold text-brand-900">Files</h2><div>{coverPreview && <Image src={coverPreview} alt="Cover preview" width={120} height={160} className="mb-3 h-36 w-auto rounded-lg border border-brand-100 object-cover" unoptimized />}<UploadField name="cover_file" accept="image/jpeg,image/png,image/webp" maxBytes={5 * 1024 * 1024} sizeLabel="5 MB" label={coverPreview ? "Replace cover" : "Upload cover image"} selectedName={coverName} onFile={(file) => { setCoverPreview(URL.createObjectURL(file)); setCoverName(file.name); }} /></div>{!isCombo && <div>{product?.pdf_path && <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-green-600"><FileText className="h-3.5 w-3.5" /> PDF uploaded</p>}<UploadField name="pdf_file" accept="application/pdf" maxBytes={50 * 1024 * 1024} sizeLabel="50 MB" label={product?.pdf_path ? "Replace PDF" : "Upload customer PDF"} selectedName={pdfName} onFile={(file) => setPdfName(file.name)} /><p className="mt-2 text-[11px] text-brand-400">Stored privately and delivered only after verified payment.</p></div>}{isCombo && <p className="text-[11px] text-brand-500">A combo delivers the PDF of every book ticked below. Each of those books must have its own PDF uploaded, or the combo cannot be bought.</p>}</section>

        {isCombo && <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="font-bold text-brand-900">Included books</h2><p className="mt-1 text-xs text-brand-500">Select the ebooks customers receive in this combo.</p><div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-brand-100 p-2">{ebookOptions.length ? ebookOptions.map((book) => <label key={book.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-brand-50"><input type="checkbox" name="combo_book" value={book.id} defaultChecked={selectedBookIds.includes(book.id)} className="mt-0.5 h-4 w-4 accent-brand-teal" /><span className="font-deva text-xs text-brand-700">{book.title}</span></label>) : <p className="p-2 text-xs text-brand-400">Add individual ebooks first.</p>}</div><input type="hidden" name="set_size" value={selectedBookIds.length || 2} /></section>}

        <section className="space-y-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"><Toggle name="featured" label="Show as featured" defaultChecked={product?.featured ?? false} /><Toggle name="active" label="Publish on website" defaultChecked={product?.active ?? false} /></section>
      </aside>
    </div>

    <div className="flex flex-wrap items-center gap-3"><SubmitButton /><Link href="/dashboard/products" className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"><ArrowLeft className="h-4 w-4" /> Back to products</Link></div>
  </form>;
}

function TypeChoice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) { return <button type="button" onClick={onSelect} aria-pressed={selected} className={`rounded-xl border p-3 text-sm font-bold ${selected ? "border-brand-teal bg-brand-50 text-brand-900" : "border-brand-100 text-brand-500"}`}>{children}</button>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-semibold text-brand-700">{label}{required && <span className="text-danger-600"> *</span>}</span>{children}{hint && <span className="mt-1 block text-[11px] text-brand-400">{hint}</span>}</label>; }
function UploadField({ name, accept, label, selectedName, maxBytes, sizeLabel, onFile }: { name: string; accept: string; label: string; selectedName?: string; maxBytes: number; sizeLabel: string; onFile?: (file: File) => void }) { const [error,setError]=useState(""); return <label className="block cursor-pointer rounded-xl border border-dashed border-brand-300 px-3 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"><span className="flex items-center gap-2"><Upload className="h-4 w-4" />{label}</span><span className="mt-1 block text-[10px] font-normal text-brand-400">Maximum {sizeLabel}</span>{selectedName && !error && <span className="mt-1 block truncate text-[11px] font-semibold text-green-600">Selected: {selectedName}</span>}{error && <span className="mt-1 block text-[11px] font-semibold text-danger-600">{error}</span>}<input name={name} type="file" accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if(file.size>maxBytes){setError(`File is too large. Maximum ${sizeLabel}.`);event.target.value="";return;} setError("");onFile?.(file); }} /></label>; }
function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) { return <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-brand-800"><span>{label}</span><input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-brand-teal" /></label>; }
function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save product</>}</button>; }
