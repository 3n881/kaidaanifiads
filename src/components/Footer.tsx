import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Camera } from "lucide-react";
import { SITE } from "@/data/catalog";

const QUICK = [
  { href: "/", label: "मुख्यपृष्ठ" },
  { href: "/ebooks", label: "ई-बुक्स" },
  { href: "/about", label: "आमच्याबद्दल (About)" },
  { href: "/contact", label: "संपर्क (Contact)" },
  { href: "/dashboard", label: "Admin Login" },
];

const SHOP = [
  { href: "/ebooks", label: "All Ebooks (सर्व ई-बुक्स)" },
  { href: "/combos", label: "Combo Packs (कॉम्बो)" },
  { href: "/ebooks?lang=Hindi", label: "हिंदी ई-बुक्स" },
  { href: "/ebooks?lang=English", label: "English Ebooks" },
  { href: "/sitemap.xml", label: "Sitemap (साइटमॅप)" },
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

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-100 bg-brand-900 text-brand-100">
      <div className="container-x grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="inline-flex rounded-xl bg-white/95 px-3 py-2">
            <Image
              src="/brand/logo.png"
              alt="कायद्याचं आणि फायद्याचं"
              width={253}
              height={44}
              className="h-11 w-auto object-contain"
            />
          </div>
          <p className="font-deva mt-3 text-sm leading-relaxed text-brand-200">
            कायद्याचे ज्ञान, सामाजिक भान. आम्ही तुमच्या हक्कासाठी नेहमीच तत्पर.
          </p>
          <a
            href={SITE.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <Camera className="h-4 w-4" /> Follow on Instagram
          </a>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-deva text-sm font-bold text-white">
            महत्वाचे दुवे (Quick Links)
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-deva text-brand-200 transition hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Shop */}
        <div>
          <h4 className="font-deva text-sm font-bold text-white">खरेदी (Shop)</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {SHOP.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-deva text-brand-200 transition hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-deva text-sm font-bold text-white">
            संपर्क (Contact Us)
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-300" />
              <a href={`mailto:${SITE.email}`} className="break-all hover:text-white">
                {SITE.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-300" />
              <span>{SITE.contactPhone}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-300" />
              <span className="font-deva">{SITE.address}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Legal row */}
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>© 2026 Kaydyacha Ani Faydyach. All rights reserved.</p>
            <p className="mt-1">
              Proprietor: {SITE.proprietor} | Udyam: {SITE.udyam}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-black/20">
        <div className="container-x space-y-2 py-5 text-[11px] leading-relaxed text-brand-300">
          <p>
            <b className="text-brand-200">DISCLAIMER:</b> The information provided
            on this website and in our digital products is for educational and
            informational purposes only. It does not constitute legal advice or
            professional legal services. No attorney-client relationship is created
            by your use of this site. Please consult with a qualified advocate for
            advice on your specific legal issues.
          </p>
          <p className="font-deva">
            <b className="text-brand-200">अस्वीकरण:</b> या वेबसाइटवर आणि आमच्या
            डिजिटल उत्पादनांमध्ये दिलेली माहिती केवळ शैक्षणिक आणि माहितीच्या
            उद्देशाने आहे. हा कायदेशीर सल्ला किंवा व्यावसायिक कायदेशीर सेवा नाही.
            विशिष्ट कायदेशीर समस्येसाठी पात्र वकिलाचा सल्ला घ्या.
          </p>
        </div>
      </div>
    </footer>
  );
}
