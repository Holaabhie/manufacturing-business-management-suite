/**
 * Auth Guard Middleware for API v1 Routes
 * ─────────────────────────────────────────────────────────
 * Standardized authentication wrapper that removes the
 * repetitive auth-check boilerplate from every route.
 *
 * Usage:
 *   // Basic auth (any logged-in user)
 *   export const GET = withApiRoute(
 *     withAuth(async (request, user) => {
 *       const items = await service.findAll(user._id.toString());
 *       return envelope.ok(items);
 *     })
 *   );
 *
 *   // Admin only
 *   export const POST = withApiRoute(
 *     withAuth(async (request, user) => {
 *       return envelope.created(data);
 *     }, { role: "Admin" })
 *   );
 *
 *   // With specific permission
 *   export const DELETE = withApiRoute(
 *     withAuth(async (request, user) => {
 *       return envelope.noContent();
 *     }, { permission: "inventory.delete" })
 *   );
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser, type UserDoc } from "@/lib/auth-session";
import { hasPermission, type PermissionModule, type PermissionMap } from "@/lib/permissions";
import type { WithId } from "mongodb";
import { AuthenticationError, AuthorizationError } from "@/shared/lib/errors";

export type AuthenticatedUser = WithId<UserDoc>;

type AuthenticatedHandler<C = any> = (
    request: NextRequest,
    user: AuthenticatedUser,
    context: C,
) => Promise<NextResponse>;

interface AuthOptions {
    /** Require a specific role */
    role?: "Admin" | "Staff";
    /** Require a specific permission (format: "module.action") */
    permission?: string;
}

/**
 * Wraps a handler with authentication + optional authorization.
 */
export function withAuth<C = any>(
    handler: AuthenticatedHandler<C>,
    options: AuthOptions = {},
): (request: NextRequest, context: C) => Promise<NextResponse> {
    return async function authGuardHandler(
        request: NextRequest,
        context: C,
    ): Promise<NextResponse> {
        // 1. Authentication
        const user = await getSessionUser();
        if (!user) {
            throw new AuthenticationError();
        }

        // 2. Role check
        if (options.role && user.role !== options.role) {
            throw new AuthorizationError(
                `Role '${options.role}' required`,
            );
        }

        // 3. Permission check
        if (options.permission) {
            const [module, action] = options.permission.split(".") as [PermissionModule, string];
            const userPermissions = user.permissions as PermissionMap | undefined;

            // Admins have all permissions
            if (user.role !== "Admin" && !hasPermission(userPermissions, module, action)) {
                throw new AuthorizationError(options.permission);
            }
        }

        return handler(request, user as AuthenticatedUser, context);
    };
}

/**
 * Helper to extract adminId from a user (handles Admin vs Staff).
 * Staff users return their adminId, Admins return their own _id.
 */
export function getAdminId(user: AuthenticatedUser): string {
    if (user.role === "Admin") {
        return user._id.toString();
    }
    return (user as Record<string, unknown>).adminId?.toString() || user._id.toString();
}

/**
 * Helper to extract organizationId from a user.
 */
export function getOrganizationId(user: AuthenticatedUser): string {
    return (
        (user as Record<string, unknown>).organizationId?.toString() ||
        user._id.toString()
    );
}
