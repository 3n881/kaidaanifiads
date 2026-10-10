import type { Metadata } from "next";
import { Inbox, Mail, MessageCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { getContactMessages } from "@/lib/admin";
import { setMessageHandled } from "../actions";

export const metadata: Metadata = {
  title: "Admin — Messages",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const LANG: Record<string, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };

/** Inbox for the Contact page's "Send us a message" form. */
export default async function MessagesPage() {
  const messages = await getContactMessages();
  const open = messages.filter((m) => !m.handled).length;

  return (
    <AdminShell
      active="messages"
      title="Messages"
      description={`Contact-page messages. ${open} open · ${messages.length} total. Reply by email or WhatsApp, then mark as done.`}
    >
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-brand-300" />
          <p className="font-deva mt-3 text-sm font-semibold text-brand-700">अजून कोणताही संदेश नाही</p>
          <p className="mt-1 text-xs text-brand-400">Messages from the Contact page appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:p-5 ${m.handled ? "border-brand-100 opacity-70" : "border-brand-gold/40"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-deva font-bold text-brand-900">
                    {m.name}
                    {m.subject && <span className="font-normal text-brand-500"> — {m.subject}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-400">
                    {new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                    {" · "}
                    {LANG[m.locale] ?? m.locale}
                  </p>
                </div>
                <form action={setMessageHandled.bind(null, m.id, !m.handled)}>
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${m.handled ? "border border-brand-200 text-brand-600 hover:bg-brand-50" : "bg-brand-teal text-white hover:bg-brand-teal/90"}`}
                  >
                    {m.handled ? "Reopen" : "Mark as done"}
                  </button>
                </form>
              </div>
              <p className="font-deva mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-700">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.email && (
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                    <Mail className="h-3.5 w-3.5" /> {m.email}
                  </a>
                )}
                {m.phone && (
                  <a href={`https://wa.me/91${m.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/20">
                    <MessageCircle className="h-3.5 w-3.5" /> +91 {m.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
