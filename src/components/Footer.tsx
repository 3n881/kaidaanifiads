import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { SITE } from "@/data/catalog";
import { Tr, type Localized } from "@/components/LanguageProvider";

type FooterLink = { href: string; label: Localized };

const QUICK: FooterLink[] = [
  { href: "/", label: { mr: "मुख्यपृष्ठ", hi: "होम", en: "Home" } },
  { href: "/ebooks", label: { mr: "ई-बुक्स", hi: "ई-बुक्स", en: "E-books" } },
  { href: "/about", label: { mr: "आमच्याबद्दल (About)", hi: "हमारे बारे में (About)", en: "About us" } },
  { href: "/contact", label: { mr: "संपर्क (Contact)", hi: "संपर्क (Contact)", en: "Contact" } },
  { href: "/dashboard", label: { mr: "Admin Login", hi: "Admin Login", en: "Admin Login" } },
];

const SHOP: FooterLink[] = [
  { href: "/ebooks", label: { mr: "All Ebooks (सर्व ई-बुक्स)", hi: "All Ebooks (सभी ई-बुक्स)", en: "All ebooks" } },
  { href: "/combos", label: { mr: "Combo Packs (कॉम्बो)", hi: "Combo Packs (कॉम्बो)", en: "Combo packs" } },
  { href: "/ebooks?lang=Hindi", label: { mr: "हिंदी ई-बुक्स", hi: "हिंदी ई-बुक्स", en: "Hindi ebooks" } },
  { href: "/ebooks?lang=English", label: { mr: "English Ebooks", hi: "English Ebooks", en: "English ebooks" } },
  { href: "/site-index", label: { mr: "Sitemap (साइटमॅप)", hi: "Sitemap (साइटमैप)", en: "Sitemap" } },
];

const LEGAL = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/data-deletion", label: "Data Deletion" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/cancellation-policy", label: "Cancellation" },
  { href: "/shipping-policy", label: "Delivery" },
];

const digits = (phone: string) => phone.replace(/\D/g, "");

const CONTACT = [
  { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: Phone, label: "Phone", value: SITE.contactPhone, href: `tel:+${digits(SITE.contactPhone)}` },
  { icon: MessageCircle, label: "WhatsApp", value: SITE.whatsapp, href: `https://wa.me/${digits(SITE.whatsapp)}` },
  { icon: MapPin, label: "Location", value: SITE.address },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function LinkColumn({ title, links }: { title: Localized; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="font-deva mb-8 text-lg font-bold text-brand-gold">
        <Tr {...title} />
      </h3>
      <ul className="space-y-4">
        {links.map((l) => (
          <li key={l.href + l.label.en}>
            <Link
              href={l.href}
              className="font-deva group flex items-center gap-2 opacity-80 transition-colors hover:text-brand-gold hover:opacity-100"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gold/50 transition-colors group-hover:bg-brand-gold" />
              <Tr {...l.label} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Site footer — layout and styling follow the original site. */
export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-teal pb-24 pt-20 text-white md:pb-10">
      {/* soft gold glows */}
      <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-brand-gold/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-brand-gold/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-16 grid gap-12 border-b border-white/10 pb-16 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="space-y-6 md:col-span-2">
            <Link href="/" className="group flex items-center gap-3">
              <Image
                src="/brand/logo.png"
                alt="कायद्याचं आणि फायद्याचं"
                width={276}
                height={48}
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <h3 className="font-deva bg-gradient-to-r from-white to-gray-300 bg-clip-text text-3xl font-bold text-transparent">
              कायद्याचं आणि फायद्याचं
            </h3>
            <p className="font-deva max-w-sm text-lg font-light leading-relaxed opacity-80">
              <Tr mr="कायद्याचे ज्ञान, सामाजिक भान." hi="कानून का ज्ञान, सामाजिक जागरूकता।" en="Legal knowledge, social awareness." />
              <br />
              <Tr mr="आम्ही तुमच्या हक्कासाठी नेहमीच तत्पर." hi="हम आपके अधिकारों के लिए हमेशा तत्पर।" en="Always here for your rights." />
            </p>
            <div className="pt-6">
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-6 py-2.5 font-bold text-white shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl"
              >
                <InstagramIcon className="h-5 w-5" />
                <span>Follow on Instagram</span>
              </a>
            </div>
          </div>

          <LinkColumn title={{ mr: "महत्वाचे दुवे (Quick Links)", hi: "महत्वपूर्ण लिंक (Quick Links)", en: "Quick links" }} links={QUICK} />
          <LinkColumn title={{ mr: "खरेदी (Shop)", hi: "खरीदारी (Shop)", en: "Shop" }} links={SHOP} />

          {/* Contact */}
          <div>
            <h3 className="font-deva mb-8 text-lg font-bold text-brand-gold">
              <Tr mr="संपर्क (Contact Us)" hi="संपर्क (Contact Us)" en="Contact us" />
            </h3>
            <ul className="space-y-5">
              {CONTACT.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="group flex items-start gap-4 opacity-90 transition-colors hover:text-brand-gold">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-brand-gold group-hover:text-brand-teal">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className="break-all hover:underline"
                        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {value}
                      </a>
                    ) : (
                      <span className="font-deva">{value}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright + business details + legal links */}
        <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <p className="text-sm opacity-60">© 2026 Kaydyacha Ani Faydyach. All rights reserved.</p>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm transition-colors hover:border-brand-gold/30">
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-300 md:text-xs">
                Kaydyacha Ani Faydyacha | Proprietor: {SITE.proprietor} | Udyam: {SITE.udyam}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs opacity-60 md:justify-end md:gap-6 md:text-sm">
            {LEGAL.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="transition-colors hover:text-brand-gold">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/5 py-6 text-center">
          <div className="mx-auto max-w-4xl space-y-3 text-[10px] font-medium leading-relaxed text-gray-300 opacity-90 md:text-xs">
            <p>
              <strong>DISCLAIMER:</strong> The information provided on this website and in our
              digital products is for educational and informational purposes only. It does not
              constitute legal advice or professional legal services. No attorney-client
              relationship is created by your use of this site. Please consult with a qualified
              advocate for advice on your specific legal issues.
            </p>
            <p className="font-deva font-light">
              <Tr
                mr="अस्वीकरण: या वेबसाइटवर आणि आमच्या डिजिटल उत्पादनांमध्ये दिलेली माहिती केवळ शैक्षणिक आणि माहितीच्या उद्देशाने आहे. हा कायदेशीर सल्ला किंवा व्यावसायिक कायदेशीर सेवा नाही. विशिष्ट कायदेशीर समस्येसाठी पात्र वकिलाचा सल्ला घ्या."
                hi="अस्वीकरण: इस वेबसाइट और हमारे डिजिटल उत्पादों में दी गई जानकारी केवल शैक्षणिक और जानकारी के उद्देश्य से है। यह कानूनी सलाह या पेशेवर कानूनी सेवा नहीं है। किसी विशेष कानूनी समस्या के लिए योग्य वकील की सलाह लें।"
                en=""
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
