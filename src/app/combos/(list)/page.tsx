import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";
import { Megaphone } from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import ListBanner from "@/components/ListBanner";
import { Tr } from "@/components/LanguageProvider";
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
        <Catalog
          products={combos}
          notice={
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-brand-gold/20 bg-brand-gold/10 p-3">
                <span className="rounded-lg bg-brand-gold p-1.5 text-brand-teal">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-brand-teal">
                  <Tr
                    mr="मर्यादित वेळेची ऑफर: सर्व कॉम्बो पॅक्सवर मोठी सवलत!"
                    hi="सीमित समय का ऑफर: सभी कॉम्बो पैक्स पर भारी छूट!"
                    en="Limited Time Offer: Get huge discounts on all combo packs!"
                  />
                </p>
              </div>
              <DisclaimerBanner className="max-w-2xl" />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
