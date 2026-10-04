import type { NextRequest } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * GET /media/<path> — public book images and preview PDFs from the Supabase
 * `covers` bucket, served from our own domain so Cloudflare can cache them at
 * its India edge (Supabase is fetched once per file per edge, not per visit).
 * Turned on with NEXT_PUBLIC_MEDIA_PROXY=true (see src/lib/covers.ts).
 * Only the public covers bucket is reachable; private PDFs never go through here.
 */

const ALLOWED = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*\.(webp|png|jpe?g|pdf)$/i;

// Image variants have versioned names (…-v<timestamp>-400.webp) and never
// change → cache for a year. Preview PDFs keep a fixed name and are rebuilt
// when a PDF is re-uploaded → browsers 5 min, Cloudflare 1 h (the dashboard
// also purges that file from Cloudflare when it rebuilds it).
const LONG = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=300, s-maxage=3600";

async function serve(ctx: { params: Promise<{ path: string[] }> }, method: "GET" | "HEAD") {
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!SUPABASE_URL || !ALLOWED.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/covers/${key}`,
      { method, signal: AbortSignal.timeout(15_000), cache: "no-store" },
    );
  } catch {
    return new Response("Storage unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  if (upstream.status === 404 || upstream.status === 400) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  }
  if (!upstream.ok) {
    return new Response("Storage unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": key.startsWith("previews/") ? SHORT : LONG,
  });
  for (const h of ["content-length", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (key.endsWith(".pdf")) {
    headers.set("Content-Disposition", `inline; filename="${path[path.length - 1]}"`);
  }
  return new Response(method === "HEAD" ? null : upstream.body, { status: 200, headers });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return serve(ctx, "GET");
}

export async function HEAD(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return serve(ctx, "HEAD");
}
