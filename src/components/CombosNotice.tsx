"use client";

import { Megaphone } from "lucide-react";
import DisclaimerBanner from "./DisclaimerBanner";
import { useT } from "./LanguageProvider";

/** Offer note + disclaimer at the top of /combos (as on the original site). */
export default function CombosNotice() {
  const t = useT();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-brand-gold/20 bg-brand-gold/10 p-3">
        <span className="rounded-lg bg-brand-gold p-1.5 text-brand-teal">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="font-deva text-sm font-bold text-brand-teal">
          {t({
            mr: "मर्यादित वेळेची ऑफर: सर्व कॉम्बो पॅक्सवर मोठी सवलत!",
            hi: "सीमित समय का ऑफर: सभी कॉम्बो पैक्स पर भारी छूट!",
            en: "Limited Time Offer: Get huge discounts on all combo packs!",
          })}
        </p>
      </div>
      <DisclaimerBanner className="max-w-2xl" />
    </div>
  );
}
