/**
 * Structured Logger
 * ─────────────────────────────────────────────────────────
 * Replaces raw console.log/error with structured, leveled logging.
 * Outputs JSON in production (for log aggregators like DataDog,
 * CloudWatch, ELK) and human-readable format in development.
 *
 * Usage:
 *   import { logger } from "@/infrastructure/logging/logger";
 *
 *   logger.info("Order created", { orderId, userId });
 *   logger.warn("Low stock detected", { itemName, quantity });
 *   logger.error("Payment failed", { error, stripeId });
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    module?: string;
    correlationId?: string;
    requestId?: string;
    userId?: string;
    duration?: number;
    [key: string]: unknown;
}

class Logger {
    private minLevel: LogLevel;
    private isProduction: boolean;

    constructor(level?: LogLevel) {
        this.isProduction = process.env.NODE_ENV === "production";
        this.minLevel =
            level ??
            (process.env.LOG_LEVEL as LogLevel) ??
            (this.isProduction ? "info" : "debug");
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private formatEntry(entry: LogEntry): string {
        if (this.isProduction) {
            // JSON format for log aggregators
            return JSON.stringify(entry);
        }

        // Human-readable format for development
        const levelColors: Record<LogLevel, string> = {
            debug: "\x1b[36m",  // cyan
            info: "\x1b[32m",   // green
            warn: "\x1b[33m",   // yellow
            error: "\x1b[31m",  // red
            fatal: "\x1b[35m",  // magenta
        };
        const reset = "\x1b[0m";
        const color = levelColors[entry.level];
        const time = new Date(entry.timestamp).toLocaleTimeString();

        const prefix = entry.module ? `[${entry.module}]` : "";
        const meta = Object.entries(entry)
            .filter(
                ([key]) =>
                    !["level", "message", "timestamp", "module"].includes(key),
            )
            .map(([key, value]) => {
                if (value instanceof Error) return `${key}=${value.message}`;
                if (typeof value === "object") return `${key}=${JSON.stringify(value)}`;
                return `${key}=${value}`;
            })
            .join(" ");

        return `${color}${entry.level.toUpperCase().padEnd(5)}${reset} ${time} ${prefix} ${entry.message}${meta ? ` | ${meta}` : ""}`;
    }

    private log(
        level: LogLevel,
        message: string,
        context?: Record<string, unknown>,
    ): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...context,
        };

        const formatted = this.formatEntry(entry);

        switch (level) {
            case "debug":
            case "info":
                console.log(formatted);
                break;
            case "warn":
                console.warn(formatted);
                break;
            case "error":
            case "fatal":
                console.error(formatted);
                break;
        }
    }

    /**
     * Create a child logger with a fixed module name.
     */
    child(module: string): ChildLogger {
        return new ChildLogger(this, module);
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.log("debug", message, context);
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log("info", message, context);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log("warn", message, context);
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.log("error", message, context);
    }

    fatal(message: string, context?: Record<string, unknown>): void {
        this.log("fatal", message, context);
    }
}

class ChildLogger {
    constructor(
        private readonly parent: Logger,
        private readonly module: string,
    ) { }

    debug(message: string, context?: Record<string, unknown>): void {
        this.parent.debug(message, { module: this.module, ...context });
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.parent.info(message, { module: this.module, ...context });
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.parent.warn(message, { module: this.module, ...context });
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.parent.error(message, { module: this.module, ...context });
    }

    fatal(message: string, context?: Record<string, unknown>): void {
        this.parent.fatal(message, { module: this.module, ...context });
    }
}

// ─── Singleton ──────────────────────────────────────────────────
export const logger = new Logger();

// ─── Pre-configured module loggers ──────────────────────────────
export const authLogger = logger.child("auth");
export const inventoryLogger = logger.child("inventory");
export const ordersLogger = logger.child("orders");
export const billingLogger = logger.child("billing");
export const productionLogger = logger.child("production");
export const apiLogger = logger.child("api");
export const twilioLogger = logger.child("twilio");
export const lifecycleLogger = logger.child("lifecycle");
