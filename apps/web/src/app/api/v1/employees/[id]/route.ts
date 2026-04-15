/**
 * Employee Detail API — /api/v1/employees/[id]
 * ─────────────────────────────────────────────────────────
 * GET: Full employee details with activity & sessions
 * PUT: Multi-action handler (toggle_status, reset_password, etc.)
 * DELETE: Permanent employee removal
 */

import { type NextRequest } from "next/server";
import { withApiRoute } from "@/shared/middleware/with-api-route";
import { withAuth, type AuthenticatedUser, getAdminId, getOrganizationId } from "@/shared/middleware/with-auth";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { envelope } from "@/shared/types/api";
import { getEmployeeService } from "@/modules/employees";
import { logAudit, getClientIp } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/v1/employees/[id] ─────────────────────────────────
export const GET = withRateLimit(
    withApiRoute(
        withAuth(
            async (_request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
                const { id } = await context!.params;
                const adminId = getAdminId(user);
                const service = getEmployeeService();
                const detail = await service.findByIdWithDetails(id, adminId);
                return envelope.ok(detail);
            },
            { role: "Admin" },
        ),
    ),
    { tier: "read" },
);

// ─── PUT /api/v1/employees/[id] ─────────────────────────────────
// Multi-action: body.action determines which operation to perform
export const PUT = withRateLimit(
    withApiRoute(
        withAuth(
            async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
                const { id } = await context!.params;
                const body = await request.json();
                const adminId = getAdminId(user);
                const organizationId = getOrganizationId(user);

                const service = getEmployeeService();
                const result = await service.executeAction(id, adminId, body);

                // Audit log for security-sensitive actions
                const action = body.action as string;
                const severityMap: Record<string, string> = {
                    toggle_status: result.status === "inactive" ? "warning" : "info",
                    reset_password: "warning",
                    unlock_account: "info",
                    terminate_sessions: "warning",
                    update_permissions: "info",
                    update_profile: "info",
                };

                logAudit({
                    organizationId,
                    userId: adminId,
                    userName: user.fullName || user.full_name || user.email,
                    userRole: "Admin",
                    action: `Employee action: ${action} on ${id}`,
                    actionType: ["reset_password", "terminate_sessions", "unlock_account"].includes(action)
                        ? ("security" as "create")
                        : "update",
                    module: "team",
                    resourceId: id,
                    resourceType: "employee",
                    severity: (severityMap[action] || "info") as "info",
                    ipAddress: getClientIp(request),
                    userAgent: request.headers.get("user-agent") || undefined,
                });

                return envelope.ok(result);
            },
            { role: "Admin" },
        ),
    ),
    { tier: "write" },
);

// ─── DELETE /api/v1/employees/[id] ──────────────────────────────
export const DELETE = withRateLimit(
    withApiRoute(
        withAuth(
            async (request: NextRequest, user: AuthenticatedUser, context?: RouteContext) => {
                const { id } = await context!.params;
                const adminId = getAdminId(user);
                const organizationId = getOrganizationId(user);

                const service = getEmployeeService();
                const deleted = await service.delete(id, adminId);

                logAudit({
                    organizationId,
                    userId: adminId,
                    userName: user.fullName || user.full_name || user.email,
                    userRole: "Admin",
                    action: `Permanently deleted employee ${deleted.fullName} (${deleted.employeeId})`,
                    actionType: "delete",
                    module: "team",
                    resourceId: id,
                    resourceType: "employee",
                    severity: "critical" as "info",
                    ipAddress: getClientIp(request),
                    userAgent: request.headers.get("user-agent") || undefined,
                });

                return envelope.noContent();
            },
            { role: "Admin" },
        ),
    ),
    { tier: "write" },
);
