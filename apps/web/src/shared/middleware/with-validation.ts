/**
 * withValidation — Request Body Validation Middleware
 * ─────────────────────────────────────────────────────────
 * Wraps an API route handler with Zod schema validation AND
 * MongoDB injection sanitization. The validated + sanitized
 * data is passed to the handler as a typed argument.
 *
 * Usage:
 *   const schema = z.object({ name: z.string(), quantity: z.number() });
 *
 *   export const POST = withApiRoute(
 *     withValidation(schema, async (request, validated) => {
 *       // `validated` is typed as { name: string; quantity: number }
 *       const item = await service.create(validated);
 *       return envelope.created(item);
 *     })
 *   );
 *
 * This replaces the pattern of:
 *   const body = await request.json();
 *   // then hoping body.name is a string...
 */

import { type NextRequest, NextResponse } from "next/server";
import { type ZodSchema, type ZodError } from "zod";
import { ValidationError, type FieldError } from "@/shared/lib/errors";
import { sanitizeMongoInput } from "@/shared/lib/sanitize";

type ValidatedHandler<T> = (
    request: NextRequest,
    validated: T,
    context?: { params?: Promise<Record<string, string>> },
) => Promise<NextResponse>;

type RouteContext = {
    params?: Promise<Record<string, string>>;
};

/**
 * Wraps a handler with body parsing, Zod validation, and sanitization.
 * Throws a ValidationError (caught by withApiRoute) on failure.
 */
export function withValidation<T>(
    schema: ZodSchema<T>,
    handler: ValidatedHandler<T>,
) {
    return async function validatedHandler(
        request: NextRequest,
        context?: RouteContext,
    ): Promise<NextResponse> {
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON in request body", "body");
        }

        // Sanitize MongoDB injection attempts BEFORE validation
        const sanitized = sanitizeMongoInput(body);

        // Validate with Zod
        const result = schema.safeParse(sanitized);

        if (!result.success) {
            const fieldErrors: FieldError[] = result.error.issues.map((issue) => ({
                field: issue.path.join(".") || "body",
                message: issue.message,
                received: (issue as unknown as Record<string, unknown>).received,
            }));
            throw new ValidationError(fieldErrors);
        }

        return handler(request, result.data, context);
    };
}

/**
 * Validate query parameters against a Zod schema.
 * For GET requests that need parameter validation.
 */
export function withQueryValidation<T>(
    schema: ZodSchema<T>,
    handler: (request: NextRequest, validated: T, context?: RouteContext) => Promise<NextResponse>,
) {
    return async function validatedHandler(
        request: NextRequest,
        context?: RouteContext,
    ): Promise<NextResponse> {
        const params: Record<string, string> = {};
        request.nextUrl.searchParams.forEach((value, key) => {
            params[key] = value;
        });

        // Sanitize query params
        const sanitized = sanitizeMongoInput(params);

        const result = schema.safeParse(sanitized);
        if (!result.success) {
            const fieldErrors: FieldError[] = result.error.issues.map((issue) => ({
                field: issue.path.join(".") || "query",
                message: issue.message,
            }));
            throw new ValidationError(fieldErrors);
        }

        return handler(request, result.data, context);
    };
}
