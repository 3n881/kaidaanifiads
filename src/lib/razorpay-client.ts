// Browser only: loads Razorpay's checkout script once (same script the e-book Buy popup uses).
export type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string; reason?: string } }) => void) => void;
};
export type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function openRazorpay(options: Record<string, unknown>): RazorpayCheckout | null {
  const Ctor = (window as unknown as { Razorpay?: new (o: Record<string, unknown>) => RazorpayCheckout }).Razorpay;
  if (!Ctor) return null;
  const checkout = new Ctor(options);
  checkout.open();
  return checkout;
}
