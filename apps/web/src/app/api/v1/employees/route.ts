/**
 * Employees API — /api/v1/employees
 * ─────────────────────────────────────────────────────────
 * Full middleware stack: rate-limit → error handling → auth (Admin only)
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser, getAdminId, getOrganizationId } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getEmployeeService } from "@/modules/employees";
import { logAudit, getClientIp } from "@/lib/audit";

// ─── GET /api/v1/employees ──────────────────────────────────────
export const GET = withRateLimit(
    withApiRoute(
        withAuth(
            async (_request: NextRequest, user: AuthenticatedUser) => {
                const adminId = getAdminId(user);
                const service = getEmployeeService();
                const result = await service.findAll(adminId);
                return envelope.ok(result);
            },
            { role: "Admin" },
        ),
    ),
    { tier: "read" },
);

// ─── POST /api/v1/employees ─────────────────────────────────────
export const POST = withRateLimit(
    withApiRoute(
        withAuth(
            async (request: NextRequest, user: AuthenticatedUser) => {
                const body = await request.json();
                const adminId = getAdminId(user);
                const organizationId = getOrganizationId(user);
                const subscriptionTier =
                    (user as Record<string, unknown>).subscription_tier as string || "starter";

                const service = getEmployeeService();
                const result = await service.create(
                    adminId,
                    organizationId,
                    subscriptionTier,
                    body,
                );

                // Audit log
                logAudit({
                    organizationId,
                    userId: adminId,
                    userName: user.fullName || user.full_name || user.email,
                    userRole: "Admin",
                    action: `Created employee ${result.employee.fullName} (${result.employee.employeeId})`,
                    actionType: "create",
                    module: "team",
                    resourceId: result.employee.id,
                    resourceType: "employee",
                    severity: "info",
                    ipAddress: getClientIp(request),
                    userAgent: request.headers.get("user-agent") || undefined,
                });

                return envelope.created({
                    employee: result.employee,
                    tempPassword: result.tempPassword,
                });
            },
            { role: "Admin" },
        ),
    ),
    { tier: "write" },
);
