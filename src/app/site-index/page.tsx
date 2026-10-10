import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Site Map (साइटमॅप)",
  description: "कायद्याचं आणि फायद्याचं — सर्व पाने आणि ई-बुक्सची यादी.",
};

type Item = { href: string; label: string };

const MAIN: Item[] = [
  { href: "/", label: "Home (मुख्य पृष्ठ)" },
  { href: "/about", label: "About Us (आमच्याबद्दल)" },
  { href: "/contact", label: "Contact (संपर्क)" },
  { href: "/my-books", label: "My Books (माझी पुस्तके)" },
];

const SHOP: Item[] = [
  { href: "/ebooks", label: "All E-books (सर्व ई-बुक्स)" },
  { href: "/combos", label: "Combo Offers (कॉम्बो ऑफर्स)" },
];

const LEGAL: Item[] = [
  { href: "/privacy-policy", label: "Privacy Policy (गोपनीयता धोरण)" },
  { href: "/terms", label: "Terms & Conditions (नियम आणि अटी)" },
  { href: "/refund-policy", label: "Refund Policy (परतावा धोरण)" },
  { href: "/cancellation-policy", label: "Cancellation Policy (रद्दीकरण धोरण)" },
  { href: "/shipping-policy", label: "Delivery Policy (डिलिव्हरी धोरण)" },
  { href: "/data-deletion", label: "Data Deletion (डेटा हटवणे)" },
];

function Section({ title, items, wide = false }: { title: string; items: Item[]; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-brand-100 bg-white p-6 shadow-sm ${wide ? "md:col-span-2" : ""}`}>
      <h2 className="mb-4 border-b border-brand-100 pb-2 text-xl font-semibold text-brand-teal">{title}</h2>
      <ul className={`space-y-3 ${wide ? "md:grid md:grid-cols-2 md:gap-x-8 md:space-y-0 md:gap-y-3" : ""}`}>
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="font-deva group flex items-center text-brand-900 transition-colors hover:text-brand-600"
            >
              <span className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold transition-colors group-hover:bg-brand-teal" />
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Human-readable site map (the XML one for search engines is /sitemap.xml). */
export default async function SiteIndexPage() {
  let books: Item[] = [];
  try {
    books = (await getAllProducts()).map((p) => ({
      href: p.isCombo ? `/combos/${p.slug}` : `/ebooks/${p.slug}`,
      label: `${p.id}. ${p.title}`,
    }));
  } catch {
    books = [];
  }

  return (
    <div className="container-x">
      <div className="mx-auto max-w-4xl py-12">
        <h1 className="mb-8 text-center text-3xl font-bold text-brand-teal">
          Site Map
          <span className="font-deva ml-2 text-lg font-normal text-brand-500">(साइटमॅप)</span>
        </h1>
        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Main" items={MAIN} />
          <Section title="Products" items={SHOP} />
          <Section title="Legal & Support" items={LEGAL} />
          {books.length > 0 && <Section title="E-books (ई-बुक्स)" items={books} wide />}
        </div>
      </div>
    </div>
  );
}
