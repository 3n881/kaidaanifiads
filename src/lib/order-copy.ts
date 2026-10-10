import type { Locale } from "./i18n";

/** Order-page text not covered by ORDER_COPY (status screens, help). */
export const ORDER_EXTRA = {
  mr: {
    needHelp: "मदत हवी आहे? WhatsApp करा",
    preparing: "पेमेंट मिळाले आहे. फाइल तयार होत आहे — कृपया WhatsApp सपोर्टशी संपर्क करा.",
    gaveUp: "अजूनही पुष्टी झाली नाही. पैसे कापले गेले असल्यास हे पान नंतर पुन्हा उघडा किंवा WhatsApp सपोर्टशी संपर्क करा.",
    incompleteTitle: "ही लिंक अपूर्ण आहे",
    incompleteBody: "काळजी करू नका — तुमची खरेदी सुरक्षित आहे. ज्या मोबाईलवर पेमेंट केले, त्यावर ‘माझी पुस्तके’ मध्ये तुमची पुस्तके आहेत.",
    openMyBooks: "माझी पुस्तके उघडा (My Books)",
    busyTitle: "सिस्टम सध्या व्यस्त आहे",
    busyBody: "तुमचे पेमेंट सुरक्षित आहे. हे पान आपोआप अपडेट होईल आणि पुस्तक डाउनलोड होईल — कृपया हे पान बंद करू नका. (हे पान “माझी पुस्तके” मध्येही सेव्ह झाले आहे.)",
    yourOrder: "तुमची ऑर्डर",
    book: "पुस्तक",
    inApp: "Instagram मधून डाउनलोड होत नसल्यास: वरच्या कोपऱ्यातील ⋮ / … दाबा → Open in browser / Chrome. हे पान तिथे पुन्हा उघडेल आणि डाउनलोड होईल.",
  },
  hi: {
    needHelp: "मदद चाहिए? WhatsApp करें",
    preparing: "भुगतान मिल गया है। फ़ाइल तैयार हो रही है — कृपया WhatsApp सपोर्ट से संपर्क करें।",
    gaveUp: "अभी तक पुष्टि नहीं हुई। पैसे कट गए हों तो यह पेज बाद में फिर खोलें या WhatsApp सपोर्ट से संपर्क करें।",
    incompleteTitle: "यह लिंक अधूरी है",
    incompleteBody: "चिंता न करें — आपकी खरीदारी सुरक्षित है। जिस मोबाइल पर भुगतान किया, उस पर ‘मेरी किताबें’ में आपकी किताबें हैं।",
    openMyBooks: "मेरी किताबें खोलें (My Books)",
    busyTitle: "सिस्टम अभी व्यस्त है",
    busyBody: "आपका भुगतान सुरक्षित है। यह पेज अपने आप अपडेट होगा और किताब डाउनलोड हो जाएगी — कृपया यह पेज बंद न करें। (यह पेज “मेरी किताबें” में भी सेव हो गया है।)",
    yourOrder: "आपका ऑर्डर",
    book: "किताब",
    inApp: "Instagram से डाउनलोड न हो तो: ऊपर कोने में ⋮ / … दबाएँ → Open in browser / Chrome. यह पेज वहाँ फिर खुलेगा और डाउनलोड हो जाएगा।",
  },
  en: {
    needHelp: "Need help? WhatsApp us",
    preparing: "Payment received. Your file is being prepared — please contact WhatsApp support.",
    gaveUp: "Still not confirmed. If money was deducted, reopen this page later or contact WhatsApp support.",
    incompleteTitle: "This link is incomplete",
    incompleteBody: "Don't worry — your purchase is safe. Open ‘My Books’ on the phone you paid on.",
    openMyBooks: "Open My Books",
    busyTitle: "The system is busy right now",
    busyBody: "Your payment is safe. This page will update by itself and the book will download — please keep this page open. (It is also saved under “My Books”.)",
    yourOrder: "Your order",
    book: "Book",
    inApp: "Not downloading inside Instagram? Tap ⋮ / … in the top corner → Open in browser / Chrome. This page opens there and the download starts.",
  },
} satisfies Record<Locale, Record<string, string>>;

