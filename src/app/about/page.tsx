import type { Metadata } from "next";
import { SITE_URL } from "@/lib/supabase/config";
import Link from "next/link";
import { Target, BookOpen, ShieldCheck } from "lucide-react";
import { SITE } from "@/data/catalog";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { Tr, type Localized } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "आमच्याबद्दल",
  description:
    "कायद्याचं आणि फायद्याचं — सर्वांसाठी कायद्याची माहिती सोप्या, परवडणाऱ्या भाषेत उपलब्ध करून देणारे डिजिटल व्यासपीठ.",
};

const STATS: { value: string; label: Localized }[] = [
  { value: "50+", label: { mr: "प्रकाशित ई-बुक्स", hi: "प्रकाशित ई-बुक्स", en: "Ebooks published" } },
  { value: "10k+", label: { mr: "समाधानी वाचक", hi: "संतुष्ट पाठक", en: "Happy readers" } },
  { value: "65k+", label: { mr: "सोशल कम्युनिटी", hi: "सोशल कम्युनिटी", en: "Social community" } },
  { value: "24/7", label: { mr: "सपोर्ट ॲक्सेस", hi: "सपोर्ट एक्सेस", en: "Support access" } },
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
            <Tr mr="कायद्याच्या ज्ञानाने तुम्हाला सक्षम करणे" hi="कानून के ज्ञान से आपको सशक्त बनाना" en="Empowering you with legal knowledge" />
          </h1>
          <p className="font-deva text-lg leading-relaxed text-gray-600 md:text-xl">
            <Tr
              mr="कायद्याचं आणि फायद्याचं मध्ये तुमचे स्वागत आहे. सर्वांसाठी कायद्याची गुंतागुंतीची माहिती सोप्या, परवडणाऱ्या आणि समजण्यास सोप्या भाषेत उपलब्ध करून देण्यास आम्ही वचनबद्ध आहोत."
              hi="कायद्याचं आणि फायद्याचं में आपका स्वागत है। हम सभी के लिए कानून की जटिल जानकारी को आसान, किफ़ायती और समझने में सरल भाषा में उपलब्ध कराने के लिए प्रतिबद्ध हैं।"
              en="Welcome to Kaydyacha Ani Faydyacha. We are committed to making complex legal information simple, affordable and easy to understand for everyone."
            />
          </p>
        </div>

        {/* Mission + What We Do */}
        <div className="mb-20 grid gap-12 md:grid-cols-2">
          <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm">
              <Target className="h-6 w-6" />
            </span>
            <h2 className="font-deva mb-4 text-2xl font-bold text-gray-900">
              <Tr mr="आमचे ध्येय (Mission)" hi="हमारा लक्ष्य (Mission)" en="Our mission" />
            </h2>
            <p className="font-deva text-lg leading-relaxed text-gray-700">
              <Tr
                mr="सामान्य माणसासाठी कायदा सोपा करणे. आमचा असा विश्वास आहे की कायद्याचे ज्ञान कोणा एकाचा विशेषाधिकार नसून तो प्रत्येकाचा मूलभूत हक्क आहे. क्लिष्ट कायदे आणि त्यांचे दैनंदिन जीवनातील उपयोग यांमधील दरी आमच्या साध्या ई-बुक्सच्या माध्यमातून भरून काढणे हेच आमचे ध्येय आहे."
                hi="आम आदमी के लिए कानून को आसान बनाना। हमारा मानना है कि कानून का ज्ञान किसी एक का विशेषाधिकार नहीं, बल्कि हर व्यक्ति का मूल अधिकार है। जटिल कानूनों और रोज़मर्रा की ज़िंदगी में उनके उपयोग के बीच की दूरी को अपनी सरल ई-बुक्स से कम करना ही हमारा लक्ष्य है।"
                en="Making the law simple for everyday people. We believe legal knowledge is not a privilege of a few but a basic right of everyone. Our goal is to bridge the gap between complex laws and their use in daily life through simple ebooks."
              />
            </p>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </span>
            <h2 className="font-deva mb-4 text-2xl font-bold text-gray-900">
              <Tr mr="आम्ही काय करतो (What We Do)" hi="हम क्या करते हैं (What We Do)" en="What we do" />
            </h2>
            <p className="font-deva text-lg leading-relaxed text-gray-700">
              <Tr
                mr="आम्ही भारतातील दैनंदिन जीवनाशी संबंधित विविध कायदेशीर विषयांवर उच्च-दर्जाची आणि वाचण्यास सोपी ई-बुक्स तयार करतो. मालमत्ता कायदा आणि ग्राहक हक्कांपासून ते व्यवसाय नियमनांपर्यंत, आमची संसाधने तुम्हाला योग्य निर्णय घेण्यास मदत करण्यासाठी तयार केली गेली आहेत."
                hi="हम भारत में रोज़मर्रा की ज़िंदगी से जुड़े विभिन्न कानूनी विषयों पर उच्च गुणवत्ता वाली और पढ़ने में आसान ई-बुक्स बनाते हैं। संपत्ति कानून और उपभोक्ता अधिकारों से लेकर व्यापार नियमों तक, हमारी सामग्री आपको सही निर्णय लेने में मदद के लिए बनाई गई है।"
                en="We create high-quality, easy-to-read ebooks on legal topics from everyday life in India. From property law and consumer rights to business rules, our resources are made to help you make the right decisions."
              />
            </p>
          </section>
        </div>

        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.value}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-colors hover:border-brand-teal/30"
            >
              <p className="mb-2 text-3xl font-bold text-brand-teal">{s.value}</p>
              <p className="font-deva text-sm font-medium text-gray-600">
                <Tr {...s.label} />
              </p>
            </div>
          ))}
        </div>

        {/* Why choose us */}
        <section className="mx-auto mb-20 max-w-3xl text-center">
          <h2 className="font-deva mb-6 text-3xl font-bold text-gray-900">
            <Tr mr="आम्हालाच का निवडावे?" hi="हमें ही क्यों चुनें?" en="Why choose us?" />
          </h2>
          <p className="font-deva text-lg leading-relaxed text-gray-700">
            <Tr
              mr="कायद्याची क्लिष्ट भाषा भीतीदायक असू शकते. आम्ही हा गोंधळ दूर करतो. आमची कायदेतज्ज्ञ आणि संपादकांची टीम कायद्याची भाषा (मराठी आणि इंग्रजीमध्ये) इतकी सोपी करते की तुम्ही ती सहजपणे वापरू शकता. तुम्ही विद्यार्थी असाल, व्यावसायिक असाल किंवा एक जागृत नागरिक — आमची पुस्तके तुमचे ‘पॉकेट लीगल ॲडव्हायझर्स’ आहेत."
              hi="कानून की जटिल भाषा डरावनी लग सकती है। हम यह उलझन दूर करते हैं। हमारी कानूनी विशेषज्ञों और संपादकों की टीम कानून की भाषा को इतना आसान बनाती है कि आप उसे सहजता से इस्तेमाल कर सकें। आप छात्र हों, व्यवसायी हों या जागरूक नागरिक — हमारी किताबें आपके ‘पॉकेट लीगल एडवाइज़र’ हैं।"
              en="Legal language can feel intimidating. We clear the confusion. Our team of legal experts and editors makes the law so simple that you can use it with ease. Whether you are a student, a professional or an aware citizen — our books are your ‘pocket legal advisers’."
            />
          </p>
        </section>

        {/* Business information */}
        <section className="mx-auto mb-16 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm ring-1 ring-gray-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="font-deva text-xl font-bold text-gray-900">
              <Tr mr="व्यवसाय माहिती (Business Information)" hi="व्यवसाय जानकारी (Business Information)" en="Business information" />
            </h2>
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
            <Tr
              mr="* आमची उत्पादने केवळ संदर्भ आणि शैक्षणिक उद्देशाने आहेत. हे कायदेशीर सल्ला (Legal Advice) नाही."
              hi="* हमारे उत्पाद केवल संदर्भ और शैक्षणिक उद्देश्य के लिए हैं। यह कानूनी सलाह (Legal Advice) नहीं है।"
              en="* Our products are for reference and education only. They are not legal advice."
            />
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
            <Tr mr="संपर्क करा" hi="संपर्क करें" en="Contact us" />
          </Link>
        </div>

        <DisclaimerBanner className="mx-auto mt-8 max-w-3xl" />
      </div>
    </div>
  );
}
