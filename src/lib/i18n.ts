export const LOCALES = ["mr", "hi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "mr";

export const LOCALE_LABELS: Record<Locale, string> = {
  mr: "मराठी",
  hi: "हिंदी",
  en: "English",
};

export const LOCALE_TO_PRODUCT_LANGUAGE = {
  mr: "Marathi",
  hi: "Hindi",
  en: "English",
} as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export type LocalizedTitleRow = {
  title?: string | null;
  title_mr?: string | null;
  title_hi?: string | null;
  title_en?: string | null;
};

export function localizedTitle(
  row: LocalizedTitleRow | null | undefined,
  locale: Locale,
): string {
  if (!row) return "";
  return row[`title_${locale}`] || row.title_mr || row.title || "";
}

export const UI_COPY = {
  mr: {
    skip: "मुख्य मजकुरावर जा",
    language: "भाषा",
    nav: ["मुख्यपृष्ठ", "ई-बुक्स", "कॉम्बो पॅक्स", "आमच्याबद्दल", "माझी पुस्तके"],
    // Shown under the menu labels in the header (as on the previous site).
    navEn: ["(Home)", "(E-Books)", "(Combos)", "(About)", ""],
    buyNow: "खरेदी करा (Buy Now)",
    search: "पुस्तके शोधा…",
    all: "सर्व भाषा",
    categories: "वर्ग",
    sort: "क्रमवारी",
    showing: "पुस्तके दिसत आहेत",
    noBooks: "या निवडीसाठी काही पुस्तके सापडली नाहीत.",
    pages: "पाने",
    limitedOffer: "ऑफर मर्यादित वेळेसाठी फक्त",
    downloadPdf: "PDF डाऊनलोड करा",
    downloadNow: "आत्ताच डाऊनलोड करा",
    openingPayment: "सुरक्षित पेमेंट उघडत आहे…",
    noAccount: "Account, नाव किंवा मोबाईल नंबरची गरज नाही.",
    retry: "पुन्हा प्रयत्न करा",
    close: "बंद करा",
    paymentCancelled: "पेमेंट रद्द झाले. तुम्ही पुन्हा प्रयत्न करू शकता.",
    checkoutFailed: "Checkout सुरू होऊ शकले नाही. कृपया तुमचे इंटरनेट तपासा.",
  },
  hi: {
    skip: "मुख्य सामग्री पर जाएँ",
    language: "भाषा",
    nav: ["होम", "ई-बुक्स", "कॉम्बो पैक्स", "हमारे बारे में", "मेरी किताबें"],
    navEn: ["(Home)", "(E-Books)", "(Combos)", "(About)", ""],
    buyNow: "अभी खरीदें",
    search: "किताबें खोजें…",
    all: "सभी भाषाएँ",
    categories: "श्रेणी",
    sort: "क्रम",
    showing: "किताबें दिखाई जा रही हैं",
    noBooks: "इस चयन के लिए कोई किताब नहीं मिली।",
    pages: "पृष्ठ",
    limitedOffer: "ऑफर केवल सीमित समय के लिए",
    downloadPdf: "PDF डाउनलोड करें",
    downloadNow: "अभी डाउनलोड करें",
    openingPayment: "सुरक्षित पेमेंट खुल रहा है…",
    noAccount: "अकाउंट, नाम या मोबाइल नंबर की जरूरत नहीं है।",
    retry: "फिर से कोशिश करें",
    close: "बंद करें",
    paymentCancelled: "पेमेंट रद्द हो गया। आप फिर से कोशिश कर सकते हैं।",
    checkoutFailed: "Checkout शुरू नहीं हो सका। कृपया अपना इंटरनेट जाँचें।",
  },
  en: {
    skip: "Skip to main content",
    language: "Language",
    nav: ["Home", "E-Books", "Combo Packs", "About", "My Books"],
    navEn: ["", "", "", "", ""],
    buyNow: "Buy now",
    search: "Search books…",
    all: "All languages",
    categories: "Category",
    sort: "Sort",
    showing: "books shown",
    noBooks: "No books match this selection.",
    pages: "Pages",
    limitedOffer: "Limited-time offer",
    downloadPdf: "Download PDF",
    downloadNow: "Download now",
    openingPayment: "Opening secure payment…",
    noAccount: "No account, name, or mobile number required.",
    retry: "Try again",
    close: "Close",
    paymentCancelled: "Payment was cancelled. You can try again.",
    checkoutFailed: "Checkout could not be started. Please check your connection.",
  },
} as const;

export const ORDER_COPY = {
  mr: {
    pending: "पेमेंटची पुष्टी होत आहे…",
    failed: "पेमेंट पूर्ण झाले नाही",
    retry: "पुन्हा प्रयत्न करा",
    paid: "पेमेंट यशस्वी झाले!",
    singleDownload: "तुमचे डाउनलोड सुरू झाले आहे. न झाल्यास खालील बटन दाबा.",
    multiDownload: "खालील प्रत्येक पुस्तक डाउनलोड करा.",
    bookmark: "हे पान सेव्ह करा — तुम्ही येथून PDF पुन्हा डाउनलोड करू शकता.",
    whatsappTitle: "पुस्तक PDF WhatsApp वर मिळवा",
    whatsappBody: "तुमचा नंबर द्या. पुस्तक PDF स्वरूपात WhatsApp वर पाठवले जाईल.",
    name: "नाव (ऐच्छिक)",
    phone: "१० अंकी WhatsApp नंबर",
    send: "WhatsApp वर पाठवा",
    sending: "पाठवत आहे…",
    sent: "पुस्तक PDF स्वरूपात WhatsApp वर पाठवले आहे.",
    saved: "नंबर सेव्ह झाला. हे पुस्तक आता My Books मध्येही मिळेल.",
    invalidPhone: "कृपया वैध १० अंकी WhatsApp नंबर भरा.",
    later: "आत्ता नको",
    help: "डाउनलोडमध्ये अडचण? WhatsApp करा",
    alreadySent: "पुस्तक PDF WhatsApp वरही पाठवले आहे.",
    otherNumber: "दुसऱ्या नंबरवर पाठवा",
  },
  hi: {
    pending: "पेमेंट की पुष्टि हो रही है…",
    failed: "पेमेंट पूरा नहीं हुआ",
    retry: "फिर से कोशिश करें",
    paid: "पेमेंट सफल रहा!",
    singleDownload: "आपका डाउनलोड शुरू हो गया है। नहीं हुआ तो नीचे का बटन दबाएँ।",
    multiDownload: "नीचे दी गई हर किताब डाउनलोड करें।",
    bookmark: "इस पेज को सेव करें — आप यहाँ से PDF फिर डाउनलोड कर सकते हैं।",
    whatsappTitle: "किताब की PDF WhatsApp पर पाएँ",
    whatsappBody: "अपना नंबर दें। किताब PDF के रूप में WhatsApp पर भेजी जाएगी।",
    name: "नाम (वैकल्पिक)",
    phone: "10 अंकों का WhatsApp नंबर",
    send: "WhatsApp पर भेजें",
    sending: "भेज रहे हैं…",
    sent: "किताब PDF के रूप में WhatsApp पर भेज दी गई है।",
    saved: "नंबर सेव हो गया। यह किताब अब My Books में भी मिलेगी।",
    invalidPhone: "कृपया सही 10 अंकों का WhatsApp नंबर दर्ज करें।",
    later: "अभी नहीं",
    help: "डाउनलोड में समस्या? WhatsApp करें",
    alreadySent: "किताब की PDF WhatsApp पर भी भेज दी गई है।",
    otherNumber: "दूसरे नंबर पर भेजें",
  },
  en: {
    pending: "Confirming your payment…",
    failed: "Payment was not completed",
    retry: "Try again",
    paid: "Payment successful!",
    singleDownload: "Your download has started. If it did not, use the button below.",
    multiDownload: "Download each book below.",
    bookmark: "Save this page — you can download your PDF again here.",
    whatsappTitle: "Get your PDF on WhatsApp",
    whatsappBody: "Enter your number and we’ll send the book PDF on WhatsApp.",
    name: "Name (optional)",
    phone: "10-digit WhatsApp number",
    send: "Send on WhatsApp",
    sending: "Sending…",
    sent: "The book PDF was sent on WhatsApp.",
    saved: "Number saved. This book is now also available in My Books.",
    invalidPhone: "Enter a valid 10-digit WhatsApp number.",
    later: "Not now",
    help: "Download problem? Message us on WhatsApp",
    alreadySent: "The book PDF was also sent on WhatsApp.",
    otherNumber: "Send to another number",
  },
} as const;
