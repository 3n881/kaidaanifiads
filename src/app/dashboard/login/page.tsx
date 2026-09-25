"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Login failed.");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/dashboard") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
      setSending(false);
    }
  };

  return <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-7 shadow-[var(--shadow-card)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Image src="/brand/logo.png" alt="कायद्याचं आणि फायद्याचं" width={662} height={115} className="h-9 w-auto object-contain" priority />
        <div className="mt-5 flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-teal"><ShieldCheck className="h-3.5 w-3.5" /> Admin Login</div>
        <h1 className="font-deva mt-3 text-xl font-extrabold text-brand-900">डॅशबोर्ड प्रवेश</h1>
        <p className="font-deva mt-1 text-sm text-brand-500">फक्त अधिकृत प्रशासकांसाठी सुरक्षित प्रवेश.</p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="flex items-center rounded-xl border border-brand-200 px-3 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/15">
          <Mail className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" />
        </label>
        <label className="flex items-center rounded-xl border border-brand-200 px-3 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/15">
          <LockKeyhole className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="rounded p-1 text-brand-400 hover:text-brand-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </label>
        {message && <p role="alert" className="rounded-lg bg-danger-500/10 px-3 py-2 text-xs font-medium text-danger-600">{message}</p>}
        <button type="submit" disabled={sending} className="font-deva flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60">{sending && <Loader2 className="h-4 w-4 animate-spin" />}लॉगिन करा</button>
      </form>
    </div>
  </div>;
}
