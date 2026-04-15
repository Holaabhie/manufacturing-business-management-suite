import type { Metadata, Viewport } from "next";
import { Inter, Outfit, DM_Mono } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["400", "500"],
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
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#007AFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${dmMono.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Script
            id="orchids-browser-logs"
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
            strategy="afterInteractive"
            data-orchids-project-id="fb5f37f5-26b1-40f3-be9b-f83c65b0de52"
          />
          <ErrorReporter />
          <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
          />
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
