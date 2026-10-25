"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 2 * 60 * 1000, // 2 min: fresh enough for operational tables without thrashing
                        gcTime: 30 * 60 * 1000, // 30 min: keep unmounted caches for quick back-navigation
                        refetchOnWindowFocus: false, // deliberate: avoid scroll jumps or form interruptions when staff switch tabs
                        retry: (failureCount, error) => {
                            // Only retry network errors or 5xx server errors, never 4xx client errors
                            if (error instanceof ApiError && error.isClientError) {
                                return false;
                            }
                            return failureCount < 2;
                        },
                    },
                    mutations: {
                        retry: false, // mutations must not auto-retry to prevent double inserts/deductions
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
