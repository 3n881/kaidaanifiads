// ---------------------------------------------------------------------------
// SINGLE SOURCE OF CATALOG DATA (Phase 1 = frontend only)
//
// This is the ONE place data comes from. In Phase 2 the admin dashboard /
// Supabase replaces the arrays below — the UI reads everything through the
// helpers in `src/lib/catalog.ts`, so nothing else needs to change.
//
// Seed rows use the REAL titles / prices / pages / language from the client's
// site, with short placeholder descriptions. The admin will later edit the
// full descriptions, cover images and PDF files.
// ---------------------------------------------------------------------------

export type Language = "Marathi" | "Hindi" | "English";
export type Category = "Property Law" | "Civil Law" | "Other";
export type ProductLocale = "mr" | "hi" | "en";

export interface ProductEdition {
  title: string;
  shortDescription: string;
  description: string;
  pages: number;
  coverImage?: string;
  galleryImages: string[];
}

export interface Product {
  /** Stable id (kept from the reference site). */
  id: number;
  /** URL-safe slug used in /ebooks/[slug] and /combos/[slug]. */
  slug: string;
  title: string;
  /** 1–2 line summary shown on cards. */
  shortDescription: string;
  /** Full description shown on the detail page (admin-editable later). */
  description: string;
  /** Original price (struck through). */
  mrp: number;
  /** Discounted price. */
  price: number;
  pages: number;
  language: Language;
  isCombo: boolean;
  /** Number of books bundled (combos only). */
  setSize?: number;
  rating: number;
  /** Gradient used for the placeholder cover until a real image is uploaded. */
  cover: { from: string; to: string };
  featured?: boolean;
  /** Admin can hide a product without deleting it (defaults to visible). */
  active?: boolean;
  /** Legal category (from DB `category` column). */
  category?: Category;
  /** Uploaded cover image URL (from the `covers` bucket). Falls back to gradient. */
  coverImage?: string;
  /** Optional inside-page previews. The cover plus these is capped at five images. */
  galleryImages?: string[];
  /** PDF editions currently available for checkout. */
  availableLocales?: ProductLocale[];
  /** Customer-facing content and media for each language edition. */
  localized?: Partial<Record<ProductLocale, ProductEdition>>;
}

/** Slim product shape for the site-wide search box (shipped on every page). */
export type SearchItem = Pick<
  Product,
  "id" | "slug" | "title" | "price" | "pages" | "language" | "isCombo" | "localized" | "availableLocales"
>;

/** Deterministic gradient placeholder cover for a given product id. */
export function gradientForId(id: number): { from: string; to: string } {
  return COVERS[Math.abs(id) % COVERS.length];
}

const COVERS: Array<{ from: string; to: string }> = [
  { from: "#0a2342", to: "#16345c" },
  { from: "#102a4c", to: "#0a2342" },
  { from: "#14395f", to: "#0a2342" },
  { from: "#0a2342", to: "#1f2937" },
  { from: "#12305a", to: "#0a2342" },
  { from: "#0a2342", to: "#243b53" },
];

const cover = (i: number) => COVERS[i % COVERS.length];

// --------------------------------- Ebooks ----------------------------------

