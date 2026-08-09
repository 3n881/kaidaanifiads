"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteProduct } from "@/app/dashboard/actions";

export default function DeleteProductButton({
  id,
  title,
}: {
  id: number;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={() =>
            startTransition(async () => {
              await deleteProduct(id);
              setConfirming(false);
            })
          }
          disabled={pending}
          className="rounded-lg bg-danger-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-danger-600/90"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "नक्की?"
          )}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600"
        >
          रद्द
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete ${title}`}
      className="inline-flex items-center gap-1 rounded-lg border border-danger-500/30 px-2.5 py-1.5 text-xs font-semibold text-danger-600 hover:bg-danger-500/10"
    >
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </button>
  );
}
