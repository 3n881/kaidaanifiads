import { AlertTriangle } from "lucide-react";

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
        केवळ शैक्षणिक व माहितीच्या उद्देशाने. हा कायदेशीर सल्ला नाही
        (Educational reference only, not legal advice).
      </p>
    </div>
  );
}
