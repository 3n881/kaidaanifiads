"use client";

import { BookOpen, CreditCard, FileDown, Headphones, MousePointerClick } from "lucide-react";
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
  mr: { badge: "सोपी प्रक्रिया", title: "ई-बुक कसे खरेदी करावे?", body: "Account, Login किंवा वेगळा फॉर्म नाही — थेट पेमेंट आणि लगेच डाउनलोड.", help: "काही अडचण येत आहे?", support: "पेमेंट केल्यानंतर ई-बुक मिळाले नाही? काळजी करू नका! आमची सपोर्ट टीम तुम्हाला मदत करेल.", action: "व्हॉट्सॲप करा" },
  hi: { badge: "आसान प्रक्रिया", title: "ई-बुक कैसे खरीदें?", body: "कोई अकाउंट, लॉगिन या अलग फ़ॉर्म नहीं — सीधे पेमेंट और तुरंत डाउनलोड।", help: "कोई परेशानी आ रही है?", support: "पेमेंट के बाद ई-बुक नहीं मिली? चिंता न करें! हमारी सपोर्ट टीम आपकी मदद करेगी।", action: "व्हॉट्सऐप करें" },
  en: { badge: "Simple process", title: "How to buy an ebook", body: "No account, login or extra form — pay and download straight away.", help: "Having trouble?", support: "Paid but didn't get the ebook? Don't worry — our support team will help.", action: "WhatsApp" },
} as const;

// Icon box colours per step, as on the original site.
const TONES = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-green-50 text-green-600",
  "bg-amber-50 text-brand-gold",
];

export default function HowToBuy() {
  const { locale } = useLanguage();
  const copy = COPY[locale];
  const steps = STEPS[locale];
  return (
    <section className="relative overflow-hidden bg-white py-16 lg:py-24">
      <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 opacity-5">
        <div className="h-64 w-64 rounded-full bg-brand-teal blur-3xl" />
      </div>
      <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 opacity-5">
        <div className="h-64 w-64 rounded-full bg-brand-gold blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
          <span className="font-deva mb-2 inline-block rounded-full bg-brand-teal/10 px-4 py-1.5 text-sm font-bold text-brand-teal">
            {copy.badge}
          </span>
          <h2 className="font-deva mb-4 text-3xl font-black text-brand-teal lg:text-4xl">{copy.title}</h2>
          <p className="font-deva text-lg font-medium text-gray-600">{copy.body}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="group relative flex flex-col items-center text-center">
              {/* connecting line between steps (desktop) */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-8 -z-10 hidden w-full -translate-y-1/2 lg:block">
                  <div className="h-0.5 w-full bg-gray-100" />
                </div>
              )}
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${TONES[index % TONES.length]}`}
              >
                <step.icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="font-deva mb-2 text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="font-deva text-sm leading-relaxed text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Help card */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-brand-teal/5 p-6 text-center lg:mt-16">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
              <Headphones className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-deva text-lg font-bold text-brand-teal">{copy.help}</h4>
              <p className="font-deva text-sm font-medium text-gray-600">
                {copy.support} <br className="hidden sm:block" />
                {copy.action}:{" "}
                <a
                  href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
                  className="font-bold text-gray-900 hover:underline"
                >
                  {SITE.supportPhone}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
