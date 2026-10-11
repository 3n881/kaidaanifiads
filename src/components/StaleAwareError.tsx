"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { isStaleAction, reloadForNewVersion } from "@/lib/stale-action";

/**
 * Shared body of app/error.tsx and app/dashboard/error.tsx. A button or form
 * on a page loaded before a deploy reloads the page by itself; anything else
 * shows a short message with Try again / Reload.
 */
export default function StaleAwareError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const stale = isStaleAction(error);
  useEffect(() => {
    if (stale) reloadForNewVersion();
    else console.error(error);
  }, [stale, error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <RefreshCw className="mx-auto h-10 w-10 text-brand-teal" aria-hidden="true" />
      <h1 className="font-deva mt-3 text-lg font-extrabold text-brand-900">
        {stale ? "वेबसाइट अपडेट झाली / Website updated" : "काहीतरी चुकले / Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-brand-600">
        {stale ? "Reloading the page… please do the last step again." : "Please try again. If it keeps happening, reload the page."}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        {!stale && (
          <button type="button" onClick={() => retry()} className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700">Try again</button>
        )}
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-bold text-white">Reload page</button>
      </div>
    </div>
  );
}
