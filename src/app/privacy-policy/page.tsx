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
          ],
        },
        {
          heading: "3. Sharing of Information",
          body: [
            "We do not sell or rent your personal information. We share it only with service providers that help us operate — such as the payment gateway (Razorpay) and the WhatsApp delivery provider (Interakt) — strictly to fulfil your order.",
          ],
        },
        {
          heading: "4. Data Security",
          body: [
            "We take reasonable technical and organisational measures to protect your information. No method of transmission over the Internet is 100% secure.",
          ],
        },
        {
          heading: "5. Your Rights",
          body: [
            "You may request access to, correction of, or deletion of your personal data at any time by contacting us (see our Data Deletion policy).",
          ],
        },
      ]}
    />
  );
}
