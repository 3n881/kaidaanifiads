import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Delivery Policy" };

export default function Page() {
  return (
    <PolicyPage
      title="Delivery / Shipping Policy (वितरण धोरण)"
      intro="All products on this website are digital. There is no physical shipping."
      sections={[
        {
          heading: "1. Digital Delivery Only",
          body: [
            "We sell digital PDF ebooks. No physical/printed copies are shipped. There are no shipping charges.",
          ],
        },
        {
          heading: "2. How You Receive Your Ebook",
          body: [
            "Immediately after a successful payment, the download link for your ebook is sent to the WhatsApp number you entered at checkout. You can also access it on the ‘माझी पुस्तके (My Books)’ page using your WhatsApp number.",
          ],
        },
        {
          heading: "3. Delivery Time",
          body: [
            "Delivery is instant in most cases. If you do not receive your link within 24 hours, contact our support team and we will resend it promptly.",
          ],
        },
      ]}
    />
  );
}
