"use client";

import { useSyncExternalStore } from "react";
import { FolderDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { DOWNLOAD_WHERE, type Platform } from "@/lib/order-copy";

function subscribe() {
  return () => {};
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support tells them apart.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
  return "other";
}

/**
 * Tells the buyer where the auto-downloaded PDF went on *their* device
 * (Android / iPhone / computer), so nobody thinks the download failed.
 */
export default function DownloadWhere({ locale, fileNames }: { locale: Locale; fileNames: string[] }) {
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => "other" as Platform);
  const c = DOWNLOAD_WHERE[locale];
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left">
      <p className="font-deva flex items-center gap-2 text-sm font-bold text-blue-900">
        <FolderDown className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        {c.title}
      </p>
      <ol className="font-deva mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-blue-900/90">
        {c.steps[platform].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {fileNames.length > 0 && (
        <p className="font-deva mt-2 text-[11px] text-blue-900/80">
          {c.file}:{" "}
          {fileNames.map((name) => (
            <code key={name} className="mr-1 break-all rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-blue-900">
              {name}
            </code>
          ))}
        </p>
      )}
      <p className="font-deva mt-2 text-[11px] text-blue-900/70">{c.open}</p>
    </div>
  );
}
