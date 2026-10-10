import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import ListBanner from "@/components/ListBanner";
import { Tr } from "@/components/LanguageProvider";
import { getAllProducts } from "@/lib/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "सर्व ई-बुक्स",
  description:
    "मराठी व हिंदी कायदेशीर ई-बुक्स आणि कॉम्बो पॅक्स — वारसा हक्क, जमीन कायदा, RTI, ग्राहक हक्क आणि अधिक.",
};

export default async function EbooksPage() {
  // Every title, combos included (badged "Combo Pack"), as on the previous
  // site; /combos stays a combos-only view.
  const ebooks = await getAllProducts();
  return (
    <div className="min-h-screen bg-white">
      <ListBanner
        title={
          <>
            Legal Knowledge Simplified /{" "}
            <span className="text-brand-gold">
              <Tr mr="ज्ञान हीच शक्ती" hi="ज्ञान ही शक्ति है" en="Knowledge is power" />
            </span>
          </>
        }
        subtitle="Digital PDF Ebooks · Instant Delivery · Inclusive of all taxes"
      />
      <Suspense fallback={<div className="py-16 text-center text-brand-400">लोड होत आहे…</div>}>
        <Catalog products={ebooks} notice={<DisclaimerBanner key="ebooks-notice" className="max-w-2xl" />} />
      </Suspense>
    </div>
  );
}
