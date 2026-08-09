import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/data/catalog";
import Carousel from "./Carousel";

export default function ProductRow({
  eyebrow,
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <section className="py-14">
      <div className="container-x">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <span className="font-deva inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                {eyebrow}
              </span>
            )}
            <h2 className="font-deva mt-3 text-2xl font-extrabold text-brand-900 sm:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="font-deva mt-2 text-brand-500">{subtitle}</p>
            )}
          </div>
          <Link
            href={viewAllHref}
            className="font-deva inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            {viewAllLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8">
          <Carousel products={products} />
        </div>
      </div>
    </section>
  );
}