export const ebooks: Product[] = [
  {
    id: 30,
    slug: "rti-adhiniyam-2005-sampurna-guide",
    title:
      "ब्रह्मास्त्र सूचना का अधिकार (RTI) अधिनियम 2005 आवेदन एवं अपील संपूर्ण गाइड",
    shortDescription:
      "सूचना के अधिकार का प्रभावी उपयोग — आवेदन, अपील प्रक्रिया, कानूनी प्रावधान और तैयार प्रारूप।",
    description:
      "अपने सूचना के अधिकार का सही और प्रभावी उपयोग करने के लिए तैयार किया गया यह गाइड आवेदन, अपील प्रक्रिया, कानूनी प्रावधान, आवश्यक प्रारूप (Formats) तथा सरकारी विभागों से जानकारी प्राप्त करने की संपूर्ण प्रक्रिया को सरल एवं व्यावहारिक भाषा में समझाता है।",
    mrp: 198,
    price: 99,
    pages: 245,
    language: "Hindi",
    isCombo: false,
    rating: 4.8,
    cover: cover(1),
    featured: true,
  },
  {
    id: 27,
    slug: "hindu-uttaradhikar-kanoon-guide",
    title:
      "हिंदू उत्तराधिकार कानून: संपत्ति बंटवारा और ज़मीन विभाजन की सम्पूर्ण गाइड (सरल भाषा में)",
    shortDescription:
      "संपत्ति बंटवारा, ज़मीन विभाजन और उत्तराधिकार के कानून — आसान भाषा में complete practical guide।",
    description:
      "हिंदू उत्तराधिकार अधिनियम, 1956 की सरल व्याख्या, पुत्र और पुत्री के समान अधिकार (2005 संशोधन), पैतृक व स्वयं अर्जित संपत्ति के प्रकार, परिवार में संपत्ति का सही बंटवारा, वारिसों की पूरी सूची (Class 1 & Class 2 heirs), वसीयत और बिना वसीयत के नियम, महिलाओं के अधिकार तथा ज़मीन विवाद से बचने के practical तरीके इस पुस्तक में शामिल हैं।",
    mrp: 198,
    price: 99,
    pages: 161,
    language: "Hindi",
    isCombo: false,
    rating: 4.8,
    cover: cover(4),
  },
  {
    id: 26,
    slug: "jamin-mojani-sampurna-margadarshak",
    title: "जमीन मोजणी: संपूर्ण कायदेशीर मार्गदर्शक",
    shortDescription:
      "जमीन मोजणीची संपूर्ण प्रक्रिया, संबंधित अधिकार, हरकत आणि अपील याबाबत स्पष्ट कायदेशीर मार्गदर्शन.",
    description:
      "हे पुस्तक जमीन मोजणी प्रक्रियेबद्दल सविस्तर आणि कायदेशीर दृष्टिकोनातून मार्गदर्शन करणारे आहे. जमीन मोजणी ही जमिनीची अचूक हद्द निश्चित करण्यासाठी अत्यंत महत्त्वाची प्रक्रिया आहे. या पुस्तकात मोजणीची संपूर्ण माहिती, प्रक्रिया, संबंधित अधिकार, हरकत आणि अपील याबाबत स्पष्ट मार्गदर्शन दिलेले आहे.\nशेतकरी आणि जमीनधारकांना हद्दविवाद टाळण्यासाठी, खरेदी-विक्री सुलभ करण्यासाठी आणि कायदेशीर संरक्षण मिळवण्यासाठी हे पुस्तक उपयुक्त ठरते.",
    mrp: 198,
    price: 99,
    pages: 178,
    language: "Marathi",
    isCombo: false,
    rating: 4.8,
    cover: cover(5),
    featured: true,
  },
  {
    // Sold as a single ebook on the live site (not listed under combos).
    id: 19,
    slug: "atrocity-kayada-combo",
    title: "अ‍ॅट्रोसिटी कायदा: हक्क आणि संरक्षणाचे संपूर्ण ज्ञान (2 Book Set)",
    shortDescription:
      "अनुसूचित जाती/जमाती (अत्याचार प्रतिबंध) अधिनियम, १९८९ — तरतुदी, हक्क आणि प्रक्रिया. 2 Book Set.",
    description:
      "अ‍ॅट्रोसिटी कायदा: हक्क आणि संरक्षणाचे संपूर्ण ज्ञान (2 पुस्तक संच)\nहा दोन पुस्तकांचा संच अनुसूचित जाती आणि अनुसूचित जमाती (अत्याचारांना प्रतिबंध) अधिनियम, १९८९, ज्याला सामान्यतः अ‍ॅट्रोसिटी कायदा म्हणून ओळखले जाते, यावर सर्वसमावेशक मार्गदर्शन प्रदान करतो. हा कायदा समाजातील दुर्बळ घटकांना न्याय आणि संरक्षण देण्यासाठी तयार करण्यात आला आहे.\nया सखोल अभ्यासामध्ये, तुम्हाला कायद्याची ऐतिहासिक पार्श्वभूमी, प्रमुख तरतुदी, पीडितांचे हक्क आणि कायदेशीर प्रक्रियांची संपूर्ण माहिती मिळेल. तसेच, कायद्याच्या कलमवार विश्लेषणासह, तुम्ही महत्त्वाचे खटले आणि न्यायनिवाड्यांचा अभ्यास कराल, जे कायद्याच्या अंमलबजावणीचे पैलू स्पष्ट करतात.\nहा संच वकील, कायदेशीर अभ्यासक, सामाजिक कार्यकर्ते आणि या कायद्याबद्दल सखोल ज्ञान मिळवू इच्छिणाऱ्या सामान्य नागरिकांसाठी अत्यंत उपयुक्त आहे. तुमच्या हक्कांबद्दल जागरूक व्हा आणि योग्य संरक्षणाची खात्री करा.",
    mrp: 198,
    price: 99,
    pages: 48,
    language: "Marathi",
    isCombo: false,
    rating: 4.8,
    cover: cover(2),
  },
];

