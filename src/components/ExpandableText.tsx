"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "./LanguageProvider";

export default function ExpandableText({
  text,
  clampChars = 240,
}: {
  text: string;
  clampChars?: number;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const needsToggle = text.length > clampChars;
  const shown = open || !needsToggle ? text : text.slice(0, clampChars) + "…";

  return (
    <div>
      <p className="font-deva whitespace-pre-line text-sm leading-relaxed text-brand-600">
        {shown}
      </p>
      {needsToggle && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-deva mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
        >
          {open ? (
            <>
              {t({ mr: "कमी करा (Show Less)", hi: "कम करें (Show Less)", en: "Show less" })} <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {t({ mr: "अधिक वाचा (Show More)", hi: "और पढ़ें (Show More)", en: "Show more" })} <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
