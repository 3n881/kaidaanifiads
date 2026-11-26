// CLIENT-SAFE: the printed-book option (client, 26 Nov): every book can also
// be ordered as a printed copy for home delivery. Online payment = ₹399 with
// free delivery; Cash on Delivery = ₹399 + ₹50. Printed copy only (no PDF).
import type { Locale } from "./i18n";

export const PRINT_PRICE = 399;
export const COD_FEE = 50;
export type PrintPayment = "online" | "cod";
export const printTotal = (payment: PrintPayment) => PRINT_PRICE + (payment === "cod" ? COD_FEE : 0);

export const PRINT_COPY: Record<Locale, {
  // book page
  formatTitle: string;
  ebook: string;
  ebookNote: string;
  print: string;
  printNote: string;
  printBadge: string;
  printOrder: (price: number) => string;
  printOrderShort: string;
  printNotice: string;
  // checkout page
  pageTitle: string;
  back: string;
  steps: [string, string, string];
  printedCopy: string;
  addressTitle: string;
  name: string;
  namePlaceholder: string;
  phone: string;
  phoneHint: string;
  phonePlaceholder: string;
  house: string;
  housePlaceholder: string;
  area: string;
  areaPlaceholder: string;
  landmark: string;
  landmarkPlaceholder: string;
  optional: string;
  pincode: string;
  city: string;
  cityPlaceholder: string;
  district: string;
  districtPlaceholder: string;
  state: string;
  paymentTitle: string;
  online: string;
  onlineNote: string;
  recommended: string;
  cod: string;
  codNote: (fee: number) => string;
  summaryTitle: string;
  bookLine: string;
  delivery: string;
  free: string;
  codFee: string;
  total: string;
  payOnline: (total: number) => string;
  placeCod: (total: number) => string;
  deliveryTime: string;
  agree: string;
  terms: string;
  privacy: string;
  errors: {
    name: string;
    phone: string;
    house: string;
    area: string;
    pincode: string;
    city: string;
    district: string;
    state: string;
    first: string;
  };
  // after ordering
  doneTitle: string;
  doneOnline: string;
  doneCod: (total: number) => string;
  orderNo: string;
  shipTo: string;
  whatsappUpdate: string;
  continueShopping: string;
  busy: string;
  payNotDone: string;
  payFailed: string;
}> = {
  mr: {
    formatTitle: "पुस्तक कसे हवे?",
    ebook: "ई-बुक (PDF)",
    ebookNote: "लगेच WhatsApp वर",
    print: "छापील पुस्तक",
    printNote: "घरपोच डिलिव्हरी",
    printBadge: "नवीन",
    printOrder: (price) => `छापील पुस्तक मागवा · ₹${price}`,
    printOrderShort: "छापील पुस्तक मागवा",
    printNotice: "📦 छापील पुस्तक तुमच्या पत्त्यावर पाठवले जाईल · ऑनलाइन पेमेंटवर डिलिव्हरी मोफत · कॅश ऑन डिलिव्हरीवर ₹50 जास्त.",
    pageTitle: "छापील पुस्तक ऑर्डर",
    back: "पुस्तकाकडे परत",
    steps: ["पत्ता", "पेमेंट", "ऑर्डर"],
    printedCopy: "छापील प्रत · घरपोच",
    addressTitle: "डिलिव्हरीचा पत्ता",
    name: "पूर्ण नाव",
    namePlaceholder: "उदा. राहुल पाटील",
    phone: "मोबाईल / WhatsApp नंबर",
    phoneHint: "डिलिव्हरीसाठी कुरिअरवाला याच नंबरवर फोन करेल",
    phonePlaceholder: "10 अंकी नंबर",
    house: "घर / फ्लॅट नंबर, इमारत",
    housePlaceholder: "उदा. घर नं. 12, साई अपार्टमेंट",
    area: "रस्ता / परिसर / गाव",
    areaPlaceholder: "उदा. शिवाजी नगर, मु. पो. वडगाव",
    landmark: "जवळची खूण",
    landmarkPlaceholder: "उदा. ग्रामपंचायत कार्यालयाजवळ",
    optional: "ऐच्छिक",
    pincode: "पिनकोड",
    city: "शहर / तालुका",
    cityPlaceholder: "उदा. बारामती",
    district: "जिल्हा",
    districtPlaceholder: "उदा. पुणे",
    state: "राज्य",
    paymentTitle: "पेमेंट कसे करणार?",
    online: "ऑनलाइन पेमेंट",
    onlineNote: "UPI / GPay / PhonePe / Card · डिलिव्हरी मोफत",
    recommended: "शिफारस",
    cod: "कॅश ऑन डिलिव्हरी (COD)",
    codNote: (fee) => `पुस्तक हातात आल्यावर रोख द्या · डिलिव्हरी शुल्क ₹${fee}`,
    summaryTitle: "ऑर्डरचा सारांश",
    bookLine: "छापील पुस्तक",
    delivery: "डिलिव्हरी",
    free: "मोफत",
    codFee: "डिलिव्हरी शुल्क (COD)",
    total: "एकूण",
    payOnline: (total) => `ऑर्डर करा · ₹${total} पेमेंट करा`,
    placeCod: (total) => `ऑर्डर कन्फर्म करा · ₹${total} (COD)`,
    deliveryTime: "🚚 ऑर्डरनंतर साधारण 5–7 दिवसांत डिलिव्हरी",
    agree: "पुढे गेल्यास अटी व गोपनीयता धोरण लागू.",
    terms: "अटी",
    privacy: "गोपनीयता धोरण",
    errors: {
      name: "कृपया योग्य नाव लिहा — फक्त अक्षरे, किमान 2.",
      phone: "कृपया योग्य 10 अंकी मोबाईल नंबर टाका.",
      house: "घर / फ्लॅट नंबर किंवा इमारत लिहा.",
      area: "रस्ता / परिसर / गाव लिहा.",
      pincode: "6 अंकी योग्य पिनकोड टाका.",
      city: "शहर / तालुका लिहा.",
      district: "जिल्हा लिहा.",
      state: "राज्य निवडा.",
      first: "लाल रंगातील माहिती तपासा.",
    },
    doneTitle: "ऑर्डर मिळाली! ✅",
    doneOnline: "पेमेंट यशस्वी झाले. तुमचे छापील पुस्तक लवकरच पाठवले जाईल.",
    doneCod: (total) => `पुस्तक हातात आल्यावर कुरिअरवाल्याला ₹${total} रोख द्या.`,
    orderNo: "ऑर्डर नंबर",
    shipTo: "या पत्त्यावर पाठवले जाईल",
    whatsappUpdate: "पुस्तक पाठवल्यावर आम्ही WhatsApp वर कळवू.",
    continueShopping: "इतर पुस्तके पाहा",
    busy: "ऑर्डर सध्या घेता आली नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
    payNotDone: "पेमेंट पूर्ण झाले नाही. पुन्हा 'ऑर्डर करा' दाबा, किंवा कॅश ऑन डिलिव्हरी निवडा.",
    payFailed: "पेमेंट अयशस्वी झाले. पुन्हा प्रयत्न करा (दुसरे UPI ॲप / Card), किंवा कॅश ऑन डिलिव्हरी निवडा.",
  },
  hi: {
    formatTitle: "किताब कैसे चाहिए?",
    ebook: "ई-बुक (PDF)",
    ebookNote: "तुरंत WhatsApp पर",
    print: "छपी हुई किताब",
    printNote: "घर पर डिलीवरी",
    printBadge: "नया",
    printOrder: (price) => `छपी किताब मंगवाएँ · ₹${price}`,
    printOrderShort: "छपी किताब मंगवाएँ",
    printNotice: "📦 छपी किताब आपके पते पर भेजी जाएगी · ऑनलाइन भुगतान पर डिलीवरी मुफ्त · कैश ऑन डिलीवरी पर ₹50 अतिरिक्त।",
    pageTitle: "छपी किताब ऑर्डर",
    back: "किताब पर वापस",
    steps: ["पता", "भुगतान", "ऑर्डर"],
    printedCopy: "छपी प्रति · घर पर डिलीवरी",
    addressTitle: "डिलीवरी का पता",
    name: "पूरा नाम",
    namePlaceholder: "जैसे राहुल शर्मा",
    phone: "मोबाइल / WhatsApp नंबर",
    phoneHint: "डिलीवरी के लिए कूरियर वाला इसी नंबर पर फ़ोन करेगा",
    phonePlaceholder: "10 अंकों का नंबर",
    house: "मकान / फ़्लैट नंबर, इमारत",
    housePlaceholder: "जैसे मकान नं. 12, साई अपार्टमेंट",
    area: "सड़क / इलाका / गाँव",
    areaPlaceholder: "जैसे शिवाजी नगर",
    landmark: "पास की पहचान",
    landmarkPlaceholder: "जैसे पंचायत कार्यालय के पास",
    optional: "वैकल्पिक",
    pincode: "पिनकोड",
    city: "शहर / तहसील",
    cityPlaceholder: "जैसे बारामती",
    district: "ज़िला",
    districtPlaceholder: "जैसे पुणे",
    state: "राज्य",
    paymentTitle: "भुगतान कैसे करेंगे?",
    online: "ऑनलाइन भुगतान",
    onlineNote: "UPI / GPay / PhonePe / Card · डिलीवरी मुफ्त",
    recommended: "सुझाव",
    cod: "कैश ऑन डिलीवरी (COD)",
    codNote: (fee) => `किताब हाथ में आने पर नकद दें · डिलीवरी शुल्क ₹${fee}`,
    summaryTitle: "ऑर्डर सारांश",
    bookLine: "छपी किताब",
    delivery: "डिलीवरी",
    free: "मुफ्त",
    codFee: "डिलीवरी शुल्क (COD)",
    total: "कुल",
    payOnline: (total) => `ऑर्डर करें · ₹${total} भुगतान करें`,
    placeCod: (total) => `ऑर्डर कन्फर्म करें · ₹${total} (COD)`,
    deliveryTime: "🚚 ऑर्डर के बाद लगभग 5–7 दिनों में डिलीवरी",
    agree: "आगे बढ़ने पर नियम व गोपनीयता नीति लागू।",
    terms: "नियम",
    privacy: "गोपनीयता नीति",
    errors: {
      name: "कृपया सही नाम लिखें — केवल अक्षर, कम से कम 2।",
      phone: "कृपया सही 10 अंकों का मोबाइल नंबर डालें।",
      house: "मकान / फ़्लैट नंबर या इमारत लिखें।",
      area: "सड़क / इलाका / गाँव लिखें।",
      pincode: "6 अंकों का सही पिनकोड डालें।",
      city: "शहर / तहसील लिखें।",
      district: "ज़िला लिखें।",
      state: "राज्य चुनें।",
      first: "लाल रंग वाली जानकारी जाँचें।",
    },
    doneTitle: "ऑर्डर मिल गया! ✅",
    doneOnline: "भुगतान सफल रहा। आपकी छपी किताब जल्द भेजी जाएगी।",
    doneCod: (total) => `किताब हाथ में आने पर कूरियर वाले को ₹${total} नकद दें।`,
    orderNo: "ऑर्डर नंबर",
    shipTo: "इस पते पर भेजी जाएगी",
    whatsappUpdate: "किताब भेजने पर हम WhatsApp पर बताएँगे।",
    continueShopping: "दूसरी किताबें देखें",
    busy: "ऑर्डर अभी नहीं ली जा सकी। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    payNotDone: "भुगतान पूरा नहीं हुआ। फिर से 'ऑर्डर करें' दबाएँ, या कैश ऑन डिलीवरी चुनें।",
    payFailed: "भुगतान असफल रहा। फिर कोशिश करें (दूसरा UPI ऐप / Card), या कैश ऑन डिलीवरी चुनें।",
  },
  en: {
    formatTitle: "Choose a format",
    ebook: "E-book (PDF)",
    ebookNote: "Instantly on WhatsApp",
    print: "Printed book",
    printNote: "Home delivery",
    printBadge: "New",
    printOrder: (price) => `Order printed book · ₹${price}`,
    printOrderShort: "Order printed book",
    printNotice: "📦 The printed book is shipped to your address · free delivery with online payment · Cash on Delivery ₹50 extra.",
    pageTitle: "Printed book order",
    back: "Back to the book",
    steps: ["Address", "Payment", "Order"],
    printedCopy: "Printed copy · home delivery",
    addressTitle: "Delivery address",
    name: "Full name",
    namePlaceholder: "e.g. Rahul Patil",
    phone: "Mobile / WhatsApp number",
    phoneHint: "The courier will call this number for delivery",
    phonePlaceholder: "10-digit number",
    house: "House / flat no., building",
    housePlaceholder: "e.g. House 12, Sai Apartment",
    area: "Street / area / village",
    areaPlaceholder: "e.g. Shivaji Nagar",
    landmark: "Landmark",
    landmarkPlaceholder: "e.g. near the gram panchayat office",
    optional: "optional",
    pincode: "PIN code",
    city: "City / taluka",
    cityPlaceholder: "e.g. Baramati",
    district: "District",
    districtPlaceholder: "e.g. Pune",
    state: "State",
    paymentTitle: "How will you pay?",
    online: "Pay online",
    onlineNote: "UPI / GPay / PhonePe / Card · free delivery",
    recommended: "Recommended",
    cod: "Cash on Delivery (COD)",
    codNote: (fee) => `Pay cash when the book arrives · ₹${fee} delivery charge`,
    summaryTitle: "Order summary",
    bookLine: "Printed book",
    delivery: "Delivery",
    free: "Free",
    codFee: "Delivery (COD)",
    total: "Total",
    payOnline: (total) => `Place order · pay ₹${total}`,
    placeCod: (total) => `Confirm order · ₹${total} (COD)`,
    deliveryTime: "🚚 Delivered in about 5–7 days after ordering",
    agree: "By continuing you accept the Terms and Privacy Policy.",
    terms: "Terms",
    privacy: "Privacy Policy",
    errors: {
      name: "Please enter your real name — letters only, at least 2.",
      phone: "Please enter a valid 10-digit mobile number.",
      house: "Enter the house / flat number or building.",
      area: "Enter the street / area / village.",
      pincode: "Enter a valid 6-digit PIN code.",
      city: "Enter the city / taluka.",
      district: "Enter the district.",
      state: "Choose the state.",
      first: "Please check the fields in red.",
    },
    doneTitle: "Order received! ✅",
    doneOnline: "Payment successful. Your printed book will be shipped soon.",
    doneCod: (total) => `Pay ₹${total} in cash to the courier when the book arrives.`,
    orderNo: "Order number",
    shipTo: "Will be delivered to",
    whatsappUpdate: "We'll message you on WhatsApp when it ships.",
    continueShopping: "See more books",
    busy: "We could not take the order right now. Please try again in a moment.",
    payNotDone: "Payment was not completed. Press 'Place order' again, or choose Cash on Delivery.",
    payFailed: "Payment failed. Try again (another UPI app / card), or choose Cash on Delivery.",
  },
};
