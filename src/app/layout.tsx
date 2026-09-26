import type { Metadata } from "next";
import { Lato, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import BottomNav from "@/components/BottomNav";
import BackToTop from "@/components/BackToTop";
import AdminChromeGate from "@/components/AdminChromeGate";
import { getAllProducts } from "@/lib/products";
import type { SearchItem } from "@/data/catalog";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kaydyachaanifaydyach.com"),
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
      ({ id, slug, title, price, pages, language, isCombo }) => ({
        id, slug, title, price, pages, language, isCombo,
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
        <a href="#main" className="skip-link font-deva">
          मुख्य मजकुरावर जा
        </a>
        <AdminChromeGate>
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
      </body>
    </html>
  );
}
