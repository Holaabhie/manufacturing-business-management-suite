import { NextResponse } from "next/server";

export function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => {
            setTimeout(() => {
                console.warn(`⏳ API Query Timeout (${ms}ms). Returning fallback value.`);
                resolve(fallbackValue);
            }, ms);
        })
    ]);
}

/**
 * Standardized API Error Response
 */
export function createErrorResponse(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR"
) {
    return NextResponse.json(
        {
            error: {
                message,
                code,
                timestamp: new Date().toISOString()
            }
        },
        { status: statusCode }
    );
}

/**
 * Executes a promise and gracefully falls back to a default value if it fails.
 */
export async function withGracefulDegradation<T>(
    promise: Promise<T>,
    fallbackValue: T,
    queryName: string = "Query"
): Promise<T> {
    try {
        return await promise;
    } catch (err) {
        console.error(`⚠️ Graceful Degradation - ${queryName} failed:`, err instanceof Error ? err.message : String(err));
        return fallbackValue;
    }
}
