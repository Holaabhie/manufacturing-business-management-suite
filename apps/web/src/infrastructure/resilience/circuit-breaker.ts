/**
 * Circuit Breaker Pattern
 * ─────────────────────────────────────────────────────────
 * Prevents cascading failures by stopping calls to a failing
 * service. Transitions: CLOSED → OPEN → HALF_OPEN → CLOSED.
 *
 * Usage:
 *   const breaker = new CircuitBreaker("payment-api", {
 *     failureThreshold: 5,
 *     resetTimeoutMs: 30_000,
 *     halfOpenMaxAttempts: 3,
 *   });
 *
 *   const result = await breaker.execute(() => paymentApi.charge(amount));
 */

import { logger } from "../logging/logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
    failureThreshold: number;     // failures before opening
    resetTimeoutMs: number;       // time before trying half-open
    halfOpenMaxAttempts: number;  // max half-open attempts before re-opening
}

export class CircuitBreaker {
    private state: CircuitState = "CLOSED";
    private failureCount = 0;
    private lastFailureTime = 0;
    private halfOpenAttempts = 0;

    constructor(
        private readonly name: string,
        private readonly config: CircuitBreakerConfig = {
            failureThreshold: 5,
            resetTimeoutMs: 30_000,
            halfOpenMaxAttempts: 3,
        },
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
                this.state = "HALF_OPEN";
                this.halfOpenAttempts = 0;
                logger.info("Circuit breaker transitioning to HALF_OPEN", { breaker: this.name });
            } else {
                throw new Error(`Circuit breaker [${this.name}] is OPEN`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failureCount = 0;
        if (this.state === "HALF_OPEN") {
            this.state = "CLOSED";
            logger.info("Circuit breaker recovered to CLOSED", { breaker: this.name });
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === "HALF_OPEN") {
            this.halfOpenAttempts++;
            if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
                this.state = "OPEN";
                logger.warn("Circuit breaker re-opened from HALF_OPEN", {
                    breaker: this.name,
                    failures: this.failureCount,
                });
            }
        } else if (this.failureCount >= this.config.failureThreshold) {
            this.state = "OPEN";
            logger.warn("Circuit breaker opened", {
                breaker: this.name,
                failures: this.failureCount,
            });
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    reset(): void {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
    }
}
