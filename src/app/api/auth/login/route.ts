import { NextResponse, type NextRequest } from "next/server";
import { adminEmails } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }
  if (!adminEmails().includes(email)) {
    return NextResponse.json(
      { error: "This email is not authorized for dashboard access." },
      { status: 403 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login configuration error", error);
    return NextResponse.json(
      { error: "Admin login is not configured on the server." },
      { status: 503 },
    );
  }
}
