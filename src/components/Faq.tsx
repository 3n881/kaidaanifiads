"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SITE } from "@/data/catalog";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "पेमेंट सुरक्षित आहे का?",
    a: "होय. पेमेंट Razorpay या विश्वासार्ह गेटवेद्वारे होते — Google Pay, PhonePe, Paytm, UPI किंवा कार्डने. तुमची कार्ड/बँक माहिती आमच्याकडे साठवली जात नाही.",
  },
  {
    q: "पेमेंट केल्यावर ई-बुक कसे मिळेल?",
    a: "पेमेंट यशस्वी होताच तुम्ही दिलेल्या व्हॉट्सॲप नंबरवर PDF ची डाउनलोड लिंक लगेच पाठवली जाते. तुम्ही ‘माझी पुस्तके’ पानावरही ती पाहू शकता.",
  },
  {
    q: "ही Physical पुस्तके आहेत का?",
    a: "नाही. ही फक्त Digital PDF E-Books आहेत. कोणतीही छापील (Printed) प्रत पाठवली जात नाही, त्यामुळे शिपिंग शुल्कही नाही.",
  },
  {
    q: "परतावा (Refund) मिळतो का?",
    a: "डिजिटल उत्पादन असल्याने, एकदा PDF लिंक पाठवली/डाउनलोड झाल्यावर परतावा शक्य नाही. पेमेंट होऊनही लिंक मिळाली नसेल, तर आम्ही ती पुन्हा पाठवतो किंवा पूर्ण परतावा देतो.",
  },
  {
    q: "पुस्तके कोणत्या भाषेत आहेत?",
    a: "बहुतांश पुस्तके सोप्या मराठीत आहेत; काही हिंदीत उपलब्ध आहेत. प्रत्येक पुस्तकावर भाषा नमूद केलेली असते.",
  },
  {
    q: "मदतीसाठी संपर्क कसा करावा?",
    a: `कोणतीही अडचण आल्यास आमच्या सपोर्ट टीमला व्हॉट्सॲप करा: ${SITE.supportPhone}. आम्ही सोम–शनि, सकाळी ९ ते संध्याकाळी ६ या वेळेत उपलब्ध असतो.`,
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-16">
      <div className="container-x max-w-3xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="font-deva inline-block rounded-full bg-brand-teal/5 px-3 py-1 text-xs font-semibold text-brand-teal">
            FAQ
          </span>
          <h2 className="font-deva mt-3 text-2xl font-extrabold text-brand-900 sm:text-3xl">
            वारंवार विचारले जाणारे प्रश्न
          </h2>
          <p className="font-deva mt-2 text-brand-500">
            तुमच्या मनातील शंकांची उत्तरे इथे मिळतील.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-deva text-sm font-bold text-brand-900 sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
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
