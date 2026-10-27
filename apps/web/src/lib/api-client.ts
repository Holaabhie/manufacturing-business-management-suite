/**
 * Typed API Client Fetch Wrapper
 * ───────────────────────────────────────────────────────────
 * Standardized HTTP client for all frontend API communications.
 *
 * Features:
 * - JSON serialization / parsing with safe empty body handling
 * - Standardized error class: ApiError with status, code, details
 * - 401 redirection to /login on client-side
 * - 403, 404, and 429 (Retry-After) special handling
 * - AbortSignal support for request cancellation
 * - Zero `any` types
 */

export interface ApiErrorPayload {
  message: string;
  code?: string;
  status: number;
  details?: unknown;
  retryAfter?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly retryAfter?: number;

  constructor(payload: ApiErrorPayload) {
    super(payload.message || `HTTP Error ${payload.status}`);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
    this.retryAfter = payload.retryAfter;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  skipAuthRedirect?: boolean;
}

function buildUrl(url: string, params?: RequestOptions["params"]): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  if (!query) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${query}`;
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as (T & undefined);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text as (T & string);
  }

  try {
    const data: T = await response.json();
    return data;
  } catch {
    return undefined as (T & undefined);
  }
}

const EXEMPT_REDIRECT_PAGES = [
  "/login",
  "/admin/login",
  "/staff/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/setup",
  "/staff/setup",
  "/access-denied",
];

import { generateId } from "@/lib/uuid";

export const generateUUID = generateId;

const DUPLICATE_WINDOW_MS = 2000;
interface PendingRequestEntry {
  timestamp: number;
}
const pendingRequests = new Map<string, PendingRequestEntry>();

function getRequestFingerprint(method: string, url: string, body?: unknown): string {
  let bodyKey = "";
  if (body !== undefined) {
    if (typeof body === "string") {
      bodyKey = body;
    } else {
      try {
        bodyKey = JSON.stringify(body);
      } catch {
        bodyKey = String(body);
      }
    }
  }
  return `${method.toUpperCase()}:${url}:${bodyKey}`;
}

export function isExemptFromAuthRedirect(pathname: string): boolean {
  return EXEMPT_REDIRECT_PAGES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAuthApiEndpoint(url: string): boolean {
  return url.startsWith("/api/auth/") || url.startsWith("/api/auth?") || url === "/api/auth";
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers, skipAuthRedirect, method = "GET", ...fetchOptions } = options;
  const upperMethod = method.toUpperCase();
  const finalUrl = buildUrl(url, params);

  let fingerprint: string | undefined;

  // Anti-duplicate protection for mutating requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
    fingerprint = getRequestFingerprint(upperMethod, finalUrl, body);
    const existing = pendingRequests.get(fingerprint);
    const now = Date.now();

    if (existing && now - existing.timestamp < DUPLICATE_WINDOW_MS) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[apiClient] Duplicate request blocked: ${upperMethod} ${finalUrl}`);
      }
      throw new ApiError({
        message: "Duplicate request blocked. Please wait.",
        status: 409,
        code: "DUPLICATE_BLOCKED",
      });
    }

    pendingRequests.set(fingerprint, { timestamp: now });

    // Periodically prune stale entries
    if (pendingRequests.size > 50) {
      for (const [key, entry] of pendingRequests) {
        if (now - entry.timestamp > DUPLICATE_WINDOW_MS * 5) {
          pendingRequests.delete(key);
        }
      }
    }
  }

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Auto-inject Idempotency-Key for POST, PUT, PATCH if not provided
  if (["POST", "PUT", "PATCH"].includes(upperMethod) && !requestHeaders.has("Idempotency-Key")) {
    requestHeaders.set("Idempotency-Key", generateId());
  }

  // Double-submit CSRF cookie reading if in browser and not already provided
  if (typeof document !== "undefined" && !requestHeaders.has("x-csrf-token")) {
    const match = document.cookie.split("; ").find((row) => row.startsWith("csrf_token="));
    if (match) {
      const token = match.split("=")[1];
      if (token) requestHeaders.set("x-csrf-token", decodeURIComponent(token));
    }
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === "string" || body instanceof Blob) {
      requestBody = body as BodyInit;
    } else {
      requestBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(finalUrl, {
      ...fetchOptions,
      method: upperMethod,
      headers: requestHeaders,
      body: requestBody,
      credentials: fetchOptions.credentials || "same-origin",
    });
  } catch (networkError: unknown) {
    if (fingerprint) pendingRequests.delete(fingerprint);
    const message = networkError instanceof Error ? networkError.message : "Network request failed";
    throw new ApiError({
      message,
      status: 0,
      code: "NETWORK_ERROR",
      details: networkError,
    });
  }

  // Once response is received from server, clean up in-flight tracking
  if (fingerprint) pendingRequests.delete(fingerprint);

  if (!response.ok) {
    const status = response.status;
    let errorMessage = `Request failed with status ${status}`;
    let errorCode: string | undefined;
    let errorDetails: unknown = undefined;

    try {
      const errorData = await parseResponseBody<Record<string, unknown>>(response);
      if (errorData && typeof errorData === "object") {
        const potentialMsg =
          (typeof errorData.message === "string" && errorData.message) ||
          (typeof errorData.error === "string" && errorData.error) ||
          (typeof (errorData.error as Record<string, unknown>)?.message === "string" &&
            (errorData.error as Record<string, unknown>).message);

        if (potentialMsg) {
          errorMessage = potentialMsg as string;
        }

        if (typeof errorData.code === "string") {
          errorCode = errorData.code;
        }

        errorDetails = errorData.details ?? errorData;
      }
    } catch {
      // Ignored if non-parseable
    }

    let retryAfterSeconds: number | undefined;
    if (status === 429) {
      const retryHeader = response.headers.get("Retry-After");
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed)) {
          retryAfterSeconds = parsed;
        }
      }
    }

    if (status === 401 && !skipAuthRedirect && !isAuthApiEndpoint(url) && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!isExemptFromAuthRedirect(currentPath)) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }

    throw new ApiError({
      message: errorMessage,
      code: errorCode,
      status,
      details: errorDetails,
      retryAfter: retryAfterSeconds,
    });
  }

  return parseResponseBody<T>(response);
}

export const apiClient = {
  get<T>(url: string, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    return request<T>(url, { ...options, method: "GET" });
  },

  post<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    return request<T>(url, { ...options, method: "POST", body });
  },

  put<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    return request<T>(url, { ...options, method: "PUT", body });
  },

  patch<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    return request<T>(url, { ...options, method: "PATCH", body });
  },

  delete<T>(url: string, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    return request<T>(url, { ...options, method: "DELETE" });
  },

  postIdempotent<T>(url: string, body: unknown, idempotencyKey: string, options?: Omit<RequestOptions, "body" | "method">): Promise<T> {
    const headers = new Headers(options?.headers);
    headers.set("Idempotency-Key", idempotencyKey);
    return request<T>(url, { ...options, method: "POST", body, headers });
  },

  request,
};

export default apiClient;
