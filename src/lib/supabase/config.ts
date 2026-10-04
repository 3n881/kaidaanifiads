// Central place to check whether external services are configured.
// When a service isn't configured, the app falls back to a safe local mock
// so it keeps running end-to-end before real keys are added.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True once the public Supabase URL + anon key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True once the server has the service-role key (admin writes, webhook). */
export const hasServiceRole = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// Public origin of this deployment (links in sitemap, metadata, WhatsApp).
// Tolerates an empty value, a missing "https://" or a trailing slash so a
// typo in a host's settings can't break `new URL(SITE_URL)` on every page.
const RAW_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
export const SITE_URL = (
  /^https?:\/\//.test(RAW_SITE_URL) ? RAW_SITE_URL : `https://${RAW_SITE_URL}`
).replace(/\/+$/, "");
