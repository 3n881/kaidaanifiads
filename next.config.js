// @ts-check

/** @type {import("next").NextConfig} */
const nextConfig = (() => {
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

  return {
    // Self-contained server (`node server.js`) for the Docker image — see Dockerfile.
    output: "standalone",
    // Same value on every server/container of one release (the image's git SHA):
    // lets Next.js detect version skew during rolling deploys and hard-reload
    // clients instead of breaking navigation.
    deploymentId: process.env.DEPLOYMENT_ID || undefined,
    poweredByHeader: false,
    async headers() {
      return [
        { source: "/:path*", headers: securityHeaders },
        { source: "/api/:path*", headers: noStore },
        {
          source: "/order/:path*",
          headers: [...noStore, { key: "Referrer-Policy", value: "no-referrer" }],
        },
        { source: "/my-books", headers: noStore },
      ];
    },
    experimental: {
      // Admin-only forms can upload one or more localized PDFs plus previews.
      // Keep this below Cloudflare's common 100 MB request ceiling.
      serverActions: { bodySizeLimit: "95mb" },
    },
    images: {
      // Optimised brand images are cached by Cloudflare too; a month here keeps
      // the optimiser from re-encoding them every 4 hours (Next 16 default).
      minimumCacheTTL: 60 * 60 * 24 * 31,
      remotePatterns: [
        // Supabase Storage (public cover images)
        ...(supabaseHostname
          ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
          : []),
      ],
    },
  };
})();

module.exports = nextConfig;
