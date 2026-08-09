import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Data Deletion" };

export default function Page() {
  return (
    <PolicyPage
      title="Data Deletion Policy (माहिती हटवण्याचे धोरण)"
      intro="You have the right to request deletion of the personal data we hold about you."
      sections={[
        {
          heading: "1. What Data We Hold",
          body: [
            "We store your name, WhatsApp number and order history so we can deliver your ebooks and provide support.",
          ],
        },
        {
          heading: "2. How to Request Deletion",
          body: [
            "Email us at support@kaydyachaanifaydyach.com or message us on WhatsApp from your registered number with the subject ‘Data Deletion Request’. We will verify your identity and delete your personal data within 30 days.",
          ],
        },
        {
          heading: "3. What Happens After Deletion",
          body: [
            "Once deleted, you will lose access to your past purchases on the ‘My Books’ page. We may retain minimal transaction records where required by law (e.g. for tax/accounting).",
          ],
        },
      ]}
    />
  );
}
