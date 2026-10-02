import PlatformTenantsClient from "./PlatformTenantsClient";

/**
 * /platform/tenants — Platform admin tenant management page.
 * Guard is in the parent layout.tsx (requirePlatformAdmin + notFound).
 */
export default function PlatformTenantsPage() {
  return <PlatformTenantsClient />;
}
