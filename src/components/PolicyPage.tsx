import { SITE } from "@/data/catalog";

export interface PolicySection {
  heading: string;
  body: string[];
}

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
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-deva text-3xl font-extrabold text-brand-900">{title}</h1>
      <p className="mt-2 text-sm text-brand-400">Last updated: 08 August 2026</p>
      {intro && (
        <p className="mt-5 text-sm leading-relaxed text-brand-600">{intro}</p>
      )}

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-bold text-brand-900">{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="mt-2 text-sm leading-relaxed text-brand-600">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-sm text-brand-600">
          <h2 className="text-base font-bold text-brand-900">
            Contact / संपर्क
          </h2>
          <p className="mt-2">
            Kaydyacha Ani Faydyach · Proprietor: {SITE.proprietor}
          </p>
          <p>Email: {SITE.email}</p>
          <p>Phone / WhatsApp: {SITE.contactPhone}</p>
          <p className="font-deva">{SITE.address}</p>
          <p>Udyam Registration: {SITE.udyam}</p>
        </section>
      </div>
    </div>
  );
}
