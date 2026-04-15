/**
 * withApiRoute — Enterprise API Route Handler Wrapper
 * ─────────────────────────────────────────────────────────
 * Wraps every API route handler with:
 *   1. Unified error handling (AppError → envelope, unknown → 500)
 *   2. Request ID injection
 *   3. Structured logging hooks
 *   4. Performance timing
 *
 * Usage:
 *   export const GET = withApiRoute(async (request, { params }) => {
 *     const user = await getSessionUser();
 *     if (!user) throw new AuthenticationError();
 *     const data = await orderService.findAll(user.organizationId);
 *     return envelope.ok(data);
 *   });
 *
 * This eliminates the `try { ... } catch (error: any) { console.error; return 500 }`
 * pattern that's repeated across every route.
 */

import { type NextRequest, NextResponse } from "next/server";
import { envelope } from "@/shared/types/api";
import { isAppError, type AppError } from "@/shared/lib/errors";
import { apiLogger } from "@/infrastructure/logging/logger";

// Route context matching Next.js App Router handler params
// Generic route context to support any params shape
type AnyRouteContext = any;

type RouteHandler<C = AnyRouteContext> = (
    request: NextRequest,
    context: C,
) => Promise<NextResponse>;

interface RouteOptions {
    /**
     * If true, logs timing + request metadata. Defaults to true in development.
     */
    logging?: boolean;
}

export function withApiRoute<C = AnyRouteContext>(
    handler: RouteHandler<C>,
    options: RouteOptions = {},
): RouteHandler<C> {
    const { logging = process.env.NODE_ENV !== "production" } = options;

    return async function wrappedHandler(
        request: NextRequest,
        context: C,
    ): Promise<NextResponse> {
        const start = Date.now();
        const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
        const method = request.method;
        const path = request.nextUrl.pathname;

        try {
            const response = await handler(request, context);

            // Inject request ID into response headers
            response.headers.set("x-request-id", requestId);

            if (logging) {
                const duration = Date.now() - start;
                apiLogger.info(`${method} ${path} → ${response.status}`, {
                    duration,
                    requestId: requestId.slice(0, 8),
                    status: response.status,
                });
            }

            return response;
        } catch (error: unknown) {
            const duration = Date.now() - start;

            if (isAppError(error)) {
                // Operational errors — expected, log at appropriate level
                const appErr = error as AppError;
                if (appErr.statusCode >= 500) {
                    apiLogger.error(`${method} ${path} → ${appErr.statusCode} ${appErr.code}`, {
                        duration,
                        requestId: requestId.slice(0, 8),
                        errorMessage: appErr.message,
                    });
                } else if (logging) {
                    apiLogger.warn(`${method} ${path} → ${appErr.statusCode} ${appErr.code}`, {
                        duration,
                        requestId: requestId.slice(0, 8),
                    });
                }

                const response = envelope.fromAppError(appErr);
                response.headers.set("x-request-id", requestId);
                return response;
            }

            // Unexpected/programmer errors — always log
            apiLogger.error(`${method} ${path} → 500 INTERNAL_ERROR`, {
                duration,
                requestId: requestId.slice(0, 8),
                error: error instanceof Error ? error.message : String(error),
            });

            const response = envelope.fromUnknown(error);
            response.headers.set("x-request-id", requestId);
            return response;
        }
    };
}
