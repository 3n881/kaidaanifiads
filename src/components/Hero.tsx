import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Star,
  Users,
  ArrowRight,
  Search,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { SITE } from "@/data/catalog";

export default function Hero() {
  return (
    <section className="relative flex min-h-fit items-center overflow-hidden bg-brand-teal text-white md:min-h-[600px] lg:min-h-screen">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* smooth navy → white fade into the section below (matches live site) */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-20 w-full bg-gradient-to-t from-white to-transparent md:h-36" />

      <div className="container-x relative z-20 w-full pt-6 pb-16 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Left column — staggered entrance */}
          <div className="text-center lg:text-left">
            <span
              className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold"
              style={{ animationDelay: "0.05s" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> 100% अधिकृत कायदेशीर माहिती
            </span>

            <h1
              className="font-deva animate-fade-in-up mt-5 text-3xl font-black leading-[1.15] tracking-tight text-white sm:text-5xl"
              style={{ animationDelay: "0.15s" }}
            >
              सोप्या भाषेत कायदे -{" "}
              <span className="bg-gradient-to-r from-brand-gold via-yellow-200 to-brand-gold bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,211,1,0.3)]">
                तुमच्या हक्कांसाठी
              </span>
            </h1>

            <p
              className="font-deva animate-fade-in-up mx-auto mt-4 max-w-md text-base text-slate-300 lg:mx-0"
              style={{ animationDelay: "0.25s" }}
            >
              शेतकरी, सामान्य नागरिक आणि महिलांसाठी जमीन आणि वारसा हक्कांची
              विश्वासार्ह माहिती एका क्लिकवर.
            </p>
            <p
              className="animate-fade-in-up mt-3 text-xs font-medium text-slate-400"
              style={{ animationDelay: "0.32s" }}
            >
              📘 Digital PDF Ebooks · Educational Reference Material · Not Legal
              Advice or Consultancy
            </p>

            {/* search */}
            <Link
              href="/ebooks"
              className="animate-fade-in-up mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400 backdrop-blur transition hover:border-white/20 lg:max-w-md"
              style={{ animationDelay: "0.4s" }}
            >
              <Search className="h-4 w-4" />
              <span className="font-deva">पुस्तके शोधा (Search books)…</span>
            </Link>

            {/* tags */}
            <div
              className="animate-fade-in-up mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
              style={{ animationDelay: "0.48s" }}
            >
              <span className="font-deva text-sm text-slate-400">लोकप्रिय:</span>
              {SITE.popularTags.map((tag) => (
                <Link
                  key={tag}
                  href="/ebooks"
                  className="font-deva rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:border-brand-gold/40 hover:text-brand-gold"
                >
                  {tag}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div
              className="animate-fade-in-up mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
              style={{ animationDelay: "0.56s" }}
            >
              <Link
                href="/ebooks"
                className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-teal shadow-[var(--shadow-gold)] transition hover:bg-brand-gold/90 sm:w-auto"
              >
                प्रकाशन पहा (View Books) <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/combos"
                className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/5 sm:w-auto"
              >
                कॉम्बो पॅक्स
              </Link>
            </div>

            {/* stats */}
            <div
              className="animate-fade-in-up mx-auto mt-9 grid max-w-md grid-cols-3 gap-3 lg:mx-0"
              style={{ animationDelay: "0.64s" }}
            >
              <Stat icon={Users} value={SITE.stats.readers} label="वाचक" />
              <Stat icon={Star} value={SITE.stats.rating} label="रेटिंग" />
              <Stat icon={ShieldCheck} value="100%" label="अधिकृत" />
            </div>
          </div>

          {/* Right column — floating circular emblem (desktop only) */}
          <div
            className="animate-fade-in-up relative mt-6 hidden items-center justify-center lg:mt-0 lg:flex lg:justify-end"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="relative aspect-square w-full max-w-[20rem] sm:max-w-[24rem] lg:max-w-[28rem]">
              {/* gold glow */}
              <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/15 blur-3xl" />
              {/* dashed ring accent */}
              <div className="absolute left-1/2 top-1/2 h-[108%] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand-gold/20" />
              {/* the emblem — big white circle, gently bouncing (float, -20px like the live site) */}
              <div className="animate-float relative z-10 h-full w-full overflow-hidden rounded-full bg-white shadow-2xl ring-4 ring-white/10">
                <Image
                  src="/brand/hero.webp"
                  alt="कायद्याचं आणि फायद्याचं — Official Platform Logo"
                  fill
                  preload
                  sizes="(max-width: 640px) 320px, (max-width: 1024px) 384px, 448px"
                  className="object-cover"
                />
              </div>

              {/* floating book badge (top-left) — bounces */}
              <div className="animate-bounce-slow absolute left-2 top-2 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-blue-600 text-white shadow-lg sm:left-0 sm:top-4">
                <BookOpen className="h-5 w-5" />
              </div>

              {/* 100% authentic card (bottom-right) — bounces gently, offset phase */}
              <div
                className="animate-bounce-slow absolute -bottom-2 right-0 z-20 flex items-center gap-2 rounded-2xl border border-brand-gold/20 bg-white px-3 py-2 shadow-xl sm:-right-3"
                style={{ animationDelay: "1s" }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-left">
                  <span className="font-deva block text-sm font-black leading-none text-brand-teal">
                    100% अधिकृत
                  </span>
                  <span className="font-deva block text-[10px] font-medium text-brand-400">
                    कायदेशीर माहिती
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <Icon className="mx-auto h-5 w-5 text-brand-gold lg:mx-0" />
      <p className="mt-2 text-xl font-black text-white">{value}</p>
      <p className="font-deva text-xs text-slate-400">{label}</p>
    </div>
  );
}
