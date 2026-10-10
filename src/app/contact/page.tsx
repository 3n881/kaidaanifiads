import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { SITE } from "@/data/catalog";

export const metadata: Metadata = {
  title: "संपर्क",
  description: "कायद्याचं आणि फायद्याचं — संपर्क माहिती, ईमेल, फोन आणि पत्ता.",
};

const digits = (phone: string) => phone.replace(/\D/g, "");

function Card({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <span className="shrink-0 rounded-full bg-white p-3 text-brand-teal shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
        {hint && <p className="mb-1 text-sm text-gray-500">{hint}</p>}
        {children}
      </div>
    </div>
  );
}

/** Contact page — styling follows the original site. */
export default function ContactPage() {
  const link = "break-all text-lg font-medium text-brand-teal hover:underline";
  return (
    <div className="container-x">
      <div className="mx-auto max-w-4xl py-12 md:py-16">
        <h1 className="font-deva mb-8 bg-gradient-to-r from-brand-teal to-teal-600 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
          Contact Us / संपर्क करा
        </h1>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="font-deva text-lg text-gray-700">
            ई-बुक्सबद्दल प्रश्न आहेत किंवा ऑर्डर सपोर्ट हवे आहे? आम्ही मदत करायला तत्पर आहोत.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            (Questions about our digital ebooks or need order support? We&apos;re here to help.)
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card icon={Mail} title="Email Support" hint="For general inquiries and order support:">
            <a href={`mailto:${SITE.email}`} className={link}>
              {SITE.email}
            </a>
          </Card>
          <Card icon={Phone} title="Call Us" hint="Mon – Sat, 9:00 AM – 6:00 PM IST">
            <a href={`tel:+${digits(SITE.contactPhone)}`} className={link}>
              {SITE.contactPhone}
            </a>
          </Card>
          <Card icon={MessageCircle} title="WhatsApp Support" hint="Chat with us for quick help">
            <a href={`https://wa.me/${digits(SITE.whatsapp)}`} target="_blank" rel="noopener noreferrer" className={link}>
              {SITE.whatsapp}
            </a>
          </Card>
          <Card icon={MapPin} title="Office Address">
            <p className="font-deva text-gray-700">
              <strong>Kaydyacha Ani Faydyacha</strong>
              <br />
              (Brand: कायद्याचं आणि फायद्याचं)
              <br />
              {SITE.address}
            </p>
          </Card>
        </div>

        <div className="font-deva mt-8 rounded-2xl bg-brand-teal/5 p-5 text-center text-sm text-gray-600">
          ई-बुक डाउनलोडसाठी मदत हवी? थेट व्हॉट्सॲप करा:{" "}
          <a
            href={`https://wa.me/${digits(SITE.supportPhone)}`}
            className="font-bold text-gray-900 hover:underline"
          >
            {SITE.supportPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
