import type { MetadataRoute } from "next";

/**
 * Next.js App Router convention — generates /robots.txt automatically.
 *
 * Allows crawling of public routes, explicitly disallows all
 * authenticated/dashboard/api paths.
 *
 * TODO: Replace the placeholder domain with the real production domain.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://indmanager.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/brand/*", "/brand/favicons/*", "/favicon.ico"],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/api",
          "/api/*",
          "/admin",
          "/admin/*",
          "/onboarding",
          "/setup",
          "/staff",
          "/staff/*",
          "/invite",
          "/invite/*",
          "/forgot-password",
          "/access-denied",
          "/offline",
          "/platform",
          "/platform/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
