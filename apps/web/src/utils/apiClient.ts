/**
 * API Client — Axios Setup with Anti-Duplicate Interceptors
 * ───────────────────────────────────────────────────────────
 * Production-grade Axios instance with:
 *   1. Automatic duplicate request blocking (same URL + payload within 2s)
 *   2. Idempotency-Key header injection for mutating requests
 *   3. Request timeout handling
 *   4. Auth token management (httpOnly cookie — automatic)
 *   5. Centralized error handling
 *
 * Usage:
 *   import api from "@/utils/apiClient";
 *   const res = await api.post("/api/billing", data);
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ── Configuration ─────────────────────────────────────────
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";
const REQUEST_TIMEOUT = 30_000; // 30 seconds
const DUPLICATE_WINDOW_MS = 2_000; // Block identical requests within 2s

// ── Create Axios Instance ─────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    withCredentials: true, // Send httpOnly cookies automatically
    headers: {
        "Content-Type": "application/json",
    },
});

// ═══════════════════════════════════════════════════════════
// 1. DUPLICATE REQUEST INTERCEPTOR
// ═══════════════════════════════════════════════════════════

interface PendingRequest {
    timestamp: number;
    controller: AbortController;
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Generate a unique fingerprint for a request.
 * Uses: method + url + sorted body hash
 */
function getRequestFingerprint(config: InternalAxiosRequestConfig): string {
    const method = (config.method || "get").toUpperCase();
    const url = config.url || "";
    let bodyKey = "";

    if (config.data) {
        try {
            bodyKey = typeof config.data === "string"
                ? config.data
                : JSON.stringify(config.data, Object.keys(config.data).sort());
        } catch {
            bodyKey = String(config.data);
        }
    }

    return `${method}:${url}:${bodyKey}`;
}

/**
 * Generate a UUID v4 for idempotency keys.
 */
function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ── Request Interceptor ───────────────────────────────────
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const method = (config.method || "get").toUpperCase();

        // Only block duplicates for mutating requests
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const fingerprint = getRequestFingerprint(config);
            const existing = pendingRequests.get(fingerprint);
            const now = Date.now();

            if (existing && now - existing.timestamp < DUPLICATE_WINDOW_MS) {
                // ⛔ Duplicate request within the window — cancel it
                console.warn(
                    `[apiClient] Duplicate request blocked: ${method} ${config.url} (within ${DUPLICATE_WINDOW_MS}ms)`
                );

                const controller = new AbortController();
                controller.abort(new Error("Duplicate request blocked"));
                config.signal = controller.signal;

                return config;
            }

            // Track this request
            const controller = new AbortController();
            config.signal = config.signal || controller.signal;
            pendingRequests.set(fingerprint, { timestamp: now, controller });

            // Auto-inject Idempotency-Key for POST/PUT/PATCH
            if (["POST", "PUT", "PATCH"].includes(method)) {
                if (!config.headers.get("Idempotency-Key")) {
                    config.headers.set("Idempotency-Key", generateUUID());
                }
            }

            // Clean up old entries periodically
            if (pendingRequests.size > 50) {
                for (const [key, entry] of pendingRequests) {
                    if (now - entry.timestamp > DUPLICATE_WINDOW_MS * 5) {
                        pendingRequests.delete(key);
                    }
                }
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────
api.interceptors.response.use(
    (response) => {
        // Clean up request tracking on success
        const config = response.config;
        const fingerprint = getRequestFingerprint(config);
        pendingRequests.delete(fingerprint);

        // Log idempotency cache hits
        if (response.data?._idempotent) {
            console.info("[apiClient] Response was served from idempotency cache");
        }

        return response;
    },
    (error: AxiosError) => {
        // Clean up request tracking on error
        if (error.config) {
            const fingerprint = getRequestFingerprint(error.config);
            pendingRequests.delete(fingerprint);
        }

        // Don't treat cancelled duplicates as real errors
        if (axios.isCancel(error) || error.message === "Duplicate request blocked") {
            return Promise.reject({
                isDuplicate: true,
                message: "This request was already submitted. Please wait.",
            });
        }

        // Enhance error messages for common status codes
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            switch (status) {
                case 401:
                    // Redirect to login on auth failure
                    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                        window.location.href = "/login?reason=session_expired";
                    }
                    break;
                case 409:
                    console.warn("[apiClient] Duplicate/conflict:", data?.message || data?.error);
                    break;
                case 429:
                    console.warn("[apiClient] Rate limited — retrying later");
                    break;
            }
        }

        return Promise.reject(error);
    }
);

// ═══════════════════════════════════════════════════════════
// 2. HELPER METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Make a POST request with a specific idempotency key.
 * Use this when you want to control the key yourself
 * (e.g., derived from form data or a transaction ID).
 */
api.postIdempotent = function (url: string, data: unknown, idempotencyKey: string) {
    return this.post(url, data, {
        headers: { "Idempotency-Key": idempotencyKey },
    });
};

// Type augmentation
declare module "axios" {
    interface AxiosInstance {
        postIdempotent: (url: string, data: unknown, idempotencyKey: string) => Promise<any>;
    }
}

export { generateUUID };
export default api;
