import "server-only";
import { createSupabaseServerClient } from "./supabase/ssr-server";

/** Emails allowed into the admin dashboard (from ADMIN_EMAILS env, comma-sep). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = adminEmails();
  // Fail CLOSED: with no allowlist configured, nobody is admin. You MUST set
  // ADMIN_EMAILS to the owner's email(s) to grant dashboard access.
  if (allow.length === 0) return false;
  return allow.includes(email.toLowerCase());
}

/** Returns the signed-in admin user, or null. Use to guard server actions/pages. */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

/** Throws if the caller is not an authenticated admin. Use at the top of every
 *  admin server action before touching the service-role client. */
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
