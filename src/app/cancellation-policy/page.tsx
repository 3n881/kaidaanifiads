import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Cancellation Policy" };

export default function Page() {
  return (
    <PolicyPage
      title="Cancellation Policy (रद्द करण्याचे धोरण)"
      intro="This policy explains when an order can be cancelled."
      sections={[
        {
          heading: "1. Instant Delivery",
          body: [
            "Our ebooks are delivered instantly after successful payment. Because delivery is immediate and digital, orders cannot be cancelled once the download link has been sent.",
          ],
        },
        {
          heading: "2. Failed or Pending Payments",
          body: [
            "If a payment fails or remains pending, no order is created and no amount is captured. Any amount debited for a failed transaction is automatically reversed by your bank/gateway, typically within 5–7 business days.",
          ],
        },
        {
          heading: "3. Need Help?",
          body: [
            "For any cancellation query, contact our support team on WhatsApp or email with your transaction details.",
          ],
        },
      ]}
    />
  );
}
