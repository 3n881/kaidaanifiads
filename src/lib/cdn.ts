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
 * Never throws — a failed purge only means the edge TTL (s-maxage, 5 min) applies.
 */
/**
 * Purges single files from Cloudflare, e.g. a rebuilt preview PDF at its fixed
 * /media path (`/media/previews/<slug>-<locale>.pdf`). Never throws.
 */
export async function purgeFiles(paths: string[]): Promise<void> {
  if (!isCdnPurgeConfigured || paths.length === 0) return;
  const origin = new URL(SITE_URL).origin;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ files: paths.map((p) => `${origin}${p}`) }),
        cache: "no-store",
      },
    );
    if (!res.ok) console.error("[cdn] file purge failed", res.status, await res.text());
  } catch (error) {
    console.error("[cdn] file purge error", error);
  }
}

export async function purgePublicPages(paths: string[]): Promise<void> {
  if (!isCdnPurgeConfigured || paths.length === 0) return;

  // Both hosts: www. serves its own cached copy of every page (no redirect).
  const host = new URL(SITE_URL).host.replace(/^www\./, "");
  // The home page goes by its Cache-Tag (next.config.js): clearing a page by
  // URL is accepted but misses its compressed copies (tested 12 Oct), and a
  // prefix on "/" would clear the whole site. Images by URL work fine.
  const tags = paths.includes("/") ? ["kaf-home"] : [];
  const prefixes = paths
    .filter((p) => p !== "/")
    .flatMap((p) => [`${host}${p}`, `www.${host}${p}`]);

  const requests: Array<Record<string, string[]>> = [];
  if (tags.length) requests.push({ tags });
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
