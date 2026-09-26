import "server-only";
import { SITE_URL } from "./supabase/config";

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID ?? "";
// API token scoped to this zone with only the "Cache Purge" permission.
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";

export const isCdnPurgeConfigured = Boolean(ZONE_ID && API_TOKEN);

/**
 * Purges public pages from Cloudflare after `revalidatePath` refreshed them in
 * Next.js, so edits show up immediately instead of after the edge TTL.
 * Prefix purges also clear the `?_rsc=` variants Next uses for navigation.
 * Never throws — a failed purge only means the edge TTL (1h) applies.
 */
export async function purgePublicPages(paths: string[]): Promise<void> {
  if (!isCdnPurgeConfigured || paths.length === 0) return;

  const origin = new URL(SITE_URL);
  const host = origin.host;
  const files = paths.includes("/") ? [`${origin.origin}/`] : [];
  const prefixes = paths
    .filter((p) => p !== "/")
    .map((p) => `${host}${p}`);

  const requests: Array<Record<string, string[]>> = [];
  if (files.length) requests.push({ files });
  if (prefixes.length) requests.push({ prefixes });

  await Promise.all(
    requests.map(async (body) => {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
          },
        );
        if (!res.ok) {
          console.error("[cdn] purge failed", res.status, await res.text());
        }
      } catch (error) {
        console.error("[cdn] purge error", error);
      }
    }),
  );
}
