import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: true,
  fallbacks: {
    document: "/offline",
  },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // ── Turbopack Workspace Root ─────────────────────────────
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },

  // ── Core ────────────────────────────────────────────────
  reactStrictMode: true,
  compress: true,
  output: "standalone",
  devIndicators: false,

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
    // Low-memory worker guard for constrained systems (<=8GB RAM) - gated by LOW_MEM_BUILD=1 (default OFF)
    ...(process.env.LOW_MEM_BUILD === "1"
      ? {
          cpus: 1,
          webpackBuildWorker: false,
          workerThreads: false,
          staticGenerationMaxConcurrency: 1,
          staticGenerationMinPagesPerWorker: 1000,
        }
      : {}),
    // Tree-shake these packages automatically
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "motion",
      "date-fns",
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
    ],
  },

  // ── Webpack Config (dev file watching for Windows/OneDrive) ──
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 600000,        // Effectively disabled during capture (10-min interval)
        aggregateTimeout: 2000,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/demo-assets/**",
        ],
      };
    }
    return config;
  },

  // ── Static Asset Caching Headers ───────────────────────
  async headers() {
    // Build the CSP connect-src based on environment
    const connectSrc = isDev
      ? "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com https://api.razorpay.com https://*.razorpay.com ws://localhost:* wss://localhost:* http://localhost:*"
      : "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com https://api.razorpay.com https://*.razorpay.com";

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://checkout.razorpay.com https://*.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com data: https://*.razorpay.com",
              "img-src 'self' data: blob: https:",
              connectSrc + " https://accounts.google.com",
              "frame-src https://js.stripe.com https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://api.razorpay.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // ── Service Worker Kill-Switch (Always fresh, never cached) ──
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
      // ── Immutable caching for static assets (production only) ──
      ...(isDev
        ? []
        : [
            {
              source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|otf)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]),
    ];
  },

};

export default withPWA(nextConfig);
