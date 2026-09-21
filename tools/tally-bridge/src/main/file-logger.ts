/**
 * Rotating File Logger
 * ─────────────────────────────────────────────────────────
 * File log at <userData>/logs/bridge.log.
 * Rotate at 5 MB keeping 1 backup (bridge.log.1).
 * Rule: NEVER log the token, pairing code, or requestXml contents.
 * Log only ids, job type, status, HTTP status codes, and error codes.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Logger } from "../core/types";

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB

export class FileLogger implements Logger {
    private logDir: string;
    private logFile: string;
    private backupFile: string;

    constructor(userDataPath: string) {
        this.logDir = path.join(userDataPath, "logs");
        this.logFile = path.join(this.logDir, "bridge.log");
        this.backupFile = path.join(this.logDir, "bridge.log.1");
        this.ensureDirectory();
    }

    private ensureDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private rotateIfNeeded() {
        try {
            if (!fs.existsSync(this.logFile)) return;
            const stats = fs.statSync(this.logFile);
            if (stats.size >= MAX_LOG_SIZE) {
                if (fs.existsSync(this.backupFile)) {
                    fs.unlinkSync(this.backupFile);
                }
                fs.renameSync(this.logFile, this.backupFile);
            }
        } catch {
            // Non-fatal error during rotation
        }
    }

    private sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
        if (!meta) return undefined;
        const sanitized: Record<string, unknown> = {};

        const FORBIDDEN_KEYS = new Set([
            "token",
            "bearertoken",
            "tokenhash",
            "code",
            "codehash",
            "pairingcode",
            "rawcode",
            "requestxml",
            "xml",
            "authorization",
        ]);

        for (const [key, value] of Object.entries(meta)) {
            const lowerKey = key.toLowerCase();
            if (FORBIDDEN_KEYS.has(lowerKey)) {
                sanitized[key] = "[REDACTED]";
            } else if (typeof value === "string" && (value.startsWith("tbr_") || value.includes("<ENVELOPE>"))) {
                sanitized[key] = "[REDACTED]";
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    private write(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>) {
        this.rotateIfNeeded();
        const timestamp = new Date().toISOString();
        const cleanMeta = this.sanitizeMeta(meta);
        const metaStr = cleanMeta ? ` ${JSON.stringify(cleanMeta)}` : "";
        const line = `[${timestamp}] [${level}] ${message}${metaStr}\n`;

        try {
            fs.appendFileSync(this.logFile, line, "utf-8");
        } catch {
            // Ignore file write errors
        }

        // Also output clean line to stdout/stderr in dev
        if (level === "ERROR") {
            console.error(line.trim());
        } else if (level === "WARN") {
            console.warn(line.trim());
        } else {
            console.log(line.trim());
        }
    }

    info(message: string, meta?: Record<string, unknown>) {
        this.write("INFO", message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>) {
        this.write("WARN", message, meta);
    }

    error(message: string, meta?: Record<string, unknown>) {
        this.write("ERROR", message, meta);
    }

    getLogDir(): string {
        return this.logDir;
    }
}
