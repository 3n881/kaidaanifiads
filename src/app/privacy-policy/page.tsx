import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <PolicyPage
      title="Privacy Policy (गोपनीयता धोरण)"
      intro="We respect your privacy. This policy explains what information we collect when you purchase our digital ebooks and how we use it."
      sections={[
        {
          heading: "1. Information We Collect",
          body: [
            "When you place an order we collect your name and WhatsApp mobile number so we can deliver your PDF ebook. Payment is processed by our payment gateway (Razorpay); we do not store your card, UPI or bank details on our servers.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          body: [
            "Your details are used solely to process your order, deliver the purchased ebook link on WhatsApp, and provide customer support. We may send you order-related messages on the WhatsApp number you provide.",
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
