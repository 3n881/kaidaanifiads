// CLIENT-SAFE: paid consultation booking (/consultation, client 28 Nov).
// ₹999 per consultation, paid online; the team then calls / WhatsApps to fix
// the exact time. Topics follow the books, so a buyer lands on their subject.
import type { Locale } from "./i18n";

export const CONSULT_PRICE = 999;

export const TOPICS = ["land", "property", "house", "marriage", "rti", "atrocity", "credit_society", "gram_panchayat", "exams", "other"] as const;
export type Topic = (typeof TOPICS)[number];

/** Which topic a book belongs to (product id → topic). Unknown books → "other". */
const BOOK_TOPIC: Record<number, Topic> = {
  26: "land", 39: "land",
  4: "property", 27: "property",
  12: "house",
  8: "marriage",
  16: "rti", 30: "rti",
  19: "atrocity",
  25: "credit_society",
  32: "gram_panchayat", 33: "gram_panchayat", 34: "gram_panchayat", 35: "gram_panchayat", 36: "gram_panchayat", 37: "gram_panchayat", 38: "gram_panchayat",
  40: "exams",
};
export const topicForBook = (productId: number | null | undefined): Topic => (productId ? BOOK_TOPIC[productId] ?? "other" : "other");
export const isTopic = (v: unknown): v is Topic => (TOPICS as readonly string[]).includes(String(v));

export const SLOTS = ["morning", "afternoon", "evening"] as const;
export type Slot = (typeof SLOTS)[number];
export const MODES = ["phone", "whatsapp", "video"] as const;
export type Mode = (typeof MODES)[number];

type Copy = {
  navLabel: string;
  heroTitle: string;
  heroText: string;
  priceLabel: string;
  perSession: string;
  points: string[];
  stepsTitle: string;
  steps: [string, string, string];
  topics: Record<Topic, string>;
  fromBook: (title: string) => string;
  formTitle: string;
  topic: string;
  name: string;
  namePlaceholder: string;
  phone: string;
  phoneHint: string;
  phonePlaceholder: string;
  district: string;
  districtPlaceholder: string;
  problem: string;
  problemPlaceholder: string;
  problemHint: (min: number) => string;
  day: string;
  slot: string;
  slots: Record<Slot, string>;
  mode: string;
  modes: Record<Mode, string>;
  language: string;
  languages: Record<Locale, string>;
  consent: string;
  pay: (price: number) => string;
  secure: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  errors: { name: string; phone: string; district: string; description: string; date: string; consent: string; first: string };
  busy: string;
  payNotDone: string;
  payFailed: string;
  doneTitle: string;
  doneText: string;
  bookingNo: string;
  summary: string;
  backHome: string;
  orderCardTitle: string;
  orderCardText: (price: number) => string;
  orderCardButton: string;
};

