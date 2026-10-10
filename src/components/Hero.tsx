"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { SITE } from "@/data/catalog";
import { useLanguage } from "./LanguageProvider";

// Layout and styling follow the original site's hero.
const COPY = {
  mr: { title1: "सोप्या भाषेत", title2: "कायदे -", accent: "तुमच्या हक्कांसाठी", body: "शेतकरी, सामान्य नागरिक आणि महिलांसाठी जमीन आणि वारसा हक्कांची विश्वासार्ह माहिती एका क्लिकवर.", search: "पुस्तके शोधा (Search books)...", searchShort: "शोधा (Search)...", popular: "लोकप्रिय:", books: "प्रकाशन पहा (View Books)", readers: "वाचक", rating: "रेटिंग", authentic: "100% अधिकृत", info: "कायदेशीर माहिती" },
  hi: { title1: "आसान भाषा में", title2: "कानून -", accent: "आपके अधिकारों के लिए", body: "किसानों, नागरिकों और महिलाओं के लिए जमीन और विरासत के अधिकारों की भरोसेमंद जानकारी।", search: "किताबें खोजें (Search books)...", searchShort: "खोजें (Search)...", popular: "लोकप्रिय:", books: "किताबें देखें (View Books)", readers: "पाठक", rating: "रेटिंग", authentic: "100% प्रामाणिक", info: "कानूनी जानकारी" },
  en: { title1: "Law in plain", title2: "language -", accent: "for your rights", body: "Reliable information about land, inheritance, and everyday rights for farmers, citizens, and women.", search: "Search books...", searchShort: "Search...", popular: "Popular:", books: "View Books", readers: "Readers", rating: "Rating", authentic: "100% authentic", info: "Legal information" },
} as const;

// Popular topics under the search box (same three topics in every language).
const TAGS = {
  mr: SITE.popularTags,
  hi: ["विरासत अधिकार", "किसान कानून", "घर खरीद"],
  en: ["Inheritance", "Farmer law", "Buying a home"],
} as const;

export default function Hero() {
  const { locale } = useLanguage();
  const copy = COPY[locale];
  return (
    <section className="relative flex min-h-fit items-center overflow-hidden bg-brand-teal pb-12 pt-4 text-white md:min-h-[600px] md:py-20 lg:min-h-screen lg:py-24">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left column */}
          <div className="flex flex-col space-y-4 pt-2 text-center lg:space-y-8 lg:text-left">
            <div className="space-y-4 md:space-y-6">
              {/* Visible from the first paint (slide only, no fade) — it is the
                  page's main content for PageSpeed's LCP. */}
              <h1
                className="font-deva animate-slide-in-up bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-3xl font-black leading-[1.1] tracking-tight text-transparent sm:text-5xl"
                style={{ animationDelay: "0.1s" }}
              >
                {copy.title1}
                <br />
                {copy.title2}{" "}
                <span className="bg-gradient-to-r from-brand-gold via-yellow-200 to-brand-gold bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,193,7,0.3)]">
                  {copy.accent}
                </span>
              </h1>
              <p
                className="font-deva animate-slide-in-up mx-auto max-w-md text-sm font-normal leading-relaxed text-slate-300 md:max-w-xl md:text-lg lg:mx-0 lg:text-xl"
                style={{ animationDelay: "0.2s" }}
              >
                {copy.body}
              </p>
              <p
                className="animate-fade-in-up mx-auto max-w-md text-[11px] font-medium text-brand-gold md:max-w-xl md:text-xs lg:mx-0"
                style={{ animationDelay: "0.3s" }}
              >
                📘 Digital PDF Ebooks · Educational Reference Material · Not Legal Advice or Consultancy
              </p>
            </div>

            <div
              className="animate-fade-in-up mx-auto flex w-full max-w-lg flex-col gap-4 lg:mx-0"
              style={{ animationDelay: "0.4s" }}
            >
              {/* search */}
              <div className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-gold/20 to-yellow-500/20 opacity-30 blur-lg transition duration-500 group-hover:opacity-100" />
                <Link
                  href="/ebooks"
                  className="relative flex h-14 w-full items-center rounded-2xl border border-white/15 bg-white/5 pl-11 pr-4 text-sm text-white shadow-sm backdrop-blur-3xl transition-all duration-300 hover:border-brand-gold/40 hover:bg-white/10 md:h-16 md:text-lg"
                >
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-gold" />
                  <span className="font-deva hidden lg:inline">{copy.search}</span>
                  <span className="font-deva lg:hidden">{copy.searchShort}</span>
                </Link>
              </div>

              {/* popular tags */}
              <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                <span className="font-deva shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-gold/90">
                  {copy.popular}
                </span>
                {TAGS[locale].map((tag) => (
                  <Link
                    key={tag}
                    href="/ebooks"
                    className="font-deva shrink-0 whitespace-nowrap rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:text-xs"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/ebooks"
                className="font-deva flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gold px-8 text-base font-black text-brand-teal shadow-xl shadow-brand-gold/20 transition-all duration-300 hover:bg-yellow-400 active:scale-[0.98] lg:w-fit"
              >
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                {copy.books}
              </Link>
            </div>

            {/* stats */}
            <div
              className="animate-fade-in-up grid grid-cols-2 gap-3 pt-2 lg:flex lg:justify-start lg:gap-4"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-teal bg-brand-gold/80 text-[8px] font-bold text-brand-teal"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black leading-none text-white">{SITE.stats.readers}</p>
                  <p className="font-deva text-[8px] font-medium text-slate-400">{copy.readers}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
                <TrendingUp className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                <div className="text-left">
                  <p className="text-[10px] font-black leading-none text-white">{SITE.stats.rating}</p>
                  <p className="font-deva text-[8px] font-medium text-slate-400">{copy.rating}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — floating emblem (desktop only) */}
          <div className="relative mt-4 hidden items-center justify-center lg:mt-0 lg:flex lg:justify-end">
            <div className="relative aspect-square w-full max-w-[28rem]">
              <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/5 blur-3xl" />
              <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 opacity-50" />
              <div className="animate-float relative z-10 h-full w-full overflow-hidden rounded-full border-8 border-white/10 bg-white shadow-2xl">
                <Image
                  src="/brand/hero.webp"
                  alt="कायद्याचं आणि फायद्याचं — Official Platform Logo"
                  fill
                  preload
                  sizes="448px"
                  className="object-cover"
                />
              </div>
              <div className="animate-bounce-slow absolute -left-4 -top-4 z-20 flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl shadow-xl backdrop-blur-xl">
                📖
              </div>
              <div className="animate-bounce-slow absolute -right-6 bottom-8 z-20 flex items-center gap-3 rounded-xl border border-brand-gold/20 bg-white/95 p-3 shadow-xl ring-2 ring-brand-teal/5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="font-deva block text-xs font-black leading-none text-gray-900">{copy.authentic}</span>
                  <span className="font-deva mt-1 block text-[9px] font-bold uppercase text-brand-teal opacity-60">{copy.info}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* navy → white fade into the next section */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white to-transparent md:h-32" />
    </section>
  );
}
