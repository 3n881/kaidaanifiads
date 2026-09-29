"use client";

import { CreditCard, FileDown, MousePointerClick, Smartphone } from "lucide-react";
import { SITE } from "@/data/catalog";
import { useLanguage } from "./LanguageProvider";

const STEPS = {
  mr: [
    { icon: MousePointerClick, title: "१. पुस्तक निवडा", desc: "तुम्हाला हवे असलेले ई-बुक किंवा कॉम्बो पॅक निवडा आणि ‘आत्ताच डाऊनलोड करा’ बटणावर क्लिक करा." },
    { icon: Smartphone, title: "२. माहिती भरा", desc: "पेमेंट विंडोमध्ये तुमचा मोबाईल नंबर भरा. वेगळे Account किंवा Login लागत नाही." },
    { icon: CreditCard, title: "३. सुरक्षित पेमेंट", desc: "Google Pay, PhonePe, Paytm किंवा कार्डद्वारे सुरक्षितपणे पेमेंट पूर्ण करा." },
    { icon: FileDown, title: "४. लगेच डाउनलोड", desc: "पेमेंट होताच ई-बुकची PDF लगेच डाउनलोड करा आणि वाचनाचा आनंद घ्या!" },
  ],
  hi: [
    { icon: MousePointerClick, title: "1. किताब चुनें", desc: "अपनी पसंद की ई-बुक या कॉम्बो पैक चुनें और ‘अभी डाउनलोड करें’ बटन दबाएँ।" },
    { icon: Smartphone, title: "2. जानकारी भरें", desc: "पेमेंट विंडो में अपना मोबाइल नंबर भरें। कोई अकाउंट या लॉगिन नहीं चाहिए।" },
    { icon: CreditCard, title: "3. सुरक्षित पेमेंट", desc: "Google Pay, PhonePe, Paytm या कार्ड से सुरक्षित पेमेंट करें।" },
    { icon: FileDown, title: "4. तुरंत डाउनलोड", desc: "पेमेंट होते ही ई-बुक की PDF तुरंत डाउनलोड करें।" },
  ],
  en: [
    { icon: MousePointerClick, title: "1. Choose a book", desc: "Pick an ebook or combo pack and press ‘Download now’." },
    { icon: Smartphone, title: "2. Fill in details", desc: "Enter your mobile number in the payment window. No account or login needed." },
    { icon: CreditCard, title: "3. Pay securely", desc: "Pay safely with Google Pay, PhonePe, Paytm or card." },
    { icon: FileDown, title: "4. Download instantly", desc: "The PDF downloads as soon as the payment succeeds." },
  ],
} as const;

const COPY = {
  mr: { badge: "सोपी प्रक्रिया", title: "ई-बुक कसे खरेदी करावे?", body: "कोणतेही account किंवा checkout form नाही — थेट पेमेंट आणि डाऊनलोड.", help: "डाउनलोडमध्ये मदत हवी आहे?", support: "आमची सपोर्ट टीम मदतीसाठी उपलब्ध आहे.", action: "WhatsApp करा" },
  hi: { badge: "आसान प्रक्रिया", title: "ई-बुक कैसे खरीदें?", body: "कोई अकाउंट नहीं — सीधे पेमेंट करें और डाउनलोड पाएँ।", help: "डाउनलोड में मदद चाहिए?", support: "हमारी सपोर्ट टीम आपकी मदद के लिए उपलब्ध है।", action: "WhatsApp करें" },
  en: { badge: "Simple process", title: "How to buy an ebook", body: "No account or long checkout form — pay and download directly.", help: "Need download help?", support: "Our support team is ready to help.", action: "Message on WhatsApp" },
} as const;

export default function HowToBuy() {
  const { locale } = useLanguage();
  const copy = COPY[locale];
  return (
    <section className="bg-brand-50/60 py-16">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-deva inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            {copy.badge}
          </span>
          <h2 className="font-deva mt-3 text-2xl font-extrabold text-brand-900 sm:text-3xl">
            {copy.title}
          </h2>
          <p className="font-deva mt-2 text-brand-500">
            {copy.body}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS[locale].map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <span className="absolute right-4 top-4 text-3xl font-black text-brand-100">
                {index + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-deva mt-4 text-base font-bold text-brand-900">
                {step.title}
              </h3>
              <p className="font-deva mt-1.5 text-sm leading-relaxed text-brand-500">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="font-deva mx-auto mt-8 max-w-xl rounded-2xl border border-brand-100 bg-white p-4 text-center text-sm text-brand-600">
          <b className="text-brand-800">{copy.help}</b> {copy.support}
          <br />
          <a
            href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
            className="mt-2 inline-block font-semibold text-brand-700 hover:underline"
          >
            {copy.action}: {SITE.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}
