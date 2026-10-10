import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { SITE } from "@/data/catalog";
import { Tr, type Localized } from "@/components/LanguageProvider";
import ContactForm from "./ContactForm";

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
  title: Localized;
  hint?: Localized;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <span className="shrink-0 rounded-full bg-white p-3 text-brand-teal shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="font-deva mb-1 font-semibold text-gray-900">
          <Tr {...title} />
        </h3>
        {hint && (
          <p className="font-deva mb-1 text-sm text-gray-500">
            <Tr {...hint} />
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** Contact page — layout follows the original site (details + message form). */
export default function ContactPage() {
  const link = "break-all text-lg font-medium text-brand-teal hover:underline";
  return (
    <div className="container-x">
      <div className="mx-auto max-w-5xl py-12 md:py-16">
        <h1 className="font-deva mb-8 bg-gradient-to-r from-brand-teal to-teal-600 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
          <Tr mr="Contact Us / संपर्क करा" hi="Contact Us / संपर्क करें" en="Contact us" />
        </h1>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-8">
            <div>
              <p className="font-deva text-lg text-gray-700">
                <Tr
                  mr="ई-बुक्सबद्दल प्रश्न आहेत किंवा ऑर्डर सपोर्ट हवे आहे? आम्ही मदत करायला तत्पर आहोत."
                  hi="ई-बुक्स के बारे में सवाल हैं या ऑर्डर सपोर्ट चाहिए? हम मदद के लिए तैयार हैं।"
                  en="Questions about our digital ebooks or need order support? We're here to help."
                />
              </p>
            </div>

            <div className="space-y-4">
              <Card
                icon={Mail}
                title={{ mr: "ईमेल सपोर्ट (Email)", hi: "ईमेल सपोर्ट (Email)", en: "Email support" }}
                hint={{ mr: "सामान्य प्रश्न आणि ऑर्डर सपोर्टसाठी:", hi: "सामान्य प्रश्न और ऑर्डर सपोर्ट के लिए:", en: "For general inquiries and order support:" }}
              >
                <a href={`mailto:${SITE.email}`} className={link}>
                  {SITE.email}
                </a>
              </Card>
              <Card
                icon={Phone}
                title={{ mr: "कॉल करा (Call Us)", hi: "कॉल करें (Call Us)", en: "Call us" }}
                hint={{ mr: "सोम – शनि, सकाळी 9 – सायं 6 (IST)", hi: "सोम – शनि, सुबह 9 – शाम 6 (IST)", en: "Mon – Sat, 9:00 AM – 6:00 PM IST" }}
              >
                <a href={`tel:+${digits(SITE.contactPhone)}`} className={link}>
                  {SITE.contactPhone}
                </a>
              </Card>
              <Card
                icon={MessageCircle}
                title={{ mr: "WhatsApp सपोर्ट", hi: "WhatsApp सपोर्ट", en: "WhatsApp support" }}
                hint={{ mr: "लवकर मदतीसाठी चॅट करा", hi: "जल्दी मदद के लिए चैट करें", en: "Chat with us for quick help" }}
              >
                <a href={`https://wa.me/${digits(SITE.whatsapp)}`} target="_blank" rel="noopener noreferrer" className={link}>
                  {SITE.whatsapp}
                </a>
              </Card>
              <Card icon={MapPin} title={{ mr: "कार्यालयाचा पत्ता", hi: "कार्यालय का पता", en: "Office address" }}>
                <p className="font-deva text-gray-700">
                  <strong>Kaydyacha Ani Faydyacha</strong>
                  <br />
                  (Brand: कायद्याचं आणि फायद्याचं)
                  <br />
                  {SITE.address}
                </p>
              </Card>
            </div>

            {/* response promise (approved by the owner 2026-10-10) */}
            <p className="font-deva flex items-start gap-2 text-xs text-gray-500">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Tr
                mr="प्रतिसाद: 48 तासांत | निराकरण: 7 कामकाजाच्या दिवसांत (Response time: 48 hours | Resolution: within 7 working days)"
                hi="जवाब: 48 घंटे में | समाधान: 7 कार्य दिवसों में (Response time: 48 hours | Resolution: within 7 working days)"
                en="Response time: 48 hours | Resolution: within 7 working days"
              />
            </p>

            <div className="font-deva rounded-2xl bg-brand-teal/5 p-5 text-center text-sm text-gray-600">
              <Tr mr="ई-बुक डाउनलोडसाठी मदत हवी? थेट व्हॉट्सॲप करा:" hi="ई-बुक डाउनलोड में मदद चाहिए? सीधे व्हॉट्सऐप करें:" en="Need help with a download? WhatsApp us:" />{" "}
              <a
                href={`https://wa.me/${digits(SITE.supportPhone)}`}
                className="font-bold text-gray-900 hover:underline"
              >
                {SITE.supportPhone}
              </a>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
