import type { MetadataRoute } from "next";

/**
 * Next.js App Router convention — generates /sitemap.xml automatically.
 *
 * Only public/marketing routes are listed here.
 * All authenticated routes (/dashboard/**, /api/**) are excluded.
 *
 * TODO: Replace the placeholder domain with the real production domain.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://indmanager.in";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
