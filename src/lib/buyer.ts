// CLIENT-SAFE: the buyer details asked in the Buy popup before Razorpay opens
// (name + WhatsApp number, 2026-10-18). The popup and /api/checkout use the
// same rules, so what the buyer sees accepted is what the server accepts.

/** Indian mobile → 10 digits (6–9 first), or "" when it isn't one. Accepts "+91 98765 43210", "098765…", "91…". */
export function cleanIndianMobile(raw: unknown): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

export const NAME_MIN = 2;
export const NAME_MAX = 60;

/** Trimmed name with single spaces, or "" when it has fewer than 2 letters (any script). */
export function cleanBuyerName(raw: unknown): string {
  const name = String(raw ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  const letters = name.match(/\p{L}/gu)?.length ?? 0;
  return letters >= NAME_MIN ? name : "";
}

/** Remembered on this device so the next purchase is pre-filled. */
export const BUYER_STORAGE_KEY = "kaf-buyer";

export function loadSavedBuyer(): { name: string; phone: string } {
  try {
    const saved = JSON.parse(window.localStorage.getItem(BUYER_STORAGE_KEY) || "{}") as { name?: unknown; phone?: unknown };
    return { name: cleanBuyerName(saved.name), phone: cleanIndianMobile(saved.phone) };
  } catch {
    return { name: "", phone: "" };
  }
}

export function saveBuyer(name: string, phone: string) {
  try {
    window.localStorage.setItem(BUYER_STORAGE_KEY, JSON.stringify({ name, phone }));
  } catch {
    // Private browsing: nothing remembered, the popup still works.
  }
}
