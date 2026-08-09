import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { SITE } from "@/data/catalog";

export const metadata: Metadata = {
  title: "संपर्क",
  description: "कायद्याचं आणि फायद्याचं — संपर्क माहिती, ईमेल, फोन आणि पत्ता.",
};

export default function ContactPage() {
  const wa = SITE.whatsapp.replace(/\D/g, "");
  return (
    <div className="container-x max-w-4xl py-12">
      <h1 className="font-deva text-3xl font-extrabold text-brand-900">
        संपर्क (Contact Us)
      </h1>
      <p className="font-deva mt-2 text-brand-500">
        काही अडचण किंवा प्रश्न? आम्ही मदतीसाठी तत्पर आहोत.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${SITE.email}`}
          className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] transition hover:border-brand-300"
        >
          <Mail className="h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-bold text-brand-900">Email</span>
            <span className="break-all text-sm text-brand-500">{SITE.email}</span>
          </span>
        </a>
        <a
          href={`tel:${SITE.contactPhone.replace(/\s/g, "")}`}
          className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] transition hover:border-brand-300"
        >
          <Phone className="h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-bold text-brand-900">Phone</span>
            <span className="text-sm text-brand-500">{SITE.contactPhone}</span>
          </span>
        </a>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)] transition hover:border-brand-300"
        >
          <MessageCircle className="h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-bold text-brand-900">WhatsApp</span>
            <span className="text-sm text-brand-500">{SITE.whatsapp}</span>
          </span>
        </a>
        <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <MapPin className="h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-bold text-brand-900">Location</span>
            <span className="font-deva text-sm text-brand-500">{SITE.address}</span>
          </span>
        </div>
      </div>

      <div className="font-deva mt-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-sm text-brand-600">
        सपोर्टसाठी थेट व्हॉट्सॲप करा:{" "}
        <a
          href={`https://wa.me/${SITE.supportPhone.replace(/\D/g, "")}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          {SITE.supportPhone}
        </a>
      </div>
    </div>
  );
}
