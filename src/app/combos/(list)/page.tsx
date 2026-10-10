import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";
import ListBanner from "@/components/ListBanner";
import CombosNotice from "@/components/CombosNotice";
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
    <div className="min-h-screen bg-white">
      <ListBanner
        title={
          <>
            Special <span className="text-brand-gold">Combo Packages</span>
          </>
        }
      />
      <Suspense fallback={<div className="py-16 text-center text-brand-400">लोड होत आहे…</div>}>
        <Catalog products={combos} notice={<CombosNotice key="combos-notice" />} />
      </Suspense>
    </div>
  );
}
