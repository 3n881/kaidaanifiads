"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { sendContactMessage } from "./actions";

const COPY = {
  mr: { title: "आम्हाला संदेश पाठवा", name: "पूर्ण नाव", email: "ईमेल", phone: "मोबाईल / WhatsApp नंबर", either: "ईमेल किंवा मोबाईल नंबर — किमान एक भरा", subject: "विषय", message: "तुमचा संदेश", namePh: "तुमचे नाव", subjectPh: "आम्ही कशी मदत करू?", messagePh: "तुमचा प्रश्न किंवा ऑर्डरची माहिती लिहा…", send: "संदेश पाठवा", sending: "पाठवत आहे…", done: "धन्यवाद! तुमचा संदेश मिळाला. आम्ही लवकरच संपर्क करू.", another: "आणखी एक संदेश पाठवा" },
  hi: { title: "हमें संदेश भेजें", name: "पूरा नाम", email: "ईमेल", phone: "मोबाइल / WhatsApp नंबर", either: "ईमेल या मोबाइल नंबर — कम से कम एक भरें", subject: "विषय", message: "आपका संदेश", namePh: "आपका नाम", subjectPh: "हम कैसे मदद करें?", messagePh: "अपना प्रश्न या ऑर्डर की जानकारी लिखें…", send: "संदेश भेजें", sending: "भेज रहे हैं…", done: "धन्यवाद! आपका संदेश मिल गया। हम जल्द ही संपर्क करेंगे।", another: "एक और संदेश भेजें" },
  en: { title: "Send us a message", name: "Full name", email: "Email", phone: "Mobile / WhatsApp number", either: "Email or mobile number — fill at least one", subject: "Subject", message: "Your message", namePh: "Your name", subjectPh: "How can we help?", messagePh: "Write your question or order details…", send: "Send message", sending: "Sending…", done: "Thank you! We received your message and will get back to you soon.", another: "Send another message" },
} as const;

const input =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-teal";

/** "Send us a message" form — saved for the admin inbox (/dashboard/messages). */
export default function ContactForm() {
  const { locale } = useLanguage();
  const c = COPY[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    data.set("locale", locale);
    startTransition(async () => {
      const result = await sendContactMessage(data);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setSent(true);
    });
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-deva mb-6 text-2xl font-bold text-gray-900">{c.title}</h2>
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
          <p className="font-deva mt-3 text-sm font-semibold text-green-700" role="status">{c.done}</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-deva mt-4 text-sm font-bold text-brand-teal hover:underline"
          >
            {c.another}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
          {/* honeypot — hidden from people, bots fill it */}
          <div className="hidden" aria-hidden="true">
            <label>
              Website <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="space-y-1">
            <label htmlFor="cf-name" className="font-deva text-sm font-medium text-gray-700">
              {c.name} <span className="text-red-500">*</span>
            </label>
            <input id="cf-name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder={c.namePh} className={`font-deva ${input}`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="cf-email" className="font-deva text-sm font-medium text-gray-700">{c.email}</label>
              <input id="cf-email" name="email" type="email" maxLength={120} autoComplete="email" placeholder="name@example.com" className={input} />
            </div>
            <div className="space-y-1">
              <label htmlFor="cf-phone" className="font-deva text-sm font-medium text-gray-700">{c.phone}</label>
              <input id="cf-phone" name="phone" type="tel" inputMode="numeric" maxLength={14} autoComplete="tel-national" placeholder="98XXXXXXXX" className={input} />
            </div>
          </div>
          <p className="font-deva -mt-2 text-xs text-gray-500">{c.either}</p>
          <div className="space-y-1">
            <label htmlFor="cf-subject" className="font-deva text-sm font-medium text-gray-700">{c.subject}</label>
            <input id="cf-subject" name="subject" maxLength={120} placeholder={c.subjectPh} className={`font-deva ${input}`} />
          </div>
          <div className="space-y-1">
            <label htmlFor="cf-message" className="font-deva text-sm font-medium text-gray-700">
              {c.message} <span className="text-red-500">*</span>
            </label>
            <textarea id="cf-message" name="message" required minLength={5} maxLength={2000} rows={5} placeholder={c.messagePh} className={`font-deva resize-y ${input}`} />
          </div>
          {error && (
            <p className="font-deva rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="font-deva inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-teal px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {pending ? c.sending : c.send}
          </button>
        </form>
      )}
    </div>
  );
}
