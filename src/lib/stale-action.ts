// Browser helpers for "Server Action … was not found on the server": the page
// was loaded from an older deploy and the new one gave its actions new ids.
// Next.js advice: treat it as "refresh", not as a failure.
import { unstable_isUnrecognizedActionError } from "next/navigation";
import type { Locale } from "./i18n";

export function isStaleAction(error: unknown): boolean {
  return unstable_isUnrecognizedActionError(error);
}

export const NEW_VERSION_TEXT: Record<Locale, string> = {
  mr: "वेबसाइट नुकतीच अपडेट झाली. कृपया पान रिफ्रेश करून पुन्हा प्रयत्न करा.",
  hi: "वेबसाइट अभी अपडेट हुई है। कृपया पेज रिफ्रेश करके फिर से कोशिश करें।",
  en: "The website was just updated. Please refresh the page and try again.",
};

/** Reloads the page to get the new version — at most once per 30 s (no loops). */
export function reloadForNewVersion(): boolean {
  try {
    const key = "kaf-new-version-reload";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // storage blocked: still reload once
  }
  window.location.reload();
  return true;
}
