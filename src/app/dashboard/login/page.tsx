"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const supabase = createClient();
      const next =
        new URLSearchParams(window.location.search).get("next") || "/dashboard";
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "काहीतरी चूक झाली.");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/logo.png"
            alt="कायद्याचं आणि फायद्याचं"
            width={662}
            height={115}
            className="h-9 w-auto object-contain"
          />
          <div className="mt-5 flex items-center gap-2 rounded-full bg-brand-teal/5 px-3 py-1 text-xs font-semibold text-brand-teal">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Login
          </div>
          <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">
            डॅशबोर्ड प्रवेश
          </h1>
          <p className="font-deva mt-1 text-sm text-brand-500">
            तुमच्या ईमेलवर सुरक्षित लॉगिन लिंक पाठवली जाईल.
          </p>
        </div>

        {status === "sent" ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-brand-teal/5 p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-brand-teal" />
            <p className="font-deva text-sm font-semibold text-brand-900">
              लिंक पाठवली!
            </p>
            <p className="font-deva text-xs text-brand-500">
              <b>{email}</b> वर आलेली लॉगिन लिंक उघडा. (Spam फोल्डरही तपासा.)
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="flex items-center rounded-xl border border-brand-200 px-3 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20">
              <Mail className="h-4 w-4 text-brand-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
              />
            </div>
            {status === "error" && (
              <p className="rounded-lg bg-danger-500/10 px-3 py-2 text-xs font-medium text-danger-600">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="font-deva flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-teal/90 disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> पाठवत आहे…
                </>
              ) : (
                "लॉगिन लिंक पाठवा"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
