import type { MetadataRoute } from "next";

// "Add to Home Screen" on Android uses these icons (the round emblem from the
// logo, without the lettering).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "कायद्याचं आणि फायद्याचं",
    short_name: "KAF",
    description: "सोप्या भाषेत कायदे — मराठी आणि हिंदी कायदेविषयक ई-बुक्स.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a2342",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
