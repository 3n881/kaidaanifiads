import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness check for Caddy, Docker and (later) Cloudflare Load Balancing.
 * Deliberately touches no database or external service: a slow Supabase must
 * not make the load balancer pull healthy app servers out of rotation.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, deployment: process.env.DEPLOYMENT_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
