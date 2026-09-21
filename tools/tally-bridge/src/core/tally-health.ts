/**
 * Local Tally Health Checker
 * ─────────────────────────────────────────────────────────
 * Rule: Before each poll, GET http://{tallyHost}:{tallyPort}/
 * with a 3-second timeout.
 * reachable = HTTP 200 received.
 * lastError = short sanitized text (e.g. "ECONNREFUSED", "TIMEOUT").
 * No XML is sent in this phase. Do not implement company list fetching.
 */

import { TallyHealth } from "./types";

export interface CheckTallyOptions {
    host?: string;
    port?: number;
    activeCompany?: string;
    timeoutMs?: number; // default 3000ms
}

export async function checkTallyHealth(options: CheckTallyOptions = {}): Promise<TallyHealth> {
    const host = options.host || "localhost";
    const port = options.port || 9000;
    const timeoutMs = options.timeoutMs ?? 3000;
    const url = `http://${host}:${port}/`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                method: "GET",
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (res.status === 200) {
                return {
                    reachable: true,
                    host,
                    port,
                    companies: [],
                    activeCompany: options.activeCompany || null,
                    lastError: null,
                };
            }

            return {
                reachable: false,
                host,
                port,
                companies: [],
                activeCompany: options.activeCompany || null,
                lastError: `HTTP_${res.status}`,
            };
        } catch (err: any) {
            clearTimeout(timer);
            throw err;
        }
    } catch (err: any) {
        let lastError = "UNKNOWN_ERROR";

        if (err?.name === "AbortError" || err?.name === "TimeoutError") {
            lastError = "TIMEOUT";
        } else if (err?.cause?.code) {
            lastError = String(err.cause.code);
        } else if (err?.code) {
            lastError = String(err.code);
        } else if (typeof err?.message === "string") {
            if (err.message.includes("ECONNREFUSED")) lastError = "ECONNREFUSED";
            else if (err.message.includes("timeout")) lastError = "TIMEOUT";
            else lastError = err.message.slice(0, 30);
        }

        return {
            reachable: false,
            host,
            port,
            companies: [],
            activeCompany: options.activeCompany || null,
            lastError,
        };
    }
}
