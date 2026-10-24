import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://smartshop.app").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/contact"],
        disallow: ["/api/", "/bridge", "/documents", "/activity"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
