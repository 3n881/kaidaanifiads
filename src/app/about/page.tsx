import type { Metadata } from "next";
import { SITE_URL } from "@/lib/supabase/config";
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
  ["Website", new URL(SITE_URL).host],
  ["Operating Since", "2024"],
  ["Support Hours", "Mon – Sat, 9:00 AM – 6:00 PM IST"],
  ["Email", SITE.email],
  ["Phone", SITE.contactPhone],
  ["Address", SITE.address],
];

export default function AboutPage() {
  return (
    <div className="container-x">
      <div className="mx-auto max-w-5xl py-8">
        {/* Hero */}
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
          <h1 className="font-deva bg-gradient-to-r from-brand-teal to-teal-600 bg-clip-text text-3xl font-bold leading-tight text-transparent md:text-5xl">
            कायद्याच्या ज्ञानाने तुम्हाला सक्षम करणे
          </h1>
          <p className="font-deva text-lg leading-relaxed text-gray-600 md:text-xl">
            <strong>कायद्याचं आणि फायद्याचं</strong> मध्ये तुमचे स्वागत आहे. सर्वांसाठी कायद्याची
            गुंतागुंतीची माहिती सोप्या, परवडणाऱ्या आणि समजण्यास सोप्या भाषेत उपलब्ध करून देण्यास आम्ही
            वचनबद्ध आहोत.
          </p>
        </div>

        {/* Mission + What We Do */}
        <div className="mb-20 grid gap-12 md:grid-cols-2">
          <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm">
              <Target className="h-6 w-6" />
            </span>
            <h2 className="font-deva mb-4 text-2xl font-bold text-gray-900">आमचे ध्येय (Mission)</h2>
            <p className="font-deva text-lg leading-relaxed text-gray-700">
              सामान्य माणसासाठी कायदा सोपा करणे. आमचा असा विश्वास आहे की कायद्याचे ज्ञान कोणा एकाचा
              विशेषाधिकार नसून तो प्रत्येकाचा मूलभूत हक्क आहे. क्लिष्ट कायदे आणि त्यांचे दैनंदिन जीवनातील
              उपयोग यांमधील दरी आमच्या साध्या ई-बुक्सच्या माध्यमातून भरून काढणे हेच आमचे ध्येय आहे.
            </p>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </span>
            <h2 className="font-deva mb-4 text-2xl font-bold text-gray-900">आम्ही काय करतो (What We Do)</h2>
            <p className="font-deva text-lg leading-relaxed text-gray-700">
              आम्ही भारतातील दैनंदिन जीवनाशी संबंधित विविध कायदेशीर विषयांवर उच्च-दर्जाची आणि वाचण्यास
              सोपी ई-बुक्स तयार करतो. मालमत्ता कायदा आणि ग्राहक हक्कांपासून ते व्यवसाय नियमनांपर्यंत,
              आमची संसाधने तुम्हाला योग्य निर्णय घेण्यास मदत करण्यासाठी तयार केली गेली आहेत.
            </p>
          </section>
        </div>

        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-colors hover:border-brand-teal/30"
            >
              <p className="mb-2 text-3xl font-bold text-brand-teal">{s.value}</p>
              <p className="font-deva text-sm font-medium text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Why choose us */}
        <section className="mx-auto mb-20 max-w-3xl text-center">
          <h2 className="font-deva mb-6 text-3xl font-bold text-gray-900">आम्हालाच का निवडावे?</h2>
          <p className="font-deva text-lg leading-relaxed text-gray-700">
            कायद्याची क्लिष्ट भाषा भीतीदायक असू शकते. आम्ही हा गोंधळ दूर करतो. आमची कायदेतज्ज्ञ आणि
            संपादकांची टीम कायद्याची भाषा (मराठी आणि इंग्रजीमध्ये) इतकी सोपी करते की तुम्ही ती सहजपणे
            वापरू शकता. तुम्ही विद्यार्थी असाल, व्यावसायिक असाल किंवा एक जागृत नागरिक — आमची पुस्तके
            तुमचे <strong>‘पॉकेट लीगल ॲडव्हायझर्स’</strong> आहेत.
          </p>
        </section>

        {/* Business information */}
        <section className="mx-auto mb-16 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm ring-1 ring-gray-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="font-deva text-xl font-bold text-gray-900">व्यवसाय माहिती (Business Information)</h2>
          </div>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            {BUSINESS.map(([k, v]) => (
              <div key={k} className={k === "Address" ? "md:col-span-2" : ""}>
                <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-gray-400">{k}</dt>
                <dd className="font-deva break-words font-semibold text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="font-deva mt-4 text-xs text-gray-400">
            * आमची उत्पादने केवळ संदर्भ आणि शैक्षणिक उद्देशाने आहेत. हे कायदेशीर सल्ला (Legal Advice) नाही.
          </p>
          <div className="mt-4 rounded-lg border border-brand-teal/20 bg-brand-teal/5 p-3 text-xs leading-relaxed text-gray-600">
            <p className="mb-1 font-semibold text-gray-800">Content Authorization / सामग्री अधिकृतता</p>
            <p>
              All ebook content on this platform is authored by <b>Ajay Mane</b> and <b>{SITE.proprietor}</b>,
              legal literacy authors and educators. They have authorized Kaydyacha Ani Faydyacha (Proprietor:{" "}
              {SITE.proprietor}) to publish and distribute this educational content digitally under the brand
              “कायद्याचं आणि फायद्याचं”.
            </p>
            <p className="font-deva mt-2">
              या प्लॅटफॉर्मवरील सर्व ई-बुक सामग्री <b>अजय माने</b> आणि <b>श्रुतिका गोचडे</b> यांनी लिहिलेली
              आहे.
            </p>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/contact"
            className="font-deva inline-block rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90"
          >
            संपर्क करा
          </Link>
        </div>

        <DisclaimerBanner className="mx-auto mt-8 max-w-3xl" />
      </div>
    </div>
  );
}
