"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2, PackageCheck, PhoneCall, RotateCcw, Truck } from "lucide-react";
import { updatePrintOrderAction } from "@/app/dashboard/actions";
import type { PrintStatus } from "@/lib/print-orders";

/** The next steps for one printed order (dashboard card). */
export default function PrintOrderActions({ id, status, courier, tracking }: { id: string; status: PrintStatus; courier: string | null; tracking: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shipping, setShipping] = useState(false);
  const [form, setForm] = useState({ courier: courier ?? "", tracking: tracking ?? "" });
  const [message, setMessage] = useState("");

  const run = (change: Parameters<typeof updatePrintOrderAction>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage("");
    start(async () => {
      const result = await updatePrintOrderAction(id, change);
      if (!result.ok) return setMessage(result.message ?? "Saving failed");
      setShipping(false);
      router.refresh();
    });
  };

  const button = (label: string, icon: React.ElementType, onClick: () => void, tone = "bg-brand-teal text-white") => {
    const Icon = icon;
    return (
      <button type="button" disabled={pending} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${tone}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </button>
    );
  };

  const canShip = status === "paid" || status === "confirmed";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "cod_pending" && button("Confirmed with buyer", PhoneCall, () => run({ status: "confirmed" }))}
        {canShip && !shipping && button("Mark shipped", Truck, () => setShipping(true))}
        {status === "shipped" && button("Delivered", PackageCheck, () => run({ status: "delivered" }), "bg-green-600 text-white")}
        {status === "shipped" && button("Returned", RotateCcw, () => run({ status: "returned" }, "Mark as returned (not delivered)?"), "border border-brand-200 bg-white text-brand-700")}
        {["pending_payment", "failed", "cod_pending", "paid", "confirmed"].includes(status) &&
          button("Cancel", Ban, () => run({ status: "cancelled" }, "Cancel this order?"), "border border-danger-500/30 bg-white text-danger-600")}
        {(status === "cancelled" || status === "returned") && button("Reopen", RotateCcw, () => run({ status: "confirmed" }), "border border-brand-200 bg-white text-brand-700")}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-brand-400" aria-hidden="true" />}
      </div>
      {shipping && (
        <div className="grid gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <input value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} placeholder="Courier (e.g. India Post, Delhivery)" className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm" />
          <input value={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.value })} placeholder="Tracking number" className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm" />
          <div className="flex gap-2">
            {button("Save shipped", CheckCircle2, () => run({ status: "shipped", courier: form.courier, tracking: form.tracking }))}
            <button type="button" onClick={() => setShipping(false)} className="rounded-lg px-2 text-xs font-semibold text-brand-500">Close</button>
          </div>
        </div>
      )}
      {message && <p role="alert" className="text-xs font-semibold text-danger-600">{message}</p>}
    </div>
  );
}
