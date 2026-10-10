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

  // The previous site served every book at /ebooks/<its internal id>. Those
  // links live on in Instagram posts, WhatsApp chats and Google, so each one
  // redirects to the same book here. Comments are the product id.
  const legacyBooks = [
    ["cmqz48omv000004jvpkwio1s5", "/ebooks/rti-adhiniyam-2005-sampurna-guide"], // 30
    ["cmoe1qkt5000004l6apc9qs3b", "/ebooks/hindu-uttaradhikar-kanoon-guide"], // 27
    ["cmo745zh80000ivrzzfsbvi4w", "/ebooks/jamin-mojani-sampurna-margadarshak"], // 26
    ["cmneifnb30002t6rz6jn4e1gv", "/combos/patsanstha-fasavnuk-combo"], // 25
    ["cmlt3nxe200rbsurzz34xa8lz", "/ebooks/atrocity-kayada-combo"], // 19
    ["cmkp0bdsj0004xlrz5iyaqbk7", "/combos/rti-brahmastra-3in1"], // 16
    ["cmki9y4mk000f04jowhl6babh", "/combos/ghar-ghenyaadhi-he-vachach"], // 12
    ["cmkdvuui9000004l170b2db2g", "/combos/vivah-te-ghatasphot-margdarshika"], // 8
    ["cmk163mbe000004kyhqrih4e5", "/combos/malmatta-vatap-kayadeshir-hakka"], // 4
  ];
  // Books not listed here yet (waiting for their PDF). Temporary, so point
  // them at their own page once they are added.
  const legacyPendingBooks = [
    ["cmtsk5mcj0000jr04gvqooar3", "/ebooks"], // 32 ग्रामपंचायत योद्धा
    ["cms602mse000004kwny4508sr", "/ebooks"], // 31
    ["cmqrz88lp0000ebrzlygz7x8l", "/ebooks"], // 29
    ["cmol800wg000004jkyn00y0ju", "/ebooks"], // 28
    ["cmlt81qx40000ljrzizcl4nza", "/combos"], // 22
  ];

  return {
    // Self-contained server (`node server.js`) for the Docker image — see Dockerfile.
    output: "standalone",
    // Same value on every server/container of one release (the image's git SHA):
    // lets Next.js detect version skew during rolling deploys and hard-reload
    // clients instead of breaking navigation.
    deploymentId: process.env.DEPLOYMENT_ID || undefined,
    poweredByHeader: false,
    async redirects() {
      return [
        ...legacyBooks.map(([id, destination]) => ({
          source: `/ebooks/${id}`,
          destination,
          permanent: true,
        })),
        ...legacyPendingBooks.map(([id, destination]) => ({
          source: `/ebooks/${id}`,
          destination,
          permanent: false,
        })),
        { source: "/ebooks/hindi", destination: "/ebooks?lang=Hindi", permanent: true },
        { source: "/ebooks/english", destination: "/ebooks", permanent: false },
      ];
    },
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
