import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <PolicyPage
      title={{ mr: "गोपनीयता धोरण (Privacy Policy)", hi: "गोपनीयता नीति (Privacy Policy)", en: "Privacy Policy" }}
      intro="We respect your privacy. This policy explains what information we collect when you purchase our digital ebooks and how we use it."
      sections={[
        {
          heading: "1. Information We Collect",
          body: [
            "You can purchase without creating an account or providing a name or mobile number. If you voluntarily add a name and WhatsApp number after payment, we store them only to send the download link, provide My Books access, and support your order. Payment is processed by Razorpay; we do not store your card, UPI or bank details.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          body: [
            "The mobile number entered during payment is used solely to deliver the purchased ebook on WhatsApp, to send one reminder if a payment does not complete, to provide purchase recovery through My Books, and to offer order support. We send only order-related messages unless you separately consent to marketing.",
            "Offers and new books on WhatsApp: if you close the payment window without paying, we may offer to send you offers and news about new books on WhatsApp. We do this only if you enter your number and tick the consent box. We store your number, the book you were viewing, your language and the time and wording of your consent. We send at most a few messages a month. Reply STOP on WhatsApp, or contact us, to stop them at any time; we then stop messaging you and keep only a record that you opted out.",
          ],
        },
        {
          heading: "3. Sharing of Information",
          body: [
            "We do not sell or rent your personal information. We share it only with service providers that help us operate — such as the payment gateway (Razorpay) and the WhatsApp delivery provider (Interakt) — strictly to fulfil your order, and with Meta for measuring our posts and ads (see section 4).",
          ],
        },
        {
          heading: "4. Cookies and Ad Measurement (Meta Pixel)",
          body: [
            "We use the Meta (Facebook/Instagram) Pixel to measure how our Instagram and Facebook posts and ads perform. It uses cookies and tells Meta which of our pages you open, which book you view, when you start a payment and when a purchase completes (book, price and an order number). The Pixel does not run on the order page, My Books or our admin pages. When a purchase completes, our server also reports it to Meta (Conversions API) so it is counted even if your browser blocks the Pixel: the book, price and order number, your mobile number and e-mail only in scrambled (hashed) form, and Meta's cookie IDs, your browser type and IP address from when you pressed Buy — we delete the browser type and IP address right after sending. We never send Meta your name, your payment details or your private download link. Meta processes this information under its own privacy policy. You can limit this through your browser (clear or block cookies) or your Facebook/Instagram ad settings.",
          ],
        },
        {
          heading: "5. Data Security",
          body: [
            "We take reasonable technical and organisational measures to protect your information. No method of transmission over the Internet is 100% secure.",
          ],
        },
        {
          heading: "6. Your Rights",
          body: [
            "You may request access to, correction of, or deletion of your personal data at any time by contacting us (see our Data Deletion policy).",
          ],
        },
      ]}
    />
  );
}
