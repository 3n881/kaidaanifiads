import Link from "next/link";
import type { Product } from "@/data/catalog";
import { discountPercent } from "@/lib/catalog";
import CoverImage from "./CoverImage";
import PriceTag from "./PriceTag";
import BuyButton from "./BuyButton";

export default function ProductCard({ product }: { product: Product }) {
  const href = product.isCombo
    ? `/combos/${product.slug}`
    : `/ebooks/${product.slug}`;
  const pct = discountPercent(product);

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-cardhover)]">
      <Link href={href} className="relative block overflow-hidden">
        <CoverImage
          product={product}
          className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-105"
        />
        {/* ID badge (top-left, navy, notched corner) */}
        <span className="absolute left-0 top-0 z-20 rounded-br-lg border-b border-r border-white/20 bg-brand-teal px-2 py-1 text-[11px] font-black uppercase tracking-tighter text-white shadow-md">
          {product.id}
        </span>
        {/* Sale + combo + bestseller badges (top-right) */}
        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5">
          {pct > 0 && (
            <span className="badge-sale flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
              {pct}% सवलत
            </span>
          )}
          {product.isCombo && (
            <span className="badge-combo rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Combo Pack
            </span>
          )}
          {product.featured && (
            <span className="flex items-center gap-1 rounded-lg bg-brand-gold px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-teal shadow">
              ★ बेस्टसेलर
            </span>
          )}
        </div>
        {/* Pages badge (bottom-left, on translucent black) */}
        <span className="absolute bottom-2 left-2 z-20 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          {product.pages} Pages
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={href}>
          <h3 className="font-deva text-[15px] font-bold leading-snug text-brand-900 line-clamp-2 transition group-hover:text-brand-700">
            {product.title}
          </h3>
        </Link>
        <p className="mt-2 font-deva text-xs leading-relaxed text-brand-500 line-clamp-3">
          {product.shortDescription}
        </p>

        <div className="mt-auto pt-4">
          <p className="mb-1 text-[11px] font-medium text-sale-600">
            ऑफर मर्यादित वेळेसाठी फक्त
          </p>
          <PriceTag product={product} />
          <div className="mt-3">
            <BuyButton product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
