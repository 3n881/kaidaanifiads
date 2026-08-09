import type { Metadata } from "next";
import Link from "next/link";
import { Target, BookOpen, ShieldCheck } from "lucide-react";
import { SITE } from "@/data/catalog";
import DisclaimerBanner from "@/components/DisclaimerBanner";

export const metadata: Metadata = {
  title: "आमच्याबद्दल",
  description:
    "कायद्याचं आणि फायद्याचं — सर्वांसाठी कायद्याची माहिती सोप्या, परवडणाऱ्या भाषेत उपलब्ध करून देणारे डिजिटल व्यासपीठ.",
};

const STATS = [
  { value: "50+", label: "प्रकाशित ई-बुक्स" },
  { value: "10k+", label: "समाधानी वाचक" },
  { value: "65k+", label: "सोशल कम्युनिटी" },
  { value: "24/7", label: "सपोर्ट ॲक्सेस" },
];

const BUSINESS: Array<[string, string]> = [
  ["Registered Enterprise Name", "KAYDYACHA ANI FAYDYACHA"],
  ["Proprietor / Owner", SITE.proprietor],
  ["Brand Name", "कायद्याचं आणि फायद्याचं"],
  ["Business Type", "Digital Goods — Educational Ebooks (PDF only)"],
  ["Registration", `Udyam Registration (MSME) — ${SITE.udyam}`],
  ["Website", "kaydyachaanifaydyach.com"],
  ["Operating Since", "2024"],
  ["Support Hours", "Mon – Sat, 9:00 AM – 6:00 PM IST"],
  ["Email", SITE.email],
  ["Phone", SITE.contactPhone],
  ["Address", SITE.address],
];

export default function AboutPage() {
  return (
    <div className="container-x max-w-4xl py-12">
      {/* Hero */}
      <div className="text-center">
        <span className="font-deva inline-block rounded-full bg-brand-teal/5 px-3 py-1 text-xs font-semibold text-brand-teal">
          आमच्याबद्दल (About)
        </span>
        <h1 className="font-deva mt-4 text-3xl font-extrabold text-brand-teal sm:text-4xl">
          कायद्याच्या ज्ञानाने तुम्हाला सक्षम करणे
        </h1>
        <p className="font-deva mx-auto mt-4 max-w-2xl text-base leading-relaxed text-brand-600">
          <b>कायद्याचं आणि फायद्याचं</b> मध्ये तुमचे स्वागत आहे. सर्वांसाठी
          कायद्याची गुंतागुंतीची माहिती सोप्या, परवडणाऱ्या आणि समजण्यास सोप्या
          भाषेत उपलब्ध करून देण्यास आम्ही वचनबद्ध आहोत.
        </p>
      </div>

      {/* Mission + What We Do */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            <Target className="h-5 w-5" />
          </span>
          <h2 className="font-deva mt-4 text-lg font-bold text-brand-900">
            आमचे ध्येय (Mission)
          </h2>
          <p className="font-deva mt-2 text-sm leading-relaxed text-brand-600">
            सामान्य माणसासाठी कायदा सोपा करणे. आमचा असा विश्वास आहे की कायद्याचे
            ज्ञान कोणा एकाचा विशेषाधिकार नसून तो प्रत्येकाचा मूलभूत हक्क आहे. क्लिष्ट
            कायदे आणि त्यांचे दैनंदिन जीवनातील उपयोग यांमधील दरी आमच्या साध्या
            ई-बुक्सच्या माध्यमातून भरून काढणे हेच आमचे ध्येय आहे.
          </p>
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
            <BookOpen className="h-5 w-5" />
          </span>
          <h2 className="font-deva mt-4 text-lg font-bold text-brand-900">
            आम्ही काय करतो (What We Do)
          </h2>
          <p className="font-deva mt-2 text-sm leading-relaxed text-brand-600">
            आम्ही भारतातील दैनंदिन जीवनाशी संबंधित विविध कायदेशीर विषयांवर
            उच्च-दर्जाची आणि वाचण्यास सोपी ई-बुक्स तयार करतो. मालमत्ता कायदा आणि
            ग्राहक हक्कांपासून ते व्यवसाय नियमनांपर्यंत, आमची संसाधने तुम्हाला योग्य
            निर्णय घेण्यास मदत करण्यासाठी तयार केली गेली आहेत.
          </p>
        </section>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-brand-100 bg-brand-teal/5 p-5 text-center"
          >
            <p className="text-2xl font-extrabold text-brand-teal">{s.value}</p>
            <p className="font-deva mt-1 text-xs text-brand-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Why choose us */}
      <section className="mt-12 rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h2 className="font-deva mt-4 text-lg font-bold text-brand-900">
          आम्हालाच का निवडावे?
        </h2>
        <p className="font-deva mt-2 text-sm leading-relaxed text-brand-600">
          कायद्याची क्लिष्ट भाषा भीतीदायक असू शकते. आम्ही हा गोंधळ दूर करतो. आमची
          कायदेतज्ज्ञ आणि संपादकांची टीम कायद्याची भाषा (मराठी आणि इंग्रजीमध्ये)
          इतकी सोपी करते की तुम्ही ती सहजपणे वापरू शकता. तुम्ही विद्यार्थी असाल,
          व्यावसायिक असाल किंवा एक जागृत नागरिक — आमची पुस्तके तुमचे ‘पॉकेट लीगल
          ॲडव्हायझर्स’ आहेत.
        </p>
      </section>

      {/* Business information */}
      <section className="mt-12">
        <h2 className="font-deva text-lg font-bold text-brand-900">
          व्यवसाय माहिती (Business Information)
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-brand-100">
              {BUSINESS.map(([k, v]) => (
                <tr key={k} className="bg-white">
                  <th className="w-2/5 bg-brand-teal/5 px-4 py-3 align-top font-semibold text-brand-700">
                    {k}
                  </th>
                  <td className="font-deva px-4 py-3 text-brand-600">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-deva mt-3 text-xs text-brand-400">
          * आमची उत्पादने केवळ संदर्भ आणि शैक्षणिक उद्देशाने आहेत. हे कायदेशीर सल्ला
          (Legal Advice) नाही.
        </p>
      </section>

      {/* Content authorization */}
      <section className="mt-8 rounded-2xl border border-brand-100 bg-brand-teal/5 p-6">
        <h2 className="font-deva text-base font-bold text-brand-900">
          Content Authorization / सामग्री अधिकृतता
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-600">
          All ebook content on this platform is authored by <b>Ajay Mane</b> and{" "}
          <b>{SITE.proprietor}</b>, legal literacy authors and educators. They
          have authorized Kaydyacha Ani Faydyacha (Proprietor: {SITE.proprietor})
          to publish and distribute this educational content digitally under the
          brand “कायद्याचं आणि फायद्याचं”.
        </p>
        <p className="font-deva mt-3 text-sm leading-relaxed text-brand-600">
          या प्लॅटफॉर्मवरील सर्व ई-बुक सामग्री <b>अजय माने</b> आणि{" "}
          <b>श्रुतिका गोचडे</b> यांनी लिहिलेली आहे.
        </p>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/contact"
          className="font-deva inline-block rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90"
        >
          संपर्क करा
        </Link>
      </div>

      <DisclaimerBanner className="mt-8" />
    </div>
  );
}
