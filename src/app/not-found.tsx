import Link from "next/link";
import { Tr } from "@/components/LanguageProvider";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-black text-brand-200">404</p>
      <h1 className="font-deva mt-4 text-2xl font-extrabold text-brand-900">
        <Tr mr="पान सापडले नाही" hi="पेज नहीं मिला" en="Page not found" />
      </h1>
      <p className="font-deva mt-2 text-brand-500">
        <Tr mr="तुम्ही शोधत असलेले पान उपलब्ध नाही किंवा हलवले गेले आहे." hi="आप जो पेज ढूंढ रहे हैं वह उपलब्ध नहीं है या हटा दिया गया है।" en="The page you are looking for does not exist or has moved." />
      </p>
      <Link
        href="/"
        className="font-deva mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700"
      >
        <Tr mr="मुख्यपृष्ठावर परत जा" hi="होम पेज पर वापस जाएं" en="Back to home" />
      </Link>
    </div>
  );
}
