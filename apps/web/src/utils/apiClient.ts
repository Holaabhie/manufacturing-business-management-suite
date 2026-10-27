/**
 * API Client Compatibility Re-export
 * ───────────────────────────────────────────────────────────
 * Canonical implementation has been unified into `@/lib/api-client`.
 * This file re-exports the unified fetch-based client with duplicate request
 * suppression, idempotency key injection, and 401 redirect safety.
 */

import { apiClient, generateUUID, ApiError } from "@/lib/api-client";

// Adapter to support legacy Axios-style callers returning { data } envelope
const compatApiClient = {
  ...apiClient,
  async post<T = unknown>(url: string, body?: unknown, options?: Parameters<typeof apiClient.post>[2]): Promise<{ data: T }> {
    const data = await apiClient.post<T>(url, body, options);
    return { data };
  },
  async get<T = unknown>(url: string, options?: Parameters<typeof apiClient.get>[1]): Promise<{ data: T }> {
    const data = await apiClient.get<T>(url, options);
    return { data };
  },
  async put<T = unknown>(url: string, body?: unknown, options?: Parameters<typeof apiClient.put>[2]): Promise<{ data: T }> {
    const data = await apiClient.put<T>(url, body, options);
    return { data };
  },
  async patch<T = unknown>(url: string, body?: unknown, options?: Parameters<typeof apiClient.patch>[2]): Promise<{ data: T }> {
    const data = await apiClient.patch<T>(url, body, options);
    return { data };
  },
  async delete<T = unknown>(url: string, options?: Parameters<typeof apiClient.delete>[1]): Promise<{ data: T }> {
    const data = await apiClient.delete<T>(url, options);
    return { data };
  },
};

export { generateUUID, apiClient, ApiError };
export default compatApiClient;
