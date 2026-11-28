"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, CheckCircle2, Loader2, RotateCcw, StickyNote } from "lucide-react";
import { updateConsultationAction } from "@/app/dashboard/actions";
import type { ConsultStatus } from "@/lib/consultations";

/** Next steps for one consultation booking (dashboard card). */
export default function ConsultActions({ id, status, scheduledFor, note }: { id: string; status: ConsultStatus; scheduledFor: string | null; note: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<"" | "schedule" | "note">("");
  // datetime-local wants local time "YYYY-MM-DDTHH:mm" (admin's browser = India).
  const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  const [when, setWhen] = useState(toLocal(scheduledFor));
  const [text, setText] = useState(note ?? "");
  const [message, setMessage] = useState("");

  const run = (change: Parameters<typeof updateConsultationAction>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage("");
    start(async () => {
      const result = await updateConsultationAction(id, change);
      if (!result.ok) return setMessage(result.message ?? "Saving failed");
      setPanel("");
      router.refresh();
    });
  };
  const button = (label: string, Icon: React.ElementType, onClick: () => void, tone = "bg-brand-teal text-white") => (
    <button type="button" disabled={pending} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </button>
  );
  const paidLike = status === "paid" || status === "scheduled";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {paidLike && button(status === "scheduled" ? "Change time" : "Schedule", CalendarClock, () => setPanel(panel === "schedule" ? "" : "schedule"))}
        {status === "scheduled" && button("Done", CheckCircle2, () => run({ status: "done" }), "bg-green-600 text-white")}
        {button("Note", StickyNote, () => setPanel(panel === "note" ? "" : "note"), "border border-brand-200 bg-white text-brand-700")}
        {paidLike && button("Cancel", Ban, () => run({ status: "cancelled" }, "Cancel this consultation? (Refund it in Razorpay if needed, then mark Refunded.)"), "border border-danger-500/30 bg-white text-danger-600")}
        {(status === "cancelled" || paidLike) && button("Refunded", RotateCcw, () => run({ status: "refunded" }, "Mark as refunded? Do the refund in Razorpay first."), "border border-brand-200 bg-white text-brand-700")}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-brand-400" aria-hidden="true" />}
      </div>
      {panel === "schedule" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm" />
          {button("Save time", CheckCircle2, () => when && run({ status: "scheduled", scheduledFor: new Date(when).toISOString() }))}
        </div>
      )}
      {panel === "note" && (
        <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Notes (call outcome, documents asked, advice given…)" className="w-full rounded-lg border border-brand-200 bg-white p-2 text-sm" />
          {button("Save note", CheckCircle2, () => run({ note: text }))}
        </div>
      )}
      {message && <p role="alert" className="text-xs font-semibold text-danger-600">{message}</p>}
    </div>
  );
}
