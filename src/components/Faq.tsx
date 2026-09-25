"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SITE } from "@/data/catalog";

const FAQS: Array<{ q: string; a: string }> = [
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
            खरेदीपूर्वी तुमच्या प्रश्नांची उत्तरे येथे मिळवा.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, index) => {
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
