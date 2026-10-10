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
import { getAllProducts } from "@/lib/products";
import type { SearchItem } from "@/data/catalog";
import { SITE_URL } from "@/lib/supabase/config";

// Fonts are stored in the repo (Google Fonts files) so builds never download
// them — Turbopack's Google-font fetch broke a production build (go-live problem 18).
const lato = localFont({
  variable: "--font-lato",
  src: [
    { path: "./fonts/Lato-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Lato-700-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Lato-900-latin.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
});

// One variable font file (devanagari subset) covers weights 400–700.
const devanagari = localFont({
  variable: "--font-devanagari",
  src: "./fonts/NotoSansDevanagari-devanagari.woff2",
  weight: "400 700",
  display: "swap",
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
      className={`${lato.variable} ${devanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-brand-900 pb-14 md:pb-0">
        <LanguageProvider>
          <a href="#main" className="skip-link font-deva">
            मुख्य मजकुरावर जा / Skip to content
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
        </LanguageProvider>
      </body>
    </html>
  );
}
