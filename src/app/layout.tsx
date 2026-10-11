import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import BottomNav from "@/components/BottomNav";
import BackToTop from "@/components/BackToTop";
import AdminChromeGate from "@/components/AdminChromeGate";
import MetaPixel from "@/components/MetaPixel";
import LanguageProvider from "@/components/LanguageProvider";
import LanguagePicker from "@/components/LanguagePicker";
import { Tr } from "@/components/LanguageProvider";
import { getAllProducts } from "@/lib/products";
import type { SearchItem } from "@/data/catalog";
import { SITE_URL } from "@/lib/supabase/config";

// The font is stored in the repo (from Google Fonts) so builds never download
// it — Turbopack's Google-font fetch broke a production build (go-live problem 18).
// English text uses Geist, as on the original site (one variable file, 400–900).
// Marathi/Hindi use the phone's own Devanagari font, also as on the original
// (Android's is Noto Sans Devanagari) — see --font-sans in globals.css.
//
// Speed (PageSpeed 2026-10-11): Geist is NOT preloaded — Chrome holds the first
// paint until preloaded fonts arrive. It declares the characters it covers
// (unicode-range = Google Fonts' latin subset) so the browser never tries it, or
// its Arial stand-in, for Marathi/Hindi letters. Measured on a throttled
// mid-range phone: first paint 5.9 s → ~1.4 s.
const geist = localFont({
  variable: "--font-geist",
  src: "./fonts/Geist-latin.woff2",
  weight: "400 900",
  display: "swap",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "कायद्याचं आणि फायद्याचं | सोप्या भाषेत कायदे",
    template: "%s | कायद्याचं आणि फायद्याचं",
  },
  description:
    "शेतकरी, सामान्य नागरिक आणि महिलांसाठी जमीन, वारसा हक्क आणि कायद्याची विश्वासार्ह माहिती सोप्या मराठी भाषेत. Digital PDF Ebooks.",
  keywords: [
    "मराठी कायदे पुस्तके",
    "वारसा हक्क",
    "जमीन कायदा",
    "RTI मराठी",
    "legal ebooks Marathi",
  ],
  openGraph: {
    title: "कायद्याचं आणि फायद्याचं",
    description: "सोप्या भाषेत कायदे - तुमच्या हक्कांसाठी",
    type: "website",
    locale: "mr_IN",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only what the search box needs — full descriptions would add ~100 KB to
  // every page's HTML.
  let searchItems: SearchItem[] = [];
  try {
    searchItems = (await getAllProducts()).map(
      ({ id, slug, title, price, pages, language, isCombo, localized, availableLocales }) => ({
        id, slug, title, price, pages, language, isCombo, localized, availableLocales,
      }),
    );
  } catch {
    searchItems = [];
  }
  return (
    <html
      lang="mr"
      className={`${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-brand-900 pb-14 md:pb-0">
        <LanguageProvider>
          <a href="#main" className="skip-link font-deva">
            <Tr mr="मुख्य मजकुरावर जा / Skip to content" hi="मुख्य सामग्री पर जाएं / Skip to content" en="Skip to content" />
          </a>
          <AdminChromeGate>
            <MetaPixel />
            <Navbar products={searchItems} />
          </AdminChromeGate>
          <main id="main" className="flex-1">
            {children}
          </main>
          <AdminChromeGate>
            <Footer />
            <WhatsAppFab />
            <BackToTop />
            <BottomNav />
          </AdminChromeGate>
          <LanguagePicker />
        </LanguageProvider>
      </body>
    </html>
  );
}
