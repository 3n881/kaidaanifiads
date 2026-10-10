"use client";

import { Languages, GraduationCap, IndianRupee } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const BENEFITS = {
  mr: [
  {
    icon: Languages,
    title: "सोपी भाषा",
    desc: "कायद्याची क्लिष्ट आणि अवघड भाषा सोप्या मराठीत समजून घ्या.",
  },
  {
    icon: GraduationCap,
    title: "तज्ञांचे मार्गदर्शन",
    desc: "उच्च न्यायालयातील अनुभवी वकीलांकडून तयार केलेले खात्रीशीर साहित्य.",
  },
  {
    icon: IndianRupee,
    title: "किफायतशीर दर",
    desc: "सर्वसामान्यांना सहज परवडणाऱ्या दरात कायदेशीर ई-बुक्स उपलब्ध.",
  },
  ],
  hi: [
    { icon: Languages, title: "आसान भाषा", desc: "कानून की जटिल भाषा को सरल हिंदी में समझें।" },
    { icon: GraduationCap, title: "विशेषज्ञ मार्गदर्शन", desc: "अनुभवी कानूनी विशेषज्ञों द्वारा तैयार भरोसेमंद सामग्री।" },
    { icon: IndianRupee, title: "किफायती कीमत", desc: "सभी के लिए उचित कीमत पर उपयोगी कानूनी ई-बुक्स।" },
  ],
  en: [
    { icon: Languages, title: "Plain language", desc: "Understand complex legal topics in clear, approachable language." },
    { icon: GraduationCap, title: "Expert guidance", desc: "Dependable material prepared with experienced legal professionals." },
    { icon: IndianRupee, title: "Affordable", desc: "Useful legal ebooks at prices designed for everyday readers." },
  ],
} as const;

const HEADINGS = { mr: "नागरिकांसाठी महत्त्वाचे फायदे", hi: "नागरिकों के लिए महत्वपूर्ण लाभ", en: "Practical benefits for every reader" } as const;

export default function Benefits() {
  const { locale } = useLanguage();
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="font-deva relative mb-10 inline-block text-2xl font-bold text-brand-teal md:mb-16 md:text-4xl">
          {HEADINGS[locale]}
          <span className="absolute -bottom-3 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-brand-gold md:h-1.5 md:w-24" />
        </h2>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {BENEFITS[locale].map((b, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl md:p-8"
            >
              {i === 1 && (
                <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-bl-full bg-brand-gold/10 transition-transform group-hover:scale-110" />
              )}
              <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-teal/5 text-brand-teal transition-colors duration-300 group-hover:bg-brand-gold/20 md:mb-6 md:h-20 md:w-20">
                <b.icon className="h-8 w-8 md:h-9 md:w-9" aria-hidden="true" />
              </div>
              <h3 className="font-deva relative mb-3 text-xl font-bold text-brand-teal md:mb-4 md:text-2xl">
                {b.title}
              </h3>
              <p className="font-deva relative text-base leading-relaxed text-brand-500 md:text-lg">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
