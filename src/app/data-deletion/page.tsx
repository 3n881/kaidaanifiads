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
            "Every payment creates a transaction record. We store a name and WhatsApp number only when you choose to provide them after payment for WhatsApp delivery, My Books access, or support.",
          ],
        },
        {
          heading: "2. How to Request Deletion",
          body: [
            "Email us at support@kaydyachaanifaydyach.com with your payment reference, or message us from the WhatsApp number you provided, using the subject ‘Data Deletion Request’. We will verify the request and delete eligible personal data within 30 days.",
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
