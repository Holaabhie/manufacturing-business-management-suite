/**
 * Timeout Guard
 * ─────────────────────────────────────────────────────────
 * Wraps an async operation with a timeout. If the operation
 * does not complete within the specified time, a TimeoutError
 * is thrown.
 *
 * Usage:
 *   const data = await withTimeout(
 *     () => longRunningQuery(),
 *     5000,
 *     "database-query"
 *   );
 */

export class TimeoutError extends Error {
    constructor(operationName: string, timeoutMs: number) {
        super(`Operation "${operationName}" timed out after ${timeoutMs}ms`);
        this.name = "TimeoutError";
    }
}

export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    operationName: string = "unknown",
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new TimeoutError(operationName, timeoutMs)),
                timeoutMs,
            ),
        ),
    ]);
}
