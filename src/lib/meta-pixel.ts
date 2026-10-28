// Meta (Facebook) Pixel helpers — browser only. IDs come from the build-time
// NEXT_PUBLIC_META_PIXEL_IDS (comma-separated); empty = pixel off.

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const META_PIXEL_IDS = (process.env.NEXT_PUBLIC_META_PIXEL_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => /^\d+$/.test(id));

/**
 * Pages whose URL carries an order access token (or a buyer's saved orders).
 * The pixel never runs there, so the token never reaches Meta.
 */
export function isPrivatePath(pathname: string): boolean {
  return (
    pathname.startsWith("/order") ||
    pathname.startsWith("/my-books") ||
    pathname.startsWith("/dashboard")
  );
}

let scriptRequested = false;

/** Adds fbevents.js once. Events sent before it arrives wait in the stub's queue. */
function loadPixelScript(): void {
  if (scriptRequested) return;
  scriptRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

/**
 * Page speed (28 Oct): fbevents.js + one config per pixel cost ~0.6 s of main
 * thread on a slow phone, right while the book cover was being drawn. So the
 * script is fetched only after the page has loaded and the browser is idle
 * (at most ~3 s later); a Buy tap or a purchase fetches it at once.
 */
function loadPixelScriptWhenIdle(): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  const later = () => {
    if (w.requestIdleCallback) w.requestIdleCallback(loadPixelScript, { timeout: 3000 });
    else window.setTimeout(loadPixelScript, 1500);
  };
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

/** Installs Meta's standard queueing stub and inits IDs; fbevents.js follows when idle. */
export function initMetaPixel(): void {
  if (!META_PIXEL_IDS.length || window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  // We send PageView ourselves on route changes; Meta's own history-API
  // tracking would double count and could report a private URL.
  fbq.disablePushState = true;
  window.fbq = fbq;
  window._fbq = fbq;

  loadPixelScriptWhenIdle();

  for (const id of META_PIXEL_IDS) {
    // No automatic click/form events: only the events listed below.
    fbq("set", "autoConfig", false, id);
    fbq("init", id);
  }
}

let quietAddressChange = false;

/**
 * Shows another product's address without a page load (offer picker on a book
 * page). The next pathname change is then not a new PageView — the picker
 * sends ViewContent for the product shown instead.
 */
export function replaceProductAddress(path: string): void {
  if (window.location.pathname === path) return;
  quietAddressChange = true;
  window.history.replaceState(null, "", path + window.location.search);
}

/** True once after replaceProductAddress (MetaPixel skips that PageView). */
export function takeQuietAddressChange(): boolean {
  const quiet = quietAddressChange;
  quietAddressChange = false;
  return quiet;
}

export function trackPixel(
  event: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase",
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (typeof window === "undefined" || !META_PIXEL_IDS.length) return;
  if (isPrivatePath(window.location.pathname)) return;
  initMetaPixel(); // idempotent; events queue until fbevents.js loads
  // Buying: don't wait for idle (the page may be left for Razorpay / the order page).
  if (event === "InitiateCheckout" || event === "Purchase") loadPixelScript();
  window.fbq?.("track", event, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

/** Standard e-commerce fields for one book. */
export function pixelProduct(product: { id: number; title: string; price: number }) {
  return {
    content_ids: [String(product.id)],
    content_name: product.title,
    content_type: "product",
    value: product.price,
    currency: "INR",
  };
}
