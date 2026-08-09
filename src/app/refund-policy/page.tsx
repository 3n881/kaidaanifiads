import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Refund Policy" };

export default function Page() {
  return (
    <PolicyPage
      title="Refund Policy (परतावा धोरण)"
      intro="Please read this policy carefully before purchasing, as our products are digital."
      sections={[
        {
          heading: "1. Digital Product — No Refund After Download",
          body: [
            "Because our products are digital PDF ebooks that are delivered instantly, once the ebook link has been delivered and/or the PDF has been downloaded, the purchase is non-refundable.",
          ],
        },
        {
          heading: "2. When a Refund May Apply",
          body: [
            "If you were charged but did not receive your ebook link within 24 hours, or you were charged more than once for the same order due to a technical error, you are eligible for a full refund of the affected amount.",
          ],
        },
        {
          heading: "3. How to Request a Refund",
          body: [
            "Contact us on WhatsApp or email with your payment reference and registered WhatsApp number within 7 days of the transaction. Approved refunds are processed to the original payment method within 5–7 business days.",
          ],
        },
      ]}
    />
  );
}
