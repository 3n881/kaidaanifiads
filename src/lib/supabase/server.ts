import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  isSupabaseConfigured,
  hasServiceRole,
} from "./config";

// Customer-facing calls must fail fast when Supabase is slow or down, instead
// of piling up requests on the app servers during a Reel spike.
const DEFAULT_TIMEOUT_MS = 8_000;
// Admin uploads (PDFs up to 50 MB) need far longer.
export const ADMIN_UPLOAD_TIMEOUT_MS = 120_000;

// supabase-js retries reads 3× with 1s/2s/4s backoff by default — that turns
// one 8 s timeout into ~40 s. Buyers get a fast "try again" instead, and the
// webhook relies on Razorpay's own redelivery.
const NO_CLIENT_RETRIES = { retry: false } as const;

function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}

/**
 * Public read client (anon key, respects Row Level Security).
 * Use for reading active products/combos.
 */
export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    db: NO_CLIENT_RETRIES,
    global: { fetch: fetchWithTimeout(DEFAULT_TIMEOUT_MS) },
  });
}

/**
 * Admin client (service-role key, BYPASSES RLS). Server-only.
 * Use for admin writes, the Razorpay webhook, and order lookups.
 */
export function getSupabaseAdmin(timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!hasServiceRole) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: NO_CLIENT_RETRIES,
    global: { fetch: fetchWithTimeout(timeoutMs) },
  });
}

/** Thrown when Supabase errors or times out (as opposed to "row not found"),
 *  so callers can answer "try again" instead of "doesn't exist". */
export class DatabaseUnavailableError extends Error {
  constructor(context: string, cause?: unknown) {
    super(`Database unavailable: ${context}`, { cause });
    this.name = "DatabaseUnavailableError";
  }
}
