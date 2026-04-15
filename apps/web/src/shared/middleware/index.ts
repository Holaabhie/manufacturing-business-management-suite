/**
 * Shared Middleware — Barrel Export
 * ─────────────────────────────────────────────────────────
 * All middleware composables for API route handlers.
 *
 * Composition order (outermost → innermost):
 *   withRateLimit → withCors → withApiRoute → withAuth → withValidation → handler
 *
 * Example of a fully-composed route:
 *   export const POST = withRateLimit(
 *     withApiRoute(
 *       withAuth(
 *         withValidation(schema, async (request, validated, user) => {
 *           return envelope.created(data);
 *         }),
 *         { role: "Admin" }
 *       )
 *     ),
 *     { tier: "write" }
 *   );
 */

export { withApiRoute } from "./with-api-route";
export { withAuth, getAdminId, getOrganizationId, type AuthenticatedUser } from "./with-auth";
export { withValidation, withQueryValidation } from "./with-validation";
export { withRateLimit, RATE_LIMIT_TIERS, type RateLimitConfig } from "./rate-limiter";
export { withCors, corsHandler } from "./cors";
