/**
 * Retry with Exponential Backoff
 * ─────────────────────────────────────────────────────────
 * Automatically retries failed async operations with
 * exponentially increasing delays and jitter.
 *
 * Usage:
 *   const data = await withRetry(
 *     () => fetchExternalApi("/data"),
 *     { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10_000 }
 *   );
 */

interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    retryOn?: (error: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10_000,
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
): Promise<T> {
    const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: unknown;

    for (let attempt = 0; attempt <= resolvedConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === resolvedConfig.maxRetries) break;
            if (resolvedConfig.retryOn && !resolvedConfig.retryOn(error)) break;

            const delay = Math.min(
                resolvedConfig.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
                resolvedConfig.maxDelayMs,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
