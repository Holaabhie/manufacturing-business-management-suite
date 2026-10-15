import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/glass.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { FeatureGateProvider } from "@/components/FeatureGateProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AppLoader } from "@/components/AppLoader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IND Manager — Business Management Suite",
  description: "AI-powered manufacturing and business management for Indian SMEs. Track orders, inventory, analytics, and clients.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IND Manager",
  },
  icons: {
    icon: [
      {
        url: "/brand/favicons/favicon-light-32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/favicons/favicon-light-16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/favicons/favicon-dark-32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/brand/favicons/favicon-dark-16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/brand/favicons/favicon.ico",
      },
    ],
    apple: [
      { url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="preload" href="/loading/logo.png" as="image" />
        <link rel="preload" href="/loading/gear-mask.png" as="image" />
      </head>
      <body className="antialiased">
        <AppLoader />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorReporter />
          <LocaleProvider>
            <AuthProvider>
              <QueryProvider>
                <FeatureGateProvider>
                  {children}
                </FeatureGateProvider>
              </QueryProvider>
            </AuthProvider>
          </LocaleProvider>
          <VisualEditsMessenger />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
