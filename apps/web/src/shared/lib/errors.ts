/**
 * Enterprise Error Hierarchy
 * ─────────────────────────────────────────────────────────
 * Base error classes that all modules throw. These are PURE
 * TypeScript — no framework imports.
 *
 * Usage:
 *   throw new NotFoundError("Order", orderId);
 *   throw new ValidationError("name", "Name is required");
 *   throw new AuthorizationError("orders.delete");
 *
 * Catching:
 *   if (error instanceof AppError) {
 *     return envelope.error(error.message, error.statusCode, error.code);
 *   }
 */

// ─── Error Codes (exhaustive enum for type safety) ──────────────
export const ErrorCode = {
    // 4xx Client errors
    VALIDATION_FAILED: "VALIDATION_FAILED",
    NOT_FOUND: "NOT_FOUND",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    RATE_LIMITED: "RATE_LIMITED",
    CONFLICT: "CONFLICT",
    IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",

    // Business rule violations
    BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
    INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
    INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
    PAYMENT_REQUIRED: "PAYMENT_REQUIRED",

    // 5xx Server errors
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
    CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── Base Error ─────────────────────────────────────────────────
export class AppError extends Error {
    public readonly code: ErrorCodeType;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: string;

    constructor(
        message: string,
        code: ErrorCodeType,
        statusCode: number,
        details?: Record<string, unknown>,
        isOperational = true,
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        this.timestamp = new Date().toISOString();

        // Maintains proper stack trace for where error was thrown
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace?.(this, this.constructor);
    }

    /**
     * Serialize to a JSON-safe object for API responses.
     * Never includes stack traces in production.
     */
    toJSON(): Record<string, unknown> {
        return {
            error: this.message,
            code: this.code,
            statusCode: this.statusCode,
            ...(this.details && { details: this.details }),
            timestamp: this.timestamp,
        };
    }
}

// ─── Validation Error ───────────────────────────────────────────
export interface FieldError {
    field: string;
    message: string;
    received?: unknown;
}

export class ValidationError extends AppError {
    public readonly fieldErrors: FieldError[];

    constructor(fieldErrors: FieldError[] | string, field?: string) {
        const errors: FieldError[] =
            typeof fieldErrors === "string"
                ? [{ field: field || "unknown", message: fieldErrors }]
                : fieldErrors;

        const message =
            errors.length === 1
                ? errors[0].message
                : `Validation failed: ${errors.length} error(s)`;

        super(message, ErrorCode.VALIDATION_FAILED, 400, {
            fieldErrors: errors,
        });
        this.fieldErrors = errors;
    }
}

// ─── Not Found Error ────────────────────────────────────────────
export class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with ID '${identifier}' not found`
            : `${resource} not found`;
        super(message, ErrorCode.NOT_FOUND, 404, { resource, identifier });
    }
}

// ─── Already Exists Error ───────────────────────────────────────
export class AlreadyExistsError extends AppError {
    constructor(resource: string, field: string, value?: string) {
        const message = value
            ? `${resource} with ${field} '${value}' already exists`
            : `${resource} with this ${field} already exists`;
        super(message, ErrorCode.ALREADY_EXISTS, 409, { resource, field, value });
    }
}

// ─── Auth Errors ────────────────────────────────────────────────
export class AuthenticationError extends AppError {
    constructor(message = "Authentication required") {
        super(message, ErrorCode.UNAUTHORIZED, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(permission?: string) {
        const message = permission
            ? `Insufficient permissions: ${permission} required`
            : "You do not have permission to perform this action";
        super(message, ErrorCode.FORBIDDEN, 403, {
            requiredPermission: permission,
        });
    }
}

// ─── Rate Limit Error ───────────────────────────────────────────
export class RateLimitError extends AppError {
    public readonly retryAfterMs: number;

    constructor(retryAfterMs: number) {
        super("Too many requests. Please try again later.", ErrorCode.RATE_LIMITED, 429, {
            retryAfterMs,
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
        });
        this.retryAfterMs = retryAfterMs;
    }
}

// ─── Business Rule Violation ────────────────────────────────────
export class BusinessRuleError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.BUSINESS_RULE_VIOLATION, 422, details);
    }
}

export class InsufficientStockError extends BusinessRuleError {
    constructor(itemName: string, requested: number, available: number) {
        super(`Insufficient stock for ${itemName}: requested ${requested}, available ${available}`, {
            code: ErrorCode.INSUFFICIENT_STOCK,
            itemName,
            requested,
            available,
        });
    }
}

export class InvalidStateTransitionError extends BusinessRuleError {
    constructor(resource: string, fromState: string, toState: string) {
        super(`Cannot transition ${resource} from '${fromState}' to '${toState}'`, {
            code: ErrorCode.INVALID_STATE_TRANSITION,
            resource,
            fromState,
            toState,
        });
    }
}

// ─── Conflict Error ─────────────────────────────────────────────
export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.CONFLICT, 409, details);
    }
}

// ─── Infrastructure Errors ──────────────────────────────────────
export class DatabaseError extends AppError {
    constructor(message: string, cause?: unknown) {
        super(message, ErrorCode.DATABASE_ERROR, 500, { cause: String(cause) }, false);
    }
}

export class ExternalServiceError extends AppError {
    constructor(serviceName: string, message: string, cause?: unknown) {
        super(
            `External service '${serviceName}' failed: ${message}`,
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            502,
            { serviceName, cause: String(cause) },
            false,
        );
    }
}

export class ConfigurationError extends AppError {
    constructor(variable: string) {
        super(
            `Missing or invalid configuration: ${variable}`,
            ErrorCode.CONFIGURATION_ERROR,
            500,
            { variable },
            false,
        );
    }
}

// ─── Type Guards ────────────────────────────────────────────────
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
    return isAppError(error) && error.isOperational;
}
