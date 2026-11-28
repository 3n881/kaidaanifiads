import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CONSULT_COPY, CONSULT_PRICE } from "@/lib/consult-copy";
import type { Locale } from "@/lib/i18n";

/** "Talk to an expert about this topic" — on the order page and book pages, opens /consultation on the book's topic. */
export default function ConsultCard({ productId, locale, className = "" }: { productId: number | null; locale: Locale; className?: string }) {
  const c = CONSULT_COPY[locale];
  return (
    <Link
      href={`/consultation${productId ? `?book=${productId}` : ""}`}
      className={`font-deva flex items-center gap-3 rounded-2xl border-2 border-brand-gold/50 bg-brand-gold/10 p-3 text-left transition hover:bg-brand-gold/20 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block text-sm font-extrabold text-brand-900">{c.orderCardTitle}</span>
        <span className="block text-[11px] font-semibold text-brand-600">{c.orderCardText(CONSULT_PRICE)}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-brand-teal px-2.5 py-1.5 text-xs font-bold text-white">{c.orderCardButton}</span>
    </Link>
  );
}
