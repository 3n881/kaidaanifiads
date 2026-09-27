"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SITE } from "@/data/catalog";
import { useLanguage } from "./LanguageProvider";

const MR_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "पेमेंट सुरक्षित आहे का?",
    a: "होय. पेमेंट Razorpay च्या सुरक्षित checkout मधून होते. UPI, Google Pay, PhonePe, Paytm आणि Card उपलब्ध आहेत. तुमची payment माहिती आमच्या server वर साठवली जात नाही.",
  },
  {
    q: "खरेदीसाठी account किंवा मोबाईल नंबर आवश्यक आहे का?",
    a: "नाही. तुम्ही कोणतेही account तयार न करता आणि नाव किंवा नंबर न देता थेट पेमेंट करू शकता. पेमेंटनंतर WhatsApp delivery आणि My Books access साठी नंबर देणे पूर्णपणे ऐच्छिक आहे.",
  },
  {
    q: "पेमेंटनंतर ई-बुक कसे मिळेल?",
    a: "पेमेंट यशस्वी होताच PDF डाउनलोड आपोआप सुरू करण्याचा प्रयत्न होतो आणि स्क्रीनवर स्वतंत्र Download बटनही दिसते. नंबर दिल्यास तीच लिंक WhatsApp वर पाठवली जाते.",
  },
  {
    q: "ही Physical पुस्तकाची प्रत आहे का?",
    a: "नाही. ही फक्त Digital PDF E-Books आहेत. कोणतीही Printed प्रत courier ने पाठवली जात नाही.",
  },
  {
    q: "परतावा (Refund) मिळेल का?",
    a: "Digital product असल्यामुळे PDF लिंक मिळाल्यानंतर किंवा फाइल डाउनलोड झाल्यानंतर सामान्यतः refund उपलब्ध नसतो. Duplicate charge किंवा technical delivery failure असल्यास support शी संपर्क करा.",
  },
  {
    q: "अडचण आल्यास काय करावे?",
    a: `आमच्या सपोर्ट टीमला WhatsApp करा: ${SITE.supportPhone}. आम्ही सोम–शनि, सकाळी ९ ते संध्याकाळी ६ या वेळेत उपलब्ध असतो.`,
  },
];

const FAQS = {
  mr: MR_FAQS,
  hi: [
    { q: "क्या पेमेंट सुरक्षित है?", a: "हाँ। पेमेंट Razorpay के सुरक्षित checkout से होता है। UPI, Google Pay, PhonePe, Paytm और कार्ड उपलब्ध हैं।" },
    { q: "क्या अकाउंट या मोबाइल नंबर जरूरी है?", a: "नहीं। खरीद के लिए अकाउंट जरूरी नहीं है। पेमेंट के बाद WhatsApp डिलीवरी के लिए नंबर देना वैकल्पिक है।" },
    { q: "पेमेंट के बाद ई-बुक कैसे मिलेगी?", a: "पेमेंट सफल होते ही PDF डाउनलोड शुरू होता है और डाउनलोड बटन भी दिखाई देता है। चाहें तो लिंक WhatsApp पर भी भेज सकते हैं।" },
    { q: "क्या यह छपी हुई किताब है?", a: "नहीं। यह केवल Digital PDF E-Book है; कोई प्रिंटेड कॉपी कूरियर से नहीं भेजी जाती।" },
    { q: "क्या रिफंड मिलेगा?", a: "Digital product की लिंक या फाइल मिलने के बाद सामान्यतः रिफंड उपलब्ध नहीं है। डुप्लीकेट चार्ज या तकनीकी डिलीवरी समस्या के लिए सपोर्ट से संपर्क करें।" },
    { q: "समस्या होने पर क्या करें?", a: `हमारी सपोर्ट टीम को WhatsApp करें: ${SITE.supportPhone}.` },
  ],
  en: [
    { q: "Is payment secure?", a: "Yes. Payment is handled by Razorpay’s secure checkout with UPI, Google Pay, PhonePe, Paytm, and cards." },
    { q: "Do I need an account or mobile number?", a: "No account is needed to buy. Providing a number after payment for WhatsApp delivery is optional." },
    { q: "How do I receive the ebook?", a: "The PDF download starts after successful payment and a download button remains available. You can also send the secure link to WhatsApp." },
    { q: "Is this a printed book?", a: "No. These are digital PDF ebooks; no physical copy is delivered by courier." },
    { q: "Can I get a refund?", a: "Digital purchases are generally non-refundable after the link or file is delivered. Contact support for duplicate charges or technical delivery failures." },
    { q: "What if I need help?", a: `Message our support team on WhatsApp: ${SITE.supportPhone}.` },
  ],
} as const;

const COPY = {
  mr: { title: "वारंवार विचारले जाणारे प्रश्न", body: "खरेदीपूर्वी तुमच्या प्रश्नांची उत्तरे येथे मिळवा." },
  hi: { title: "अक्सर पूछे जाने वाले सवाल", body: "खरीदने से पहले अपने सवालों के जवाब यहाँ पाएँ।" },
  en: { title: "Frequently asked questions", body: "Find answers before you buy." },
} as const;

export default function Faq() {
  const { locale } = useLanguage();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-16">
      <div className="container-x max-w-3xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="font-deva inline-block rounded-full bg-brand-teal/5 px-3 py-1 text-xs font-semibold text-brand-teal">
            FAQ
          </span>
          <h2 className="font-deva mt-3 text-2xl font-extrabold text-brand-900 sm:text-3xl">
            {COPY[locale].title}
          </h2>
          <p className="font-deva mt-2 text-brand-500">
            {COPY[locale].body}
          </p>
        </div>

        <div className="space-y-3">
          {FAQS[locale].map((item, index) => {
            const isOpen = open === index;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-deva text-sm font-bold text-brand-900 sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 flex-shrink-0 text-brand-teal transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-deva px-5 pb-4 text-sm leading-relaxed text-brand-600">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
