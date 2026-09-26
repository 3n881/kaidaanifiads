import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

// Applied to every response. No CSP yet: Razorpay Checkout loads scripts and
// frames from several of its own domains — add one only after testing checkout.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Personal / payment responses must never be stored by Cloudflare or browsers,
// even if a cache rule is misconfigured.
const noStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: noStore },
      { source: "/order/:path*", headers: [...noStore, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/my-books", headers: noStore },
    ];
  },
  experimental: {
    // Admin-only forms upload ebook PDFs. Individual files are validated again
    // in the server action (5 MB images, 50 MB PDFs).
    serverActions: { bodySizeLimit: "60mb" },
  },
  images: {
    // Optimised brand images are cached by Cloudflare too; a month here keeps
    // the optimiser from re-encoding them every 4 hours (Next 16 default).
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      // Supabase Storage (public cover images)
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
};

export default nextConfig;
