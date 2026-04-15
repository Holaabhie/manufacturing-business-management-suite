/**
 * API Response Envelope
 * ─────────────────────────────────────────────────────────
 * Standardized wrapper for ALL API responses. Every response
 * from the platform follows this shape, making client-side
 * parsing predictable and error handling consistent.
 *
 * Success: { success: true, data: T, meta: {...} }
 * Error:   { success: false, error: { message, code, details? } }
 *
 * Usage in API routes:
 *   return envelope.ok(data, { page: 1, total: 100 });
 *   return envelope.created(newOrder);
 *   return envelope.error("Not found", 404, "NOT_FOUND");
 *   return envelope.fromAppError(appError);
 */

import { NextResponse } from "next/server";
import { AppError, isAppError, type ErrorCodeType } from "@/shared/lib/errors";

// ─── Response Types ─────────────────────────────────────────────

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ApiMeta {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
    /** Informational warnings (e.g., deprecation notices) */
    warnings?: string[];
    [key: string]: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    meta: ApiMeta;
}

export interface ApiErrorDetail {
    message: string;
    code: ErrorCodeType | string;
    details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
    success: false;
    error: ApiErrorDetail;
    meta: ApiMeta;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Helper: Build base meta ────────────────────────────────────

function baseMeta(extra?: Partial<ApiMeta>): ApiMeta {
    return {
        timestamp: new Date().toISOString(),
        ...extra,
    };
}

// ─── Envelope Factory ───────────────────────────────────────────

export const envelope = {
    /**
     * 200 OK with data.
     */
    ok<T>(data: T, meta?: Partial<ApiMeta>): NextResponse<ApiSuccessResponse<T>> {
        return NextResponse.json(
            { success: true, data, meta: baseMeta(meta) } satisfies ApiSuccessResponse<T>,
            { status: 200 },
        );
    },

    /**
     * 201 Created with data.
     */
    created<T>(data: T, meta?: Partial<ApiMeta>): NextResponse<ApiSuccessResponse<T>> {
        return NextResponse.json(
            { success: true, data, meta: baseMeta(meta) } satisfies ApiSuccessResponse<T>,
            { status: 201 },
        );
    },

    /**
     * 204 No Content (e.g., successful DELETE).
     */
    noContent(): NextResponse {
        return new NextResponse(null, { status: 204 });
    },

    /**
     * Paginated list response.
     */
    list<T>(
        data: T[],
        pagination: { page: number; pageSize: number; total: number },
        meta?: Partial<ApiMeta>,
    ): NextResponse<ApiSuccessResponse<T[]>> {
        const totalPages = Math.ceil(pagination.total / pagination.pageSize);
        return NextResponse.json(
            {
                success: true,
                data,
                meta: baseMeta({
                    ...meta,
                    pagination: {
                        page: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        totalPages,
                        hasNextPage: pagination.page < totalPages,
                        hasPreviousPage: pagination.page > 1,
                    },
                }),
            } satisfies ApiSuccessResponse<T[]>,
            { status: 200 },
        );
    },

    /**
     * Generic error response.
     */
    error(
        message: string,
        statusCode = 500,
        code: ErrorCodeType | string = "INTERNAL_ERROR",
        details?: Record<string, unknown>,
    ): NextResponse<ApiErrorResponse> {
        return NextResponse.json(
            {
                success: false,
                error: { message, code, ...(details && { details }) },
                meta: baseMeta(),
            } satisfies ApiErrorResponse,
            { status: statusCode },
        );
    },

    /**
     * Build error response from an AppError instance.
     */
    fromAppError(err: AppError): NextResponse<ApiErrorResponse> {
        const headers: Record<string, string> = {};

        // Add Retry-After for rate limit errors
        if (err.statusCode === 429 && err.details?.retryAfterSec) {
            headers["Retry-After"] = String(err.details.retryAfterSec);
            headers["X-RateLimit-Remaining"] = "0";
        }

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: err.message,
                    code: err.code,
                    ...(err.details && { details: err.details }),
                },
                meta: baseMeta(),
            } satisfies ApiErrorResponse,
            { status: err.statusCode, headers },
        );
    },

    /**
     * Catch-all handler: determines response from unknown error.
     * - If it's an AppError → structured response.
     * - Otherwise → generic 500 (details hidden in production).
     */
    fromUnknown(error: unknown): NextResponse<ApiErrorResponse> {
        if (isAppError(error)) {
            return envelope.fromAppError(error);
        }

        const isDev = process.env.NODE_ENV !== "production";
        const message = isDev && error instanceof Error ? error.message : "An unexpected error occurred";

        return envelope.error(message, 500, "INTERNAL_ERROR");
    },
};
