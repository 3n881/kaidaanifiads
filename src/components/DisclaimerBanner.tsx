import { AlertTriangle } from "lucide-react";
import { Tr } from "@/components/LanguageProvider";

export default function DisclaimerBanner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="font-deva">
        <Tr
          mr="केवळ शैक्षणिक व माहितीच्या उद्देशाने. हा कायदेशीर सल्ला नाही (Educational reference only, not legal advice)."
          hi="केवल शैक्षणिक और जानकारी के उद्देश्य से। यह कानूनी सलाह नहीं है (Educational reference only, not legal advice)."
          en="Educational reference only — this is not legal advice."
        />
      </p>
    </div>
  );
}