// --------------------------------- Combos ----------------------------------

export const combos: Product[] = [
  {
    id: 25,
    slug: "patsanstha-fasavnuk-combo",
    title: "पतसंस्थेतील फसवणूक टाळण्यासाठी – एकदा तरी वाचाच!!! (कॉम्बो पुस्तक ऑफर)",
    shortDescription:
      "महाराष्ट्र ठेवीदार संरक्षण अधिनियम, १९९९ + पतसंस्था: सुरक्षित गुंतवणूक — दोन पुस्तकांचा संच.",
    description:
      "या कॉम्बोमध्ये ‘महाराष्ट्र ठेवीदार संरक्षण अधिनियम, १९९९ – सोप्या भाषेत’ आणि ‘पतसंस्था: सुरक्षित गुंतवणूक आणि कायदेशीर संरक्षण’ ही दोन पुस्तके समाविष्ट आहेत. गुंतवणूक करताना घ्यायची काळजी, फसवणुकीचे प्रकार, कायदेशीर उपाययोजना, MPID कायदा, तक्रार प्रक्रिया आणि अर्ज नमुने यांची सविस्तर माहिती.",
    mrp: 198,
    price: 99,
    pages: 111,
    language: "Marathi",
    isCombo: true,
    setSize: 2,
    rating: 4.8,
    cover: cover(0),
    featured: true,
  },
  {
    id: 16,
    slug: "rti-brahmastra-3in1",
    title: "RTI ब्रह्मास्त्र: अन्यायाविरुद्ध लढण्याचे संपूर्ण किट (३-इन-१)",
    shortDescription:
      "माहिती अधिकार अधिनियम, २००५ + माहिती कशी मिळवावी + तयार अर्ज नमुने. ३-इन-१ किट.",
    description:
      "सरकारी कामात अडचण आहे? ‘RTI ब्रह्मास्त्र’ या एकाच कॉम्बोमध्ये मिळवा — १) माहिती अधिकार अधिनियम, २००५ (सोप्या भाषेत), २) शासकीय व सहकारी संस्थांकडून माहिती कशी मिळवावी याचे मार्गदर्शन, आणि ३) तयार अर्जांचे नमुने व अपील प्रक्रिया.",
    mrp: 198,
    price: 99,
    pages: 177,
    language: "Marathi",
    isCombo: true,
    setSize: 3,
    rating: 4.8,
    cover: cover(3),
    featured: true,
  },
  {
    id: 12,
    slug: "ghar-ghenyaadhi-he-vachach",
    title: "घर घेण्याआधी हे वाचाच! – रिसेल, म्हाडा आणि गुंठेवारी फ्लॅट खरेदी (3 Book Set)",
    shortDescription:
      "RERA कायदा, MHADA/Resale नियम आणि Plot Buying चे कायदेशीर secrets. 3-in-1 Legal Combo.",
    description:
      "घर, फ्लॅट किंवा प्लॉट खरेदी करताना फसवणूक टाळा आणि 100% सुरक्षित निर्णय घ्या. हा 3-in-1 Legal Combo तुम्हाला RERA कायदा, MHADA/Resale नियम आणि Plot Buying चे सर्व कायदेशीर secrets सोप्या भाषेत शिकवतो. एकच Combo = Complete Property Protection Guide.",
    mrp: 198,
    price: 99,
    pages: 205,
    language: "Marathi",
    isCombo: true,
    setSize: 3,
    rating: 4.8,
    cover: cover(4),
  },
  {
    id: 8,
    slug: "vivah-te-ghatasphot-margdarshika",
    title: "विवाह ते घटस्फोट: हक्कांची पूर्ण मार्गदर्शिका (3 Book Set)",
    shortDescription:
      "विवाह नोंदणी, मालमत्ता हक्क, पोटगी, मुलांचा ताबा आणि घटस्फोट प्रक्रिया. 3 Book Set.",
    description:
      "भारतीय कायद्यानुसार विवाह आणि घटस्फोटांशी संबंधित सर्व कायदेशीर बाबी, हक्क आणि जबाबदाऱ्यांची सखोल माहिती देणारा तीन पुस्तकांचा संच. विवाह नोंदणी, मालमत्तेचे हक्क, पोटगी, मुलांचा ताबा आणि घटस्फोटाच्या कायदेशीर प्रक्रियेबद्दल स्पष्ट मार्गदर्शन, महत्त्वाचे न्यायालयीन निर्णय व व्यावहारिक सल्ल्यांसह.",
    mrp: 198,
    price: 99,
    pages: 189,
    language: "Marathi",
    isCombo: true,
    setSize: 3,
    rating: 4.8,
    cover: cover(5),
  },
  {
    id: 4,
    slug: "malmatta-vatap-kayadeshir-hakka",
    title: "मालमत्ता, वाटप व कायदेशीर हक्क – कम्प्लीट कॉम्बो गाईड (3 Books Set)",
    shortDescription:
      "खरेदी-विक्री, वारसा हक्क, भाडे करार, लीज नियम आणि मालमत्ता कर यांचे संपूर्ण मार्गदर्शन. 3 Books Set.",
    description:
      "मालमत्ता, वाटप व कायदेशीर हक्क – कम्प्लीट कॉम्बो गाईड हा 3 पुस्तकांचा संच मालमत्तेच्या प्रत्येक पैलूची सखोल माहिती देतो. खरेदी-विक्री, वारसा हक्क, भाडे करार, लीजचे नियम आणि मालमत्ता करासारख्या विषयांवर सोप्या भाषेत मार्गदर्शन. नवीन मालमत्ता घेताना किंवा वडिलोपार्जित मालमत्तेचे वाटप करताना अचूक माहिती व योग्य सल्ला.",
    mrp: 198,
    price: 99,
    pages: 149,
    language: "Marathi",
    isCombo: true,
    setSize: 3,
    rating: 4.8,
    cover: cover(0),
  },
];

