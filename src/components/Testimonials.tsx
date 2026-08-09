import { Quote } from "lucide-react";
import { testimonials } from "@/data/catalog";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

export default function Testimonials() {
  return (
    <section className="bg-brand-50/60 py-16">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-deva text-2xl font-extrabold text-brand-900 sm:text-3xl">
            आमचे समाधानी ग्राहक
          </h2>
          <p className="font-deva mt-2 text-brand-500">
            हजारो नागरिकांनी आमच्या सेवेवर विश्वास दाखवला आहे. त्यांचे अनुभव वाचा.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-[var(--shadow-card)]"
            >
              <Quote className="h-6 w-6 text-brand-200" />
              <blockquote className="font-deva mt-3 flex-1 text-sm leading-relaxed text-brand-700">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {initials(t.name)}
                </span>
                <span>
                  <span className="font-deva block text-sm font-bold text-brand-900">
                    {t.name}
                  </span>
                  <span className="font-deva block text-xs text-brand-400">
                    {t.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
