import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { getCombos } from "@/lib/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "कॉम्बो पॅक्स",
  description:
    "एकापेक्षा जास्त कायदेशीर पुस्तकांचे संच आकर्षक सवलतीत — संपूर्ण माहिती एकाच ठिकाणी.",
};

export default async function CombosPage() {
  const combos = await getCombos();
  return (
    <div className="container-x py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-teal md:text-4xl">
          <span className="text-brand-600">Special</span> Combo Packages
        </h1>
        <p className="mt-2 text-sm text-brand-500 md:text-base">
          Limited Time Offer: Get huge discounts on all combo packs!
        </p>
      </header>
      <DisclaimerBanner className="mb-8 max-w-2xl" />
      <Suspense fallback={<div className="py-16 text-center text-brand-400">लोड होत आहे…</div>}>
        <Catalog products={combos} />
      </Suspense>
    </div>
  );
}
