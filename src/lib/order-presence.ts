/**
 * "Buyer still here" signal while the Razorpay window is open (migration 017).
 * Pings /api/orders/alive right away and every 10 s, but only while the page
 * is on screen: a buyer who switches to GPay / PhonePe goes quiet too — the
 * server then sees the payment open in Razorpay and waits. Closing the tab /
 * app or losing the network also stops it. Returns a stop function.
 */
const EVERY_MS = 10_000;

export function startOrderPresence(orderId: string, token: string): () => void {
  if (typeof window === "undefined") return () => undefined;
  const body = JSON.stringify({ orderId, token });
  const ping = () => {
    if (document.visibilityState !== "visible") return;
    try {
      if (navigator.sendBeacon?.("/api/orders/alive", new Blob([body], { type: "application/json" }))) return;
    } catch {
      // fall through to fetch
    }
    void fetch("/api/orders/alive", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
      () => undefined,
    );
  };
  ping();
  const timer = window.setInterval(ping, EVERY_MS);
  // Back from the UPI app → "here" again at once.
  const onVisible = () => {
    if (document.visibilityState === "visible") ping();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
