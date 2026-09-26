// E — Download authorization. Needs one PAID staging order (from checkout.js
// or a manual test purchase): copy its /order/<id>?t=<token> URL.
//
//   k6 run -e BASE=https://staging.example.com -e ORDER=<uuid> -e TOKEN=<t> loadtest/download.js
//
// Expected: valid → 302 to a Supabase signed URL (no bytes through Next.js);
// wrong token / random order → 403; after DOWNLOAD_LIMIT → 429.
import http from "k6/http";
import { check } from "k6";

const { BASE, ORDER, TOKEN } = __ENV;
if (!BASE || !ORDER || !TOKEN) throw new Error("Set BASE, ORDER, TOKEN");

export const options = { vus: 5, iterations: 50 };

export default function run() {
  const ok = http.get(`${BASE}/api/download/${ORDER}?t=${TOKEN}`, { redirects: 0 });
  check(ok, {
    "valid → 302 or capped 429": (r) => r.status === 302 || r.status === 429,
    "redirects to signed storage URL": (r) =>
      r.status !== 302 || /\/storage\/v1\/object\/sign\//.test(r.headers.Location),
    "no-store": (r) => /no-store/.test(r.headers["Cache-Control"] || ""),
  });

  const badToken = http.get(`${BASE}/api/download/${ORDER}?t=deadbeef`, { redirects: 0 });
  check(badToken, { "bad token → 403": (r) => r.status === 403 });

  const guessed = http.get(
    `${BASE}/api/download/00000000-0000-4000-8000-000000000000?t=${TOKEN}`,
    { redirects: 0 },
  );
  check(guessed, { "other order with this token → 403": (r) => r.status === 403 });
}
