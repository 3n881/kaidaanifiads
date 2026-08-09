import type { Product } from "@/data/catalog";
import { discountPercent } from "@/lib/catalog";

export default function PriceTag({
  product,
  size = "md",
}: {
  product: Product;
  size?: "md" | "lg";
}) {
  const pct = discountPercent(product);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-brand-400 line-through">₹{product.mrp}</span>
      <span
        className={`font-extrabold text-brand-700 ${
          size === "lg" ? "text-3xl" : "text-xl"
        }`}
      >
        ₹{product.price}
      </span>
      {pct > 0 && (
        <span className="rounded-md bg-sale-500/10 px-1.5 py-0.5 text-xs font-bold text-sale-600">
          {pct}% OFF
        </span>
      )}
    </div>
  );
}
