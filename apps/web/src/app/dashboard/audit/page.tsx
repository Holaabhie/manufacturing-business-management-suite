"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect from the old /dashboard/audit route to the new location
 * at /dashboard/profile?tab=audit
 */
export default function AuditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/profile?tab=audit");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
