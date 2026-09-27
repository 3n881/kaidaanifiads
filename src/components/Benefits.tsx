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
    <section className="py-16">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-deva text-2xl font-extrabold text-brand-900 sm:text-3xl">
            {HEADINGS[locale]}
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFITS[locale].map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-[var(--shadow-card)]"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <b.icon className="h-7 w-7" />
              </span>
              <h3 className="font-deva mt-4 text-lg font-bold text-brand-900">
                {b.title}
              </h3>
              <p className="font-deva mt-2 text-sm leading-relaxed text-brand-500">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