const MR: Copy = {
  navLabel: "तज्ञ सल्ला",
  heroTitle: "तुमच्या प्रश्नावर तज्ञांशी थेट बोला",
  heroText: "पुस्तक वाचूनही तुमच्या स्वतःच्या केसबद्दल प्रश्न आहेत? जमीन, वारसा, RTI, विवाह, ग्रामपंचायत अशा विषयांवर फोन / WhatsApp / व्हिडिओ कॉलवर मार्गदर्शन मिळवा.",
  priceLabel: "सल्ला शुल्क",
  perSession: "एका सल्ल्यासाठी",
  points: ["तुमच्या भाषेत — मराठी, हिंदी किंवा इंग्रजी", "फोन, WhatsApp किंवा व्हिडिओ कॉल", "तुमच्या सोयीची वेळ", "पेमेंटनंतर 24 तासांत आमचा फोन / मेसेज"],
  stepsTitle: "कसे होते?",
  steps: ["फॉर्म भरा व ₹999 भरा", "आम्ही कॉल / मेसेज करून वेळ नक्की करू", "ठरलेल्या वेळी सल्ला"],
  topics: {
    land: "जमीन, मोजणी, हद्द व शेत रस्ता",
    property: "मालमत्ता वाटप व वारसा हक्क",
    house: "घर / फ्लॅट खरेदी",
    marriage: "विवाह, घटस्फोट व पोटगी",
    rti: "माहिती अधिकार (RTI)",
    atrocity: "अ‍ॅट्रॉसिटी कायदा",
    credit_society: "पतसंस्था / बँक फसवणूक",
    gram_panchayat: "ग्रामपंचायत व ग्रामसेवक",
    exams: "स्पर्धा परीक्षा मार्गदर्शन",
    other: "इतर प्रश्न",
  },
  fromBook: (title) => `तुम्ही घेतलेले पुस्तक: ${title}`,
  formTitle: "सल्ला बुक करा",
  topic: "विषय",
  name: "पूर्ण नाव",
  namePlaceholder: "उदा. राहुल पाटील",
  phone: "मोबाईल / WhatsApp नंबर",
  phoneHint: "याच नंबरवर आम्ही कॉल / मेसेज करू",
  phonePlaceholder: "10 अंकी नंबर",
  district: "जिल्हा",
  districtPlaceholder: "उदा. पुणे",
  problem: "तुमचा प्रश्न थोडक्यात",
  problemPlaceholder: "उदा. शेजाऱ्याने शेताचा रस्ता अडवला आहे, 7/12 वर रस्त्याची नोंद नाही…",
  problemHint: (min) => `किमान ${min} अक्षरे. नावे, कागदपत्रांचे क्रमांक नंतर फोनवर सांगा.`,
  day: "सोयीचा दिवस",
  slot: "सोयीची वेळ",
  slots: { morning: "सकाळ (10–1)", afternoon: "दुपार (1–4)", evening: "संध्याकाळ (4–7)" },
  mode: "कसा बोलायचे?",
  modes: { phone: "फोन कॉल", whatsapp: "WhatsApp कॉल", video: "व्हिडिओ कॉल" },
  language: "भाषा",
  languages: { mr: "मराठी", hi: "हिंदी", en: "English" },
  consent: "मी दिलेली माहिती सल्ल्यासाठी वापरण्यास व WhatsApp वर संपर्कासाठी मी सहमत आहे. हा सामान्य मार्गदर्शनाचा सल्ला आहे, न्यायालयीन प्रतिनिधित्व नाही.",
  pay: (price) => `सल्ला बुक करा · ₹${price} भरा`,
  secure: "सुरक्षित पेमेंट · UPI / Card / Netbanking",
  faqTitle: "नेहमीचे प्रश्न",
  faq: [
    { q: "पेमेंटनंतर पुढे काय?", a: "24 तासांत आम्ही तुमच्या नंबरवर कॉल किंवा WhatsApp मेसेज करून सल्ल्याची नेमकी वेळ ठरवू." },
    { q: "सल्ला किती वेळ असतो?", a: "एका विषयावर एक सल्ला. वेळ ठरवताना कालावधी सांगितला जाईल." },
    { q: "कागदपत्रे पाठवायची का?", a: "वेळ ठरल्यावर आवश्यक असल्यास आम्ही WhatsApp वर कागदपत्रे मागवू." },
  ],
  errors: {
    name: "कृपया योग्य नाव लिहा — फक्त अक्षरे, किमान 2.",
    phone: "कृपया योग्य 10 अंकी मोबाईल नंबर टाका.",
    district: "जिल्हा लिहा.",
    description: "तुमचा प्रश्न थोडक्यात लिहा (किमान 20 अक्षरे).",
    date: "पुढील 14 दिवसांतील दिवस निवडा.",
    consent: "पुढे जाण्यासाठी ही चौकट निवडा.",
    first: "लाल रंगातील माहिती तपासा.",
  },
  busy: "बुकिंग सध्या घेता आले नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
  payNotDone: "पेमेंट पूर्ण झाले नाही. पुन्हा 'सल्ला बुक करा' दाबा.",
  payFailed: "पेमेंट अयशस्वी झाले. पुन्हा प्रयत्न करा (दुसरे UPI ॲप / Card).",
  doneTitle: "सल्ला बुक झाला! ✅",
  doneText: "पेमेंट यशस्वी. 24 तासांत आम्ही तुम्हाला कॉल किंवा WhatsApp मेसेज करून सल्ल्याची वेळ नक्की करू.",
  bookingNo: "बुकिंग नंबर",
  summary: "तुमची निवड",
  backHome: "मुख्यपृष्ठावर जा",
  orderCardTitle: "या विषयावर तज्ञांशी बोलायचे आहे?",
  orderCardText: (price) => `तुमच्या स्वतःच्या प्रश्नावर फोन / WhatsApp / व्हिडिओ कॉलवर मार्गदर्शन · ₹${price}`,
  orderCardButton: "सल्ला बुक करा",
};

