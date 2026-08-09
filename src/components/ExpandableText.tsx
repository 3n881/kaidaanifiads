"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ExpandableText({
  text,
  clampChars = 240,
}: {
  text: string;
  clampChars?: number;
}) {
  const [open, setOpen] = useState(false);
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
              कमी करा (Show Less) <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              अधिक वाचा (Show More) <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
