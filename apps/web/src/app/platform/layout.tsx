import { requirePlatformAdmin } from "@/lib/platform-admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Admin",
  robots: { index: false, follow: false },
};

/**
 * Platform admin layout — protects ALL /platform/* routes.
 * Calls requirePlatformAdmin() server-side. Non-admins get a 404
 * (notFound()), so the page's existence is never leaked.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminCheck = await requirePlatformAdmin();

  if (adminCheck.error) {
    notFound();
  }

  return <>{children}</>;
}
