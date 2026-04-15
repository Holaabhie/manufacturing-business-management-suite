"use client";

/**
 * useCsrf — React hook to manage CSRF token for API requests.
 *
 * Reads the CSRF token from the cookie set by the server
 * and provides a `csrfFetch` wrapper that automatically includes
 * the X-CSRF-Token header on all state-changing requests.
 *
 * Usage:
 *   const { csrfFetch } = useCsrf();
 *   const res = await csrfFetch("/api/orders", {
 *     method: "POST",
 *     body: JSON.stringify(data),
 *   });
 */

import { useCallback, useEffect, useState } from "react";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function getCsrfTokenFromCookie(): string | null {
    if (typeof document === "undefined") return null;

    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

    return match ? match.split("=")[1] || null : null;
}

export function useCsrf() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Read token from cookie on mount
        const t = getCsrfTokenFromCookie();
        setToken(t);

        // If no token exists, trigger an API call to generate one
        if (!t) {
            fetch("/api/auth/csrf", { method: "GET", credentials: "include" })
                .then(() => {
                    const newToken = getCsrfTokenFromCookie();
                    setToken(newToken);
                })
                .catch(() => {
                    // Non-critical — will be generated on next server request
                });
        }
    }, []);

    /**
     * Fetch wrapper that automatically includes CSRF token.
     */
    const csrfFetch = useCallback(
        async (url: string, options?: RequestInit): Promise<Response> => {
            const csrfToken = getCsrfTokenFromCookie() || token;
            const headers = new Headers(options?.headers);

            if (csrfToken) {
                headers.set(CSRF_HEADER_NAME, csrfToken);
            }

            // Always include credentials for cookie-based auth
            return fetch(url, {
                ...options,
                headers,
                credentials: "include",
            });
        },
        [token]
    );

    return { csrfToken: token, csrfFetch };
}
