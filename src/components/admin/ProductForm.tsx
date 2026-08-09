"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Loader2, Save, ArrowLeft, Upload, FileText } from "lucide-react";
import type { AdminProduct } from "@/lib/admin";
import { saveProduct } from "@/app/dashboard/actions";

const LANGS = ["Marathi", "Hindi", "English"];
const CATS = ["Property Law", "Civil Law", "Other"];

export default function ProductForm({
  product,
  ebookOptions = [],
  selectedBookIds = [],
}: {
  product?: AdminProduct;
  ebookOptions?: { id: number; title: string }[];
  selectedBookIds?: number[];
}) {
  const [isCombo, setIsCombo] = useState(product?.is_combo ?? false);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    product?.cover_image ?? null,
  );

  return (
    <form action={saveProduct} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main fields */}
        <div className="space-y-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
          <Field label="शीर्षक / Title" required>
            <input
              name="title"
              required
              defaultValue={product?.title}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Slug (URL)" hint="रिकामे ठेवल्यास आपोआप बनते">
              <input
                name="slug"
                defaultValue={product?.slug}
                placeholder="auto-from-title"
                className={inputCls}
              />
            </Field>
            <Field label="भाषा / Language">
              <select
                name="language"
                defaultValue={product?.language ?? "Marathi"}
                className={inputCls}
              >
                {LANGS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="लहान वर्णन / Short description" hint="कार्डवर दिसते">
            <textarea
              name="short_description"
              rows={2}
              defaultValue={product?.short_description ?? ""}
              className={inputCls}
            />
          </Field>

          <Field label="संपूर्ण वर्णन / Description">
            <textarea
              name="description"
              rows={6}
              defaultValue={product?.description ?? ""}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="MRP ₹">
              <input
                name="mrp"
                type="number"
                min={0}
                defaultValue={product?.mrp ?? 0}
                className={inputCls}
              />
            </Field>
            <Field label="Price ₹">
              <input
                name="price"
                type="number"
                min={0}
                defaultValue={product?.price ?? 0}
                className={inputCls}
              />
            </Field>
            <Field label="Pages">
              <input
                name="pages"
                type="number"
                min={0}
                defaultValue={product?.pages ?? 0}
                className={inputCls}
              />
            </Field>
            <Field label="Rating">
              <input
                name="rating"
                type="number"
                step="0.1"
                min={0}
                max={5}
                defaultValue={product?.rating ?? 4.8}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select
                name="category"
                defaultValue={product?.category ?? "Other"}
                className={inputCls}
              >
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Sort order" hint="लहान = आधी">
              <input
                name="sort_order"
                type="number"
                defaultValue={product?.sort_order ?? 0}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Sidebar: flags + uploads */}
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
            <Toggle
              name="is_combo"
              label="कॉम्बो पॅक आहे?"
              defaultChecked={product?.is_combo ?? false}
              onChange={setIsCombo}
            />
            {isCombo && (
              <>
                <Field label="Set size (किती पुस्तके)">
                  <input
                    name="set_size"
                    type="number"
                    min={2}
                    defaultValue={product?.set_size ?? 2}
                    className={inputCls}
                  />
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-brand-700">
                    समाविष्ट पुस्तके निवडा
                  </p>
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-brand-200 p-2">
                    {ebookOptions.length === 0 && (
                      <p className="p-2 text-xs text-brand-400">
                        आधी काही ई-बुक्स जोडा.
                      </p>
                    )}
                    {ebookOptions.map((b) => (
                      <label
                        key={b.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50"
                      >
                        <input
                          type="checkbox"
                          name="combo_book"
                          value={b.id}
                          defaultChecked={selectedBookIds.includes(b.id)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-teal"
                        />
                        <span className="font-deva text-xs leading-snug text-brand-700">
                          {b.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Toggle
              name="featured"
              label="Featured (बेस्टसेलर)"
              defaultChecked={product?.featured ?? false}
            />
            <Toggle
              name="active"
              label="Active (साइटवर दाखवा)"
              defaultChecked={product?.active ?? true}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
            <div>
              <p className="mb-2 text-sm font-semibold text-brand-700">
                कव्हर इमेज / Cover
              </p>
              {coverPreview && (
                <Image
                  src={coverPreview}
                  alt="cover"
                  width={120}
                  height={160}
                  className="mb-2 h-32 w-auto rounded-lg border border-brand-100 object-cover"
                  unoptimized
                />
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand-300 px-3 py-2.5 text-sm text-brand-500 hover:bg-brand-50">
                <Upload className="h-4 w-4" />
                <span>इमेज निवडा (JPG/PNG)</span>
                <input
                  name="cover_file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCoverPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-brand-700">
                PDF फाइल
              </p>
              {product?.pdf_path && (
                <p className="mb-2 inline-flex items-center gap-1 text-xs text-green-600">
                  <FileText className="h-3.5 w-3.5" /> Uploaded
                </p>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand-300 px-3 py-2.5 text-sm text-brand-500 hover:bg-brand-50">
                <Upload className="h-4 w-4" />
                <span>PDF निवडा</span>
                <input
                  name="pdf_file"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[11px] text-brand-400">
                खाजगी bucket मध्ये साठवली जाते; पेमेंटनंतर signed link मिळते.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          <ArrowLeft className="h-4 w-4" /> रद्द करा
        </Link>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 font-deva";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand-700">
        {label}
        {required && <span className="text-danger-600">*</span>}
        {hint && <span className="font-normal text-brand-400">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-deva text-sm font-medium text-brand-800">
        {label}
      </span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-5 w-5 accent-brand-teal"
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> सेव्ह होत आहे…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" /> सेव्ह करा
        </>
      )}
    </button>
  );
}