// ------------------------------ Testimonials -------------------------------

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "राजेश पाटील",
    role: "छोटा व्यावसायिक",
    quote:
      "हे कायदेशीर मार्गदर्शक खूपच उपयुक्त आहेत. मला माझ्या व्यवसायाची नोंदणी करताना खूप मदत झाली. सोप्या भाषेतील माहितीमुळे सर्व काही समजणे सोपे झाले.",
  },
  {
    name: "स्मिता देशपांडे",
    role: "गृहिणी",
    quote:
      "कायद्याची माहिती इतक्या सोप्या मराठी भाषेत मिळणे अवघड आहे. 'कायद्याचं आणि फायद्याचं' मुळे माझे काम खूप सोपे झाले. मी सर्वांना नक्कीच शिफारस करेन.",
  },
  {
    name: "अमित कुमार",
    role: "विद्यार्थी",
    quote:
      "विद्यार्थी म्हणून मला कायदेशीर अभ्यासासाठी या ई-बुक्सचा खूप फायदा झाला. किंमत पण खूप वाजवी आहे आणि माहिती अगदी अचूक आहे.",
  },
  {
    name: "प्रकाश जाधव",
    role: "शेतकरी",
    quote:
      "जमीन खरेदी करताना काय काळजी घ्यावी हे मला या पुस्तकामुळे समजले. आता मी फसवणूक टाळू शकतो. अतिशय उपयुक्त माहिती.",
  },
  {
    name: "नेहा कुलकर्णी",
    role: "आय.टी. प्रोफेशनल",
    quote:
      "सायबर गुन्ह्यांबद्दलची माहिती खूप महत्वाची आहे. आजकालच्या डिजिटल युगात प्रत्येकाने हे वाचले पाहिजे.",
  },
  {
    name: "संजय मोरे",
    role: "खाजगी कर्मचारी",
    quote:
      "घटस्फोट आणि पोटगी कायद्याबद्दलचे माझे अनेक गैरसमज दूर झाले. खूप छान उपक्रम आहे, नक्कीच वाचावे.",
  },
  {
    name: "वंदना साळुंखे",
    role: "शिक्षक",
    quote:
      "ग्राहक म्हणून माझे हक्क काय आहेत हे मला आता पक्के माहित आहे. यामुळे माझा आत्मविश्वास वाढला आहे. धन्यवाद!",
  },
];

// --------------------------- Site-wide constants ---------------------------

export const SITE = {
  name: "कायद्याचं आणि फायद्याचं",
  brandShort: "Kaydyacha",
  supportPhone: "+91 7218680695",
  contactPhone: "+91 83780 89292",
  whatsapp: "+91 83780 89292",
  email: "support@kaydyachaanifaydyach.com",
  address: "Floor No. 3, Amit Court Building, Civil Court, Shivaji Nagar, पुणे, महाराष्ट्र 411004",
  proprietor: "Shrutika Gochade",
  udyam: "UDYAM-MH-26-1024122",
  instagram: "https://instagram.com",
  stats: { readers: "1000+", rating: "4.8/5", trust: "10,000+" },
  popularTags: ["वारसा हक्क", "शेतकरी कायदा", "घर खरेदी"],
} as const;
