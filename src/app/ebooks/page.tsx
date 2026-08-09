import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { getEbooks } from "@/lib/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "सर्व ई-बुक्स",
  description:
    "मराठी व हिंदी कायदेशीर ई-बुक्स — वारसा हक्क, जमीन कायदा, RTI, ग्राहक हक्क आणि अधिक.",
};

export default async function EbooksPage() {
  const ebooks = await getEbooks();
  return (
    <div className="container-x py-10">
      <header className="mb-6">
        <h1 className="font-deva text-2xl font-extrabold text-brand-teal md:text-4xl">
          Legal Knowledge Simplified /{" "}
          <span className="text-brand-600">ज्ञान हीच शक्ती</span>
        </h1>
        <p className="mt-2 text-sm text-brand-500 md:text-base">
          Digital PDF Ebooks · Instant Delivery · Inclusive of all taxes
        </p>
      </header>
      <DisclaimerBanner className="mb-8 max-w-2xl" />
      <Suspense fallback={<div className="py-16 text-center text-brand-400">लोड होत आहे…</div>}>
        <Catalog products={ebooks} />
      </Suspense>
    </div>
  );
}
