import type { Metadata } from "next";
import ConsultationBooking from "@/components/ConsultationBooking";
import { getAllProducts } from "@/lib/products";
import { isTopic, topicForBook } from "@/lib/consult-copy";

export const metadata: Metadata = {
  title: "तज्ञ सल्ला · Expert consultation",
  description: "जमीन, वारसा, RTI, विवाह, ग्रामपंचायत अशा विषयांवर फोन / WhatsApp / व्हिडिओ कॉलवर मार्गदर्शन — ₹999.",
};

/**
 * Paid consultation booking (client, 28 Nov). ?book=<id> opens on that book's
 * topic ("you bought X"); ?topic=<key> picks a topic; otherwise the buyer chooses.
 */
export default async function ConsultationPage({ searchParams }: PageProps<"/consultation">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const bookId = Number(one("book")) || null;
  let bookTitle: string | null = null;
  if (bookId) {
    try {
      const book = (await getAllProducts()).find((p) => p.id === bookId);
      bookTitle = book?.title ?? null;
    } catch {
      bookTitle = null;
    }
  }
  const topicParam = one("topic");
  const initialTopic = isTopic(topicParam) ? topicParam : topicForBook(bookTitle ? bookId : null);
  return <ConsultationBooking initialTopic={initialTopic} bookId={bookTitle ? bookId : null} bookTitle={bookTitle} />;
}
