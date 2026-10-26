import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

/**
 * Creates a configured QueryClient instance with robust defaults:
 * - 2 min default staleTime for operational data
 * - 30 min gcTime for smooth back-navigation
 * - Window focus refetch disabled to prevent layout/form interruptions
 * - 4xx client errors are never retried; 5xx/network errors retry up to 2 times
 * - Mutations never auto-retry to prevent duplicate transactions
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.isClientError) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let sharedQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  // On server (SSR) outside tests, create a fresh client per request
  if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
    return createQueryClient();
  }
  // In browser or test environment, maintain singleton
  if (!sharedQueryClient) {
    sharedQueryClient = createQueryClient();
  }
  return sharedQueryClient;
}

/**
 * Completely purges all cached queries and mutations.
 * Critical for multi-tenant and multi-user isolation on:
 * 1. User logout
 * 2. New session login
 * 3. Switch account
 */
export function clearAppQueryCache(): void {
  if (sharedQueryClient) {
    sharedQueryClient.clear();
  }
}
