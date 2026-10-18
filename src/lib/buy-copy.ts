// Texts of the Buy popup's details step (name + WhatsApp number before
// Razorpay, 2026-10-18). Client-safe. The offers box shows LEAD_CONSENT_TEXT
// (src/lib/lead-copy.ts) word for word — the same sentence is stored with the lead.
import type { Locale } from "./i18n";

export const BUY_FORM_COPY: Record<Locale, {
  heading: string;
  name: string;
  namePlaceholder: string;
  whatsapp: string;
  whatsappHint: string;
  phonePlaceholder: string;
  pay: (price: number) => string;
  badName: string;
  badPhone: string;
  privacy: string;
  edit: string;
}> = {
  mr: {
    heading: "पुस्तक WhatsApp वर मिळवण्यासाठी माहिती भरा",
    name: "तुमचे नाव",
    namePlaceholder: "उदा. राहुल पाटील",
    whatsapp: "WhatsApp नंबर",
    whatsappHint: "पुस्तकाची PDF याच WhatsApp नंबरवर पाठवली जाईल",
    phonePlaceholder: "98765 43210",
    pay: (price) => `पुढे जा — ₹${price} पेमेंट करा`,
    badName: "कृपया तुमचे नाव लिहा (किमान २ अक्षरे).",
    badPhone: "कृपया योग्य १० अंकी WhatsApp नंबर लिहा.",
    privacy: "तुमचा नंबर फक्त पुस्तक पाठवण्यासाठी आणि ऑर्डरच्या मदतीसाठी वापरला जातो.",
    edit: "नाव / नंबर बदला",
  },
  hi: {
    heading: "किताब WhatsApp पर पाने के लिए जानकारी भरें",
    name: "आपका नाम",
    namePlaceholder: "जैसे राहुल शर्मा",
    whatsapp: "WhatsApp नंबर",
    whatsappHint: "किताब की PDF इसी WhatsApp नंबर पर भेजी जाएगी",
    phonePlaceholder: "98765 43210",
    pay: (price) => `आगे बढ़ें — ₹${price} भुगतान करें`,
    badName: "कृपया अपना नाम लिखें (कम से कम 2 अक्षर)।",
    badPhone: "कृपया सही 10 अंकों का WhatsApp नंबर लिखें।",
    privacy: "आपका नंबर केवल किताब भेजने और ऑर्डर में मदद के लिए इस्तेमाल होता है।",
    edit: "नाम / नंबर बदलें",
  },
  en: {
    heading: "Enter your details to get the book on WhatsApp",
    name: "Your name",
    namePlaceholder: "e.g. Rahul Patil",
    whatsapp: "WhatsApp number",
    whatsappHint: "The book PDF is sent to this WhatsApp number",
    phonePlaceholder: "98765 43210",
    pay: (price) => `Continue — pay ₹${price}`,
    badName: "Please enter your name (at least 2 letters).",
    badPhone: "Please enter a valid 10-digit WhatsApp number.",
    privacy: "Your number is used only to send the book and to help with your order.",
    edit: "Change name / number",
  },
};