const HI: Copy = {
  ...MR,
  navLabel: "विशेषज्ञ सलाह",
  heroTitle: "अपने सवाल पर विशेषज्ञ से सीधे बात करें",
  heroText: "किताब पढ़ने के बाद भी अपने मामले के बारे में सवाल हैं? ज़मीन, विरासत, RTI, विवाह, ग्राम पंचायत जैसे विषयों पर फ़ोन / WhatsApp / वीडियो कॉल पर मार्गदर्शन पाएँ।",
  priceLabel: "सलाह शुल्क",
  perSession: "एक सलाह के लिए",
  points: ["आपकी भाषा में — मराठी, हिंदी या अंग्रेज़ी", "फ़ोन, WhatsApp या वीडियो कॉल", "आपकी सुविधा का समय", "भुगतान के 24 घंटे में हमारा कॉल / मैसेज"],
  stepsTitle: "कैसे होता है?",
  steps: ["फ़ॉर्म भरें व ₹999 दें", "हम कॉल / मैसेज करके समय तय करेंगे", "तय समय पर सलाह"],
  topics: {
    land: "ज़मीन, नाप, सीमा व खेत का रास्ता",
    property: "संपत्ति बँटवारा व विरासत",
    house: "घर / फ़्लैट ख़रीद",
    marriage: "विवाह, तलाक़ व भरण-पोषण",
    rti: "सूचना का अधिकार (RTI)",
    atrocity: "अत्याचार निवारण कानून",
    credit_society: "पतसंस्था / बैंक धोखाधड़ी",
    gram_panchayat: "ग्राम पंचायत व ग्राम सेवक",
    exams: "प्रतियोगी परीक्षा मार्गदर्शन",
    other: "अन्य सवाल",
  },
  fromBook: (title) => `आपकी ली हुई किताब: ${title}`,
  formTitle: "सलाह बुक करें",
  topic: "विषय",
  name: "पूरा नाम",
  namePlaceholder: "जैसे राहुल शर्मा",
  phone: "मोबाइल / WhatsApp नंबर",
  phoneHint: "इसी नंबर पर हम कॉल / मैसेज करेंगे",
  phonePlaceholder: "10 अंकों का नंबर",
  district: "ज़िला",
  districtPlaceholder: "जैसे पुणे",
  problem: "आपका सवाल संक्षेप में",
  problemPlaceholder: "जैसे पड़ोसी ने खेत का रास्ता रोक दिया है…",
  problemHint: (min) => `कम से कम ${min} अक्षर। नाम, दस्तावेज़ नंबर बाद में फ़ोन पर बताएँ।`,
  day: "सुविधा का दिन",
  slot: "सुविधा का समय",
  slots: { morning: "सुबह (10–1)", afternoon: "दोपहर (1–4)", evening: "शाम (4–7)" },
  mode: "कैसे बात करें?",
  modes: { phone: "फ़ोन कॉल", whatsapp: "WhatsApp कॉल", video: "वीडियो कॉल" },
  language: "भाषा",
  consent: "मैं दी गई जानकारी सलाह के लिए उपयोग करने व WhatsApp पर संपर्क के लिए सहमत हूँ। यह सामान्य मार्गदर्शन है, अदालत में प्रतिनिधित्व नहीं।",
  pay: (price) => `सलाह बुक करें · ₹${price} दें`,
  secure: "सुरक्षित भुगतान · UPI / Card / Netbanking",
  faqTitle: "अक्सर पूछे जाने वाले सवाल",
  faq: [
    { q: "भुगतान के बाद क्या होगा?", a: "24 घंटे में हम आपके नंबर पर कॉल या WhatsApp मैसेज करके सलाह का समय तय करेंगे।" },
    { q: "सलाह कितनी देर की होती है?", a: "एक विषय पर एक सलाह। समय तय करते समय अवधि बताई जाएगी।" },
    { q: "क्या दस्तावेज़ भेजने हैं?", a: "समय तय होने पर ज़रूरत हो तो हम WhatsApp पर दस्तावेज़ माँगेंगे।" },
  ],
  errors: {
    name: "कृपया सही नाम लिखें — केवल अक्षर, कम से कम 2।",
    phone: "कृपया सही 10 अंकों का मोबाइल नंबर डालें।",
    district: "ज़िला लिखें।",
    description: "अपना सवाल संक्षेप में लिखें (कम से कम 20 अक्षर)।",
    date: "अगले 14 दिनों में से दिन चुनें।",
    consent: "आगे बढ़ने के लिए यह बॉक्स चुनें।",
    first: "लाल रंग वाली जानकारी जाँचें।",
  },
  busy: "बुकिंग अभी नहीं हो सकी। कृपया थोड़ी देर बाद फिर कोशिश करें।",
  payNotDone: "भुगतान पूरा नहीं हुआ। फिर से 'सलाह बुक करें' दबाएँ।",
  payFailed: "भुगतान असफल रहा। फिर कोशिश करें (दूसरा UPI ऐप / Card)।",
  doneTitle: "सलाह बुक हो गई! ✅",
  doneText: "भुगतान सफल। 24 घंटे में हम कॉल या WhatsApp मैसेज करके सलाह का समय तय करेंगे।",
  bookingNo: "बुकिंग नंबर",
  summary: "आपकी पसंद",
  backHome: "मुख्य पृष्ठ पर जाएँ",
  orderCardTitle: "इस विषय पर विशेषज्ञ से बात करनी है?",
  orderCardText: (price) => `अपने सवाल पर फ़ोन / WhatsApp / वीडियो कॉल पर मार्गदर्शन · ₹${price}`,
  orderCardButton: "सलाह बुक करें",
};