export type Platform = "android" | "ios" | "desktop" | "other";

/** "Where did my PDF go?" — steps per device, shown after the auto-download. */
export const DOWNLOAD_WHERE: Record<Locale, { title: string; file: string; steps: Record<Platform, string[]>; open: string }> = {
  mr: {
    title: "तुमची PDF कुठे सेव्ह झाली?",
    file: "फाइलचे नाव",
    open: "PDF उघडण्यासाठी फाइलवर टॅप करा — ती कोणत्याही PDF रीडर / ब्राउझरमध्ये उघडते.",
    steps: {
      android: ["वरून नोटिफिकेशन बार खाली ओढा आणि “Download complete” वर टॅप करा.", "किंवा फोनमधील Files / My Files ॲप उघडा → Downloads फोल्डर.", "Chrome मध्ये: ⋮ (वरचा कोपरा) → Downloads."],
      ios: ["Safari मध्ये पत्त्याच्या बारमधील ⬇️ (Downloads) चिन्हावर टॅप करा.", "किंवा Files ॲप उघडा → Browse → On My iPhone → Downloads.", "PDF थेट उघडली असल्यास, खालील Share बटण → “Save to Files” दाबा."],
      desktop: ["ब्राउझरचे Downloads उघडा: Windows वर Ctrl + J, Mac वर ⌘ + Option + L.", "किंवा संगणकातील Downloads फोल्डर उघडा."],
      other: ["फोनमधील Files / Downloads फोल्डर उघडा.", "ब्राउझरच्या मेनूमधील Downloads पहा."],
    },
  },
  hi: {
    title: "आपकी PDF कहाँ सेव हुई?",
    file: "फ़ाइल का नाम",
    open: "PDF खोलने के लिए फ़ाइल पर टैप करें — यह किसी भी PDF रीडर / ब्राउज़र में खुलती है।",
    steps: {
      android: ["ऊपर से नोटिफ़िकेशन बार नीचे खींचें और “Download complete” पर टैप करें।", "या फ़ोन में Files / My Files ऐप खोलें → Downloads फ़ोल्डर।", "Chrome में: ⋮ (ऊपर कोना) → Downloads."],
      ios: ["Safari में एड्रेस बार के ⬇️ (Downloads) निशान पर टैप करें।", "या Files ऐप खोलें → Browse → On My iPhone → Downloads.", "PDF सीधे खुल गई हो तो नीचे Share बटन → “Save to Files” दबाएँ।"],
      desktop: ["ब्राउज़र के Downloads खोलें: Windows पर Ctrl + J, Mac पर ⌘ + Option + L.", "या कंप्यूटर का Downloads फ़ोल्डर खोलें।"],
      other: ["फ़ोन का Files / Downloads फ़ोल्डर खोलें।", "ब्राउज़र के मेनू में Downloads देखें।"],
    },
  },
  en: {
    title: "Where was your PDF saved?",
    file: "File name",
    open: "Tap the file to open it — it opens in any PDF reader or browser.",
    steps: {
      android: ["Pull down the notification bar and tap “Download complete”.", "Or open the Files / My Files app → Downloads folder.", "In Chrome: ⋮ (top corner) → Downloads."],
      ios: ["In Safari, tap the ⬇️ (Downloads) icon in the address bar.", "Or open the Files app → Browse → On My iPhone → Downloads.", "If the PDF opened directly, tap Share → “Save to Files”."],
      desktop: ["Open your browser's downloads: Ctrl + J on Windows, ⌘ + Option + L on Mac.", "Or open the Downloads folder on your computer."],
      other: ["Open the Files / Downloads folder on your phone.", "Check Downloads in your browser's menu."],
    },
  },
};
