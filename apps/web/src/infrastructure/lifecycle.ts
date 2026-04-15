/**
 * Lifecycle Manager
 * ─────────────────────────────────────────────────────────
 * Manages graceful shutdown, signal handling, and unhandled
 * error capture. Ensures database connections are properly
 * closed and in-flight work completes before process exit.
 *
 * Usage:
 *   import { lifecycle } from "@/infrastructure/lifecycle";
 *   lifecycle.init();
 */

import { lifecycleLogger } from "./logging/logger";

type ShutdownHandler = () => Promise<void>;

class LifecycleManager {
    private handlers: ShutdownHandler[] = [];
    private isShuttingDown = false;

    registerShutdownHandler(handler: ShutdownHandler): void {
        this.handlers.push(handler);
    }

    async shutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        lifecycleLogger.info("Shutdown initiated", { signal });

        const timeout = setTimeout(() => {
            lifecycleLogger.error("Forced shutdown — handlers did not complete in time");
            process.exit(1);
        }, 30_000);

        for (const handler of this.handlers.reverse()) {
            try {
                await handler();
            } catch (error) {
                lifecycleLogger.error("Shutdown handler failed", {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        clearTimeout(timeout);
        lifecycleLogger.info("Shutdown complete");
        process.exit(0);
    }

    init(): void {
        // Database disconnect
        this.registerShutdownHandler(async () => {
            lifecycleLogger.info("Closing database connections");
            try {
                const mongoose = await import("mongoose");
                if (mongoose.connection.readyState === 1) {
                    await mongoose.connection.close();
                }
            } catch {
                // MongoDB may not be connected
            }
        });

        // Register signal handlers
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGINT", () => this.shutdown("SIGINT"));

        // Unhandled errors
        process.on("unhandledRejection", (reason) => {
            lifecycleLogger.error("Unhandled rejection", {
                error: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
            });
        });

        process.on("uncaughtException", (error) => {
            lifecycleLogger.error("Uncaught exception", {
                error: error.message,
                stack: error.stack,
            });
            this.shutdown("uncaughtException");
        });

        lifecycleLogger.info("Lifecycle manager initialized");
    }
}

export const lifecycle = new LifecycleManager();
