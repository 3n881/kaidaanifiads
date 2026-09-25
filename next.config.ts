import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  experimental: {
    // Admin-only forms upload ebook PDFs. Individual files are validated again
    // in the server action (5 MB images, 50 MB PDFs).
    serverActions: { bodySizeLimit: "60mb" },
  },
  images: {
    remotePatterns: [
      // Supabase Storage (public cover images)
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
};

export default nextConfig;
