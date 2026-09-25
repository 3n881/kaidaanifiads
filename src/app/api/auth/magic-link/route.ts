import { NextResponse, type NextRequest } from "next/server";
import { adminEmails } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { email?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    return NextResponse.json(
      { error: "This email is not authorized for dashboard access." },
      { status: 403 },
    );
  }

  const next = String(body.next ?? "/dashboard");
  const safeNext = next.startsWith("/dashboard") ? next : "/dashboard";
  const callback = new URL("/auth/callback", request.nextUrl.origin);
  callback.searchParams.set("next", safeNext);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: false },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin magic-link configuration error", error);
    return NextResponse.json(
      { error: "Admin login is not configured on the server." },
      { status: 503 },
    );
  }
}
