import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Dark title strip at the top of /ebooks and /combos (as on the original site). */
export default function ListBanner({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-slate-900 py-3 text-white">
      <div className="container-x relative z-10 flex items-center">
        <Link
          href="/"
          aria-label="मुख्यपृष्ठ (Home)"
          className="shrink-0 rounded-full p-1.5 text-brand-gold transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="flex-1 pr-8 text-center">
          <h1 className="font-deva text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-gray-300 md:text-xs">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
