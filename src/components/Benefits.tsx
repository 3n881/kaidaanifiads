import { Languages, GraduationCap, IndianRupee } from "lucide-react";

const BENEFITS = [
  {
    icon: Languages,
    title: "सोपी भाषा",
    desc: "कायद्याची क्लिष्ट आणि अवघड भाषा सोप्या मराठीत समजून घ्या.",
  },
  {
    icon: GraduationCap,
    title: "तज्ञांचे मार्गदर्शन",
    desc: "उच्च न्यायालयातील अनुभवी वकीलांकडून तयार केलेले खात्रीशीर साहित्य.",
  },
  {
    icon: IndianRupee,
    title: "किफायतशीर दर",
    desc: "सर्वसामान्यांना सहज परवडणाऱ्या दरात कायदेशीर ई-बुक्स उपलब्ध.",
  },
];

export default function Benefits() {
  return (
    <section className="py-16">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-deva text-2xl font-extrabold text-brand-900 sm:text-3xl">
            नागरिकांसाठी महत्त्वाचे फायदे
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-[var(--shadow-card)]"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <b.icon className="h-7 w-7" />
              </span>
              <h3 className="font-deva mt-4 text-lg font-bold text-brand-900">
                {b.title}
              </h3>
              <p className="font-deva mt-2 text-sm leading-relaxed text-brand-500">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
