import { CreditCard, FileDown, MessageCircle, MousePointerClick } from "lucide-react";
import { SITE } from "@/data/catalog";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "१. पुस्तक निवडा",
    desc: "तुमच्या आवडीचे ई-बुक निवडा आणि ‘Download’ बटन दाबा.",
  },
  {
    icon: CreditCard,
    title: "२. थेट पेमेंट करा",
    desc: "Account, नाव किंवा मोबाईल नंबर न देता UPI, Google Pay, PhonePe किंवा Card ने पेमेंट करा.",
  },
  {
    icon: FileDown,
    title: "३. PDF डाऊनलोड करा",
    desc: "पेमेंट यशस्वी होताच PDF डाऊनलोड सुरू होते आणि स्क्रीनवर लिंकही मिळते.",
  },
  {
    icon: MessageCircle,
    title: "४. WhatsApp ऐच्छिक",
    desc: "हवे असल्यास पेमेंटनंतर नंबर द्या. लिंक WhatsApp वर येईल आणि My Books मध्ये जतन होईल.",
  },
];

export default function HowToBuy() {
  return (
    <section className="bg-brand-50/60 py-16">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-deva inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            सोपी प्रक्रिया
          </span>
          <h2 className="font-deva mt-3 text-2xl font-extrabold text-brand-900 sm:text-3xl">
            ई-बुक कसे खरेदी करावे?
          </h2>
          <p className="font-deva mt-2 text-brand-500">
            कोणतेही account किंवा checkout form नाही — थेट पेमेंट आणि डाऊनलोड.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
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
          <b className="text-brand-800">डाउनलोडमध्ये मदत हवी आहे?</b> आमची
          सपोर्ट टीम मदतीसाठी उपलब्ध आहे.
          <br />
          <a
            href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
            className="mt-2 inline-block font-semibold text-brand-700 hover:underline"
          >
            WhatsApp करा: {SITE.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}
