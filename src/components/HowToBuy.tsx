"use client";

import { BookOpen, CreditCard, FileDown, MousePointerClick } from "lucide-react";
import { SITE } from "@/data/catalog";
import { useLanguage } from "./LanguageProvider";

// Our checkout: Buy opens the Razorpay window directly (it asks for the mobile
// number), the order page starts the download, and the order is saved on the
// device under "माझी पुस्तके" for later downloads.
const STEPS = {
  mr: [
    { icon: MousePointerClick, title: "१. पुस्तक निवडा", desc: "हवे असलेले ई-बुक किंवा कॉम्बो पॅक उघडा आणि ‘आत्ताच डाऊनलोड करा’ बटण दाबा." },
    { icon: CreditCard, title: "२. सुरक्षित पेमेंट", desc: "Razorpay ची सुरक्षित पेमेंट विंडो लगेच उघडते. मोबाईल नंबर टाका आणि UPI, Google Pay, PhonePe, Paytm किंवा कार्डने पेमेंट करा." },
    { icon: FileDown, title: "३. लगेच डाउनलोड", desc: "पेमेंट यशस्वी होताच PDF डाउनलोड आपोआप सुरू होते आणि स्क्रीनवर Download बटणही मिळते." },
    { icon: BookOpen, title: "४. माझी पुस्तके", desc: "तुमची खरेदी याच मोबाईलवर ‘माझी पुस्तके’ मध्ये जतन राहते — गरज पडेल तेव्हा पुन्हा डाउनलोड करा." },
  ],
  hi: [
    { icon: MousePointerClick, title: "1. किताब चुनें", desc: "अपनी पसंद की ई-बुक या कॉम्बो पैक खोलें और ‘अभी डाउनलोड करें’ बटन दबाएँ।" },
    { icon: CreditCard, title: "2. सुरक्षित पेमेंट", desc: "Razorpay की सुरक्षित पेमेंट विंडो तुरंत खुलती है। मोबाइल नंबर डालें और UPI, Google Pay, PhonePe, Paytm या कार्ड से पेमेंट करें।" },
    { icon: FileDown, title: "3. तुरंत डाउनलोड", desc: "पेमेंट सफल होते ही PDF डाउनलोड अपने आप शुरू होता है और स्क्रीन पर Download बटन भी मिलता है।" },
    { icon: BookOpen, title: "4. मेरी किताबें", desc: "आपकी खरीद इसी मोबाइल पर ‘मेरी किताबें’ में सेव रहती है — ज़रूरत हो तब फिर से डाउनलोड करें।" },
  ],
  en: [
    { icon: MousePointerClick, title: "1. Choose a book", desc: "Open an ebook or combo pack and press ‘Download now’." },
    { icon: CreditCard, title: "2. Pay securely", desc: "The secure Razorpay payment window opens right away. Enter your mobile number and pay by UPI, Google Pay, PhonePe, Paytm or card." },
    { icon: FileDown, title: "3. Download instantly", desc: "As soon as the payment succeeds, the PDF starts downloading and a Download button stays on screen." },
    { icon: BookOpen, title: "4. My Books", desc: "Your purchase is saved under ‘My Books’ on this phone — download it again whenever you need." },
  ],
} as const;

const COPY = {
  mr: { badge: "सोपी प्रक्रिया", title: "ई-बुक कसे खरेदी करावे?", body: "Account, Login किंवा वेगळा फॉर्म नाही — थेट पेमेंट आणि लगेच डाउनलोड.", help: "डाउनलोडमध्ये मदत हवी आहे?", support: "आमची सपोर्ट टीम मदतीसाठी उपलब्ध आहे.", action: "WhatsApp करा" },
  hi: { badge: "आसान प्रक्रिया", title: "ई-बुक कैसे खरीदें?", body: "कोई अकाउंट, लॉगिन या अलग फ़ॉर्म नहीं — सीधे पेमेंट और तुरंत डाउनलोड।", help: "डाउनलोड में मदद चाहिए?", support: "हमारी सपोर्ट टीम आपकी मदद के लिए उपलब्ध है।", action: "WhatsApp करें" },
  en: { badge: "Simple process", title: "How to buy an ebook", body: "No account, login or extra form — pay and download straight away.", help: "Need download help?", support: "Our support team is ready to help.", action: "Message on WhatsApp" },
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