const EN: Copy = {
  ...MR,
  navLabel: "Expert consultation",
  heroTitle: "Talk to an expert about your own question",
  heroText: "Still have questions about your own case after reading the book? Get guidance on land, inheritance, RTI, marriage, gram panchayat and more — by phone, WhatsApp or video call.",
  priceLabel: "Consultation fee",
  perSession: "per consultation",
  points: ["In your language — Marathi, Hindi or English", "Phone, WhatsApp or video call", "At a time that suits you", "We call / message you within 24 hours of payment"],
  stepsTitle: "How it works",
  steps: ["Fill the form and pay ₹999", "We call / message you to fix the time", "Consultation at the agreed time"],
  topics: {
    land: "Land, measurement, boundaries & farm road",
    property: "Property sharing & inheritance",
    house: "Buying a house / flat",
    marriage: "Marriage, divorce & maintenance",
    rti: "Right to Information (RTI)",
    atrocity: "Atrocities Act",
    credit_society: "Credit society / bank fraud",
    gram_panchayat: "Gram panchayat & gram sevak",
    exams: "Competitive exam guidance",
    other: "Other question",
  },
  fromBook: (title) => `Your book: ${title}`,
  formTitle: "Book a consultation",
  topic: "Topic",
  name: "Full name",
  namePlaceholder: "e.g. Rahul Patil",
  phone: "Mobile / WhatsApp number",
  phoneHint: "We will call / message this number",
  phonePlaceholder: "10-digit number",
  district: "District",
  districtPlaceholder: "e.g. Pune",
  problem: "Your question in short",
  problemPlaceholder: "e.g. My neighbour has blocked the road to my farm…",
  problemHint: (min) => `At least ${min} characters. Share names and document numbers later on the call.`,
  day: "Preferred day",
  slot: "Preferred time",
  slots: { morning: "Morning (10–1)", afternoon: "Afternoon (1–4)", evening: "Evening (4–7)" },
  mode: "How to talk?",
  modes: { phone: "Phone call", whatsapp: "WhatsApp call", video: "Video call" },
  language: "Language",
  consent: "I agree that my details are used for the consultation and that you contact me on WhatsApp. This is general guidance, not representation in court.",
  pay: (price) => `Book consultation · pay ₹${price}`,
  secure: "Secure payment · UPI / Card / Netbanking",
  faqTitle: "Questions",
  faq: [
    { q: "What happens after payment?", a: "Within 24 hours we call or WhatsApp you on your number to fix the exact time." },
    { q: "How long is a consultation?", a: "One consultation per topic. The duration is confirmed when the time is fixed." },
    { q: "Do I send documents?", a: "Once the time is fixed, we ask for any documents needed on WhatsApp." },
  ],
  errors: {
    name: "Please enter your real name — letters only, at least 2.",
    phone: "Please enter a valid 10-digit mobile number.",
    district: "Enter your district.",
    description: "Describe your question in short (at least 20 characters).",
    date: "Choose a day within the next 14 days.",
    consent: "Please tick this box to continue.",
    first: "Please check the fields in red.",
  },
  busy: "We could not take the booking right now. Please try again in a moment.",
  payNotDone: "Payment was not completed. Press 'Book consultation' again.",
  payFailed: "Payment failed. Try again (another UPI app / card).",
  doneTitle: "Consultation booked! ✅",
  doneText: "Payment successful. Within 24 hours we will call or WhatsApp you to fix the time.",
  bookingNo: "Booking number",
  summary: "Your choice",
  backHome: "Go to home page",
  orderCardTitle: "Want to talk to an expert about this topic?",
  orderCardText: (price) => `Guidance on your own question by phone / WhatsApp / video call · ₹${price}`,
  orderCardButton: "Book a consultation",
};

export const CONSULT_COPY: Record<Locale, Copy> = { mr: MR, hi: HI, en: EN };
