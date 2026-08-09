import { MousePointerClick, UserRound, CreditCard, FileDown } from "lucide-react";
import { SITE } from "@/data/catalog";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "१. पुस्तक निवडा",
    desc: "तुम्हाला हवे असलेले ई-बुक किंवा कॉम्बो पॅक निवडा आणि 'डाउनलोड करा' बटणावर क्लिक करा.",
  },
  {
    icon: UserRound,
    title: "२. माहिती भरा",
    desc: "तुमचे नाव आणि व्हॉट्सॲप नंबर अचूक भरा. याच नंबरवर तुम्हाला ई-बुकची लिंक मिळेल.",
  },
  {
    icon: CreditCard,
    title: "३. सुरक्षित पेमेंट",
    desc: "Google Pay, PhonePe, Paytm किंवा कार्डद्वारे सुरक्षितपणे पेमेंट पूर्ण करा.",
  },
  {
    icon: FileDown,
    title: "४. लगेच डाउनलोड",
    desc: "पेमेंट होताच ई-बुकची PDF लगेच डाउनलोड करा आणि वाचनाचा आनंद घ्या!",
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
            फक्त ४ सोप्या स्टेप्समध्ये कायदेशीर ज्ञान मिळवा
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <span className="absolute right-4 top-4 text-3xl font-black text-brand-100">
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="font-deva mt-4 text-base font-bold text-brand-900">
                {s.title}
              </h3>
              <p className="font-deva mt-1.5 text-sm leading-relaxed text-brand-500">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="font-deva mx-auto mt-8 max-w-xl rounded-2xl border border-brand-100 bg-white p-4 text-center text-sm text-brand-600">
          <b className="text-brand-800">काही अडचण येत आहे?</b> पेमेंट केल्यानंतर
          ई-बुक मिळाले नाही? आमची सपोर्ट टीम तुम्हाला मदत करेल.
          <br />
          <a
            href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
            className="mt-2 inline-block font-semibold text-brand-700 hover:underline"
          >
            व्हॉट्सॲप करा: {SITE.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}
