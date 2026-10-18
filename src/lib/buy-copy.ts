// Texts of the Buy popup's details step (name + WhatsApp number before
// Razorpay, 2026-10-18). Client-safe. The optional offers box shows
// LEAD_CONSENT_TEXT (src/lib/lead-copy.ts) word for word — the same sentence is
// stored with the lead. The required agreement box links Terms + Privacy.
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
  /** Required box: [before, "Terms", middle, "Privacy Policy", after]. */
  agree: [string, string, string, string, string];
  needAgree: string;
  privacy: string;
  edit: string;
}> = {
  mr: {
    heading: "पुस्तक WhatsApp वर मिळवण्यासाठी माहिती भरा",
    name: "तुमचे नाव",
    namePlaceholder: "उदा. राहुल पाटील",
    whatsapp: "WhatsApp नंबर",
    whatsappHint: "पुस्तकाची PDF याच WhatsApp नंबरवर पाठवली जाईल",
    phonePlaceholder: "10 अंकी नंबर",
    pay: (price) => `पुढे जा — ₹${price} पेमेंट करा`,
    badName: "कृपया तुमचे योग्य नाव लिहा — फक्त अक्षरे, किमान २ (अंक किंवा चिन्हे नको).",
    badPhone: "कृपया तुमचा योग्य १० अंकी WhatsApp नंबर लिहा (6, 7, 8 किंवा 9 ने सुरू होणारा).",
    agree: ["मला ", "अटी", " व ", "गोपनीयता धोरण", " मान्य आहे; पुस्तक आणि ऑर्डरचे संदेश WhatsApp वर मिळावेत."],
    needAgree: "पुढे जाण्यासाठी ही चौकट निवडा.",
    privacy: "तुमचा नंबर फक्त पुस्तक पाठवण्यासाठी आणि ऑर्डरच्या मदतीसाठी वापरला जातो.",
    edit: "नाव / नंबर बदला",
  },
  hi: {
    heading: "किताब WhatsApp पर पाने के लिए जानकारी भरें",
    name: "आपका नाम",
    namePlaceholder: "जैसे राहुल शर्मा",
    whatsapp: "WhatsApp नंबर",
    whatsappHint: "किताब की PDF इसी WhatsApp नंबर पर भेजी जाएगी",
    phonePlaceholder: "10 अंकों का नंबर",
    pay: (price) => `आगे बढ़ें — ₹${price} भुगतान करें`,
    badName: "कृपया अपना सही नाम लिखें — केवल अक्षर, कम से कम 2 (अंक या चिह्न नहीं)।",
    badPhone: "कृपया अपना सही 10 अंकों का WhatsApp नंबर लिखें (6, 7, 8 या 9 से शुरू)।",
    agree: ["मुझे ", "शर्तें", " और ", "गोपनीयता नीति", " मंज़ूर हैं; किताब और ऑर्डर के संदेश WhatsApp पर मिलें।"],
    needAgree: "आगे बढ़ने के लिए यह बॉक्स चुनें।",
    privacy: "आपका नंबर केवल किताब भेजने और ऑर्डर में मदद के लिए इस्तेमाल होता है।",
    edit: "नाम / नंबर बदलें",
  },
  en: {
    heading: "Enter your details to get the book on WhatsApp",
    name: "Your name",
    namePlaceholder: "e.g. Rahul Patil",
    whatsapp: "WhatsApp number",
    whatsappHint: "The book PDF is sent to this WhatsApp number",
    phonePlaceholder: "10-digit number",
    pay: (price) => `Continue — pay ₹${price}`,
    badName: "Please enter your real name — letters only, at least 2 (no digits or symbols).",
    badPhone: "Please enter your real 10-digit WhatsApp number (starting with 6, 7, 8 or 9).",
    agree: ["I accept the ", "Terms", " and ", "Privacy Policy", ", and agree to get the book and order messages on WhatsApp."],
    needAgree: "Please tick this box to continue.",
    privacy: "Your number is used only to send the book and to help with your order.",
    edit: "Change name / number",
  },
};
