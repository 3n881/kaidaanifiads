import { ShieldCheck } from "lucide-react";
import { SITE } from "@/data/catalog";
import { SITE_URL } from "@/lib/supabase/config";

export interface PolicySection {
  heading: string;
  body: string[];
}

const HOST = new URL(SITE_URL).host;

// Shown on every policy page (payment providers check for these details).
const BUSINESS: Array<[string, string]> = [
  ["Registered Enterprise Name", "KAYDYACHA ANI FAYDYACHA"],
  ["Udyam Registration No.", SITE.udyam],
  ["Proprietor / Owner", SITE.proprietor],
  ["Brand", "कायद्याचं आणि फायद्याचं (Kaydyach ani Faydyach)"],
  ["Website", `https://${HOST}`],
  ["Business Type", "Digital Goods — Educational Ebooks (PDF only, no physical goods)"],
  ["Address", SITE.address],
];

/** Policy page layout — styling follows the original site. */
export default function PolicyPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: PolicySection[];
}) {
  return (
    <div className="container-x">
      <div className="mx-auto max-w-4xl py-12 md:py-16">
        <h1 className="font-deva mb-8 bg-gradient-to-r from-brand-teal to-teal-600 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
          {title}
        </h1>

        {/* Official info */}
        <div className="mb-10 flex items-center gap-4 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-5 shadow-xs transition-all hover:shadow-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm ring-1 ring-brand-teal/10">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-deva text-xs font-bold uppercase tracking-wider text-brand-teal">
              अधिकृत प्लॅटफॉर्म माहिती (Official Info)
            </p>
            <p className="font-deva text-sm font-medium leading-relaxed text-gray-700 md:text-base">
              हे डिजिटल प्लॅटफॉर्म <span className="font-bold text-gray-900">Kaydyacha Ani Faydyacha</span>{" "}
              द्वारे मालकीचे आणि चालवले जाते — “कायद्याचं आणि फायद्याचं” ({HOST}) या ब्रँड नावाखाली.
              <span className="mt-1 block text-xs font-normal text-gray-500">
                (This platform is owned and operated by Kaydyacha Ani Faydyacha under the brand “Kaydyach ani
                Faydyach”.)
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-8 leading-relaxed text-gray-700">
          <p>
            <strong>Last Updated: 08 August 2026</strong>
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm">
            <p className="font-deva mb-1 font-semibold text-gray-800">Business Details / व्यवसाय तपशील</p>
            {BUSINESS.map(([k, v]) => (
              <p key={k} className="font-deva break-words">
                <strong>{k}:</strong> {v}
              </p>
            ))}
          </div>

          {intro && <p className="text-sm leading-relaxed text-gray-700 md:text-base">{intro}</p>}

          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-deva text-lg font-bold text-brand-teal md:text-xl">{s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} className="font-deva mt-2 text-sm leading-relaxed text-gray-700 md:text-base">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <section className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-5 text-sm text-gray-700">
            <h2 className="font-deva text-base font-bold text-brand-teal">Contact / संपर्क</h2>
            <p className="mt-2">Email: {SITE.email}</p>
            <p>Phone / WhatsApp: {SITE.contactPhone}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
