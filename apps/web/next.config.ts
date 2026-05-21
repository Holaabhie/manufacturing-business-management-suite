import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  fallbacks: {
    document: "/offline",
  },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // ── Core ────────────────────────────────────────────────
  reactStrictMode: true,
  compress: true,
  output: "standalone",

  // ── Server External Packages ────────────────────────────
  serverExternalPackages: ["puppeteer", "puppeteer-core", "bcrypt", "mongoose"],

  // ── Compiler Optimizations ──────────────────────────────
  compiler: {
    // Strip console.log in production builds
    removeConsole: isDev ? false : { exclude: ["error", "warn"] },
  },

  // ── Image Optimization ─────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // ── Experimental Speed Features ────────────────────────
  experimental: {
    // Tree-shake these packages automatically
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "@heroicons/react",
      "recharts",
      "framer-motion",
      "motion",
      "date-fns",
      "react-icons",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "sonner",
      "embla-carousel-react",
    ],
  },

  // ── Turbopack Config (Next.js 16 default) ───────────────
  turbopack: {},

  // ── Webpack Config (dev file watching for Windows/OneDrive) ──
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,           // Poll every 1s (needed for OneDrive/network paths)
        aggregateTimeout: 300, // Batch changes within 300ms
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
        ],
      };
    }
    return config;
  },

  // ── Static Asset Caching Headers ───────────────────────
  async headers() {
    // Build the CSP connect-src based on environment
    const connectSrc = isDev
      ? "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com ws://localhost:* wss://localhost:* http://localhost:*"
      : "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com";

    return [
      // ── Security Headers (all routes) ──────────────────
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              connectSrc + " https://accounts.google.com",
              "frame-src https://js.stripe.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // ── Immutable caching for static assets ────────────
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Cache JS/CSS chunks ────────────────────────────
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  typescript: {
    // TODO [PHASE-2]: Remove this once all TypeScript errors are fixed.
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
