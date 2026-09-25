import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function Page() {
  return (
    <PolicyPage
      title="Terms & Conditions (अटी व शर्ती)"
      intro="By purchasing or using our digital products, you agree to the following terms."
      sections={[
        {
          heading: "1. Digital Products",
          body: [
            "All products sold on this website are digital PDF ebooks. No physical goods are shipped. After successful payment, a download link is displayed immediately. WhatsApp delivery is optional and is available if you provide a number after payment.",
          ],
        },
        {
          heading: "2. Educational Purpose Only",
          body: [
            "The content is provided for educational and informational purposes only. It does not constitute legal advice and does not create an attorney-client relationship. Consult a qualified advocate for advice on your specific situation.",
          ],
        },
        {
          heading: "3. Licence & Usage",
          body: [
            "Your purchase grants you a personal, non-transferable licence to read the ebook. Reselling, redistributing, reproducing or publicly sharing the PDF is strictly prohibited.",
          ],
        },
        {
          heading: "4. Pricing",
          body: [
            "All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes. Discounted offers are for a limited period and may change without notice.",
          ],
        },
        {
          heading: "5. Limitation of Liability",
          body: [
            "We are not liable for any loss or damage arising from reliance on the information in our ebooks. Use of the material is at your own discretion.",
          ],
        },
      ]}
    />
  );
}
