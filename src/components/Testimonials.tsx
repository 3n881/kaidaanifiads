import { Quote, Star } from "lucide-react";
import { testimonials } from "@/data/catalog";
import { Tr } from "@/components/LanguageProvider";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

/** Customer quotes — swipe row with 5 gold stars per card (as on the original site). */
export default function Testimonials() {
  return (
    <section className="overflow-hidden bg-white py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 space-y-3 text-center md:mb-16">
          <h2 className="font-deva text-2xl font-extrabold text-brand-teal md:text-5xl">
            <Tr mr="आमचे समाधानी ग्राहक" hi="हमारे संतुष्ट ग्राहक" en="Happy readers" />
          </h2>
          <p className="font-deva mx-auto max-w-2xl text-base text-brand-500 md:text-lg">
            <Tr
              mr="हजारो नागरिकांनी आमच्या सेवेवर विश्वास दाखवला आहे. त्यांचे अनुभव वाचा."
              hi="हज़ारों नागरिकों ने हमारी सेवा पर भरोसा किया है। उनके अनुभव पढ़ें।"
              en="Thousands of readers trust us. Read what they say."
            />
          </p>
        </div>

        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="relative flex min-w-0 shrink-0 basis-[85%] snap-center flex-col rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm transition-shadow hover:shadow-md md:basis-[45%] md:p-8 lg:basis-[32%]"
            >
              <Quote className="absolute right-6 top-6 h-10 w-10 text-gray-200" aria-hidden="true" />
              <div className="mb-6 flex gap-1" role="img" aria-label="5/5">
                {[0, 1, 2, 3, 4].map((n) => (
                  <Star key={n} className="h-5 w-5 fill-brand-gold text-brand-gold" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="font-deva relative z-10 mb-6 line-clamp-4 min-h-[5.625rem] text-sm font-medium leading-relaxed text-gray-700 md:min-h-[6.25rem] md:text-base">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-brand-teal/10 text-xs font-bold text-brand-teal shadow-sm">
                  {initials(t.name)}
                </span>
                <span>
                  <span className="font-deva block text-sm font-bold text-gray-900">{t.name}</span>
                  <span className="font-deva block text-xs text-brand-500">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
