// Texts for the "didn't pay" screens in the Buy window (cancelled → stay in
// touch; failed → help). Client-safe. LEAD_CONSENT_TEXT is also stored with
// every lead (src/lib/leads.ts), so the record shows exactly what was agreed.
import type { Locale } from "./i18n";

export const LEAD_CONSENT_TEXT: Record<Locale, string> = {
  mr: "मला ऑफर्स आणि नवीन पुस्तकांची माहिती WhatsApp वर मिळण्यास संमती आहे. STOP पाठवून कधीही थांबवता येईल.",
  hi: "मैं ऑफ़र और नई किताबों की जानकारी WhatsApp पर पाने के लिए सहमत हूँ। STOP भेजकर कभी भी बंद कर सकते हैं।",
  en: "I agree to receive offers and new-book updates on WhatsApp. I can stop them any time by sending STOP.",
};

export const NOT_PAID_COPY: Record<Locale, {
  cancelledTitle: string;
  cancelledBody: string;
  leadTitle: string;
  leadBody: string;
  phone: string;
  notify: string;
  noThanks: string;
  leadDone: string;
  badPhone: string;
  needConsent: string;
  busy: string;
  failedTitle: string;
  failedSafe: string;
  failedTip: string;
  help: string;
}> = {
  mr: {
    cancelledTitle: "पेमेंट पूर्ण झाले नाही",
    cancelledBody: "काही हरकत नाही — तुम्ही पुन्हा प्रयत्न करू शकता.",
    leadTitle: "हे पुस्तक नंतर घ्यायचे आहे?",
    leadBody: "ऑफर्स आणि नवीन पुस्तकांची माहिती WhatsApp वर मिळवा.",
    phone: "WhatsApp नंबर (१० अंकी)",
    notify: "मला कळवा",
    noThanks: "नको, धन्यवाद",
    leadDone: "धन्यवाद! ऑफर्स आणि नवीन पुस्तके WhatsApp वर कळवू.",
    badPhone: "कृपया वैध १० अंकी WhatsApp नंबर भरा.",
    needConsent: "पुढे जाण्यासाठी संमतीच्या चौकटीत खूण करा.",
    busy: "आत्ता जतन करता आले नाही. थोड्या वेळाने पुन्हा प्रयत्न करा.",
    failedTitle: "पेमेंट अयशस्वी झाले",
    failedSafe: "तुमच्या खात्यातून पैसे कापले गेले असतील तर ते ५–७ दिवसांत आपोआप परत येतील.",
    failedTip: "दुसरे UPI ॲप, डेबिट/क्रेडिट कार्ड किंवा नेटबँकिंग वापरून पहा.",
    help: "मदत हवी? WhatsApp करा",
  },
  hi: {
    cancelledTitle: "भुगतान पूरा नहीं हुआ",
    cancelledBody: "कोई बात नहीं — आप फिर से कोशिश कर सकते हैं।",
    leadTitle: "यह किताब बाद में लेनी है?",
    leadBody: "ऑफ़र और नई किताबों की जानकारी WhatsApp पर पाएं।",
    phone: "WhatsApp नंबर (10 अंक)",
    notify: "मुझे बताएं",
    noThanks: "नहीं, धन्यवाद",
    leadDone: "धन्यवाद! ऑफ़र और नई किताबें WhatsApp पर बताएंगे।",
    badPhone: "कृपया सही 10 अंकों का WhatsApp नंबर लिखें।",
    needConsent: "आगे बढ़ने के लिए सहमति वाले बॉक्स पर टिक करें।",
    busy: "अभी सेव नहीं हो सका। थोड़ी देर बाद फिर कोशिश करें।",
    failedTitle: "भुगतान विफल रहा",
    failedSafe: "अगर आपके खाते से पैसे कट गए हैं, तो वे 5–7 दिनों में अपने-आप वापस आ जाएंगे।",
    failedTip: "दूसरा UPI ऐप, डेबिट/क्रेडिट कार्ड या नेटबैंकिंग आज़माएं।",
    help: "मदद चाहिए? WhatsApp करें",
  },
  en: {
    cancelledTitle: "Payment not completed",
    cancelledBody: "No problem — you can try again.",
    leadTitle: "Want this book later?",
    leadBody: "Get offers and new books on WhatsApp.",
    phone: "WhatsApp number (10 digits)",
    notify: "Notify me",
    noThanks: "No thanks",
    leadDone: "Thanks! We'll send offers and new books on WhatsApp.",
    badPhone: "Please enter a valid 10-digit WhatsApp number.",
    needConsent: "Please tick the consent box to continue.",
    busy: "Couldn't save right now. Please try again in a moment.",
    failedTitle: "Payment failed",
    failedSafe: "If money was deducted from your account, it is refunded automatically in 5–7 days.",
    failedTip: "Try another UPI app, a debit/credit card or net banking.",
    help: "Need help? WhatsApp us",
  },
};
