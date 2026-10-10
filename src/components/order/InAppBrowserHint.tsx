"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";
import { ORDER_EXTRA } from "@/lib/order-copy";

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat/i;

function subscribe() {
  return () => {};
}

/**
 * Instagram/Facebook in-app browsers often can't save files. Tell the buyer
 * how to open this page in their real browser (the link keeps working there).
 */
export default function InAppBrowserHint({ locale = "mr" }: { locale?: Locale }) {
  const inApp = useSyncExternalStore(
    subscribe,
    () => IN_APP.test(navigator.userAgent),
    () => false,
  );
  if (!inApp) return null;
  return (
    <p className="font-deva rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
      {ORDER_EXTRA[locale].inApp}
    </p>
  );
}
