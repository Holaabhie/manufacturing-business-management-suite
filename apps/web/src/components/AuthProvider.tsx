"use client";

import { SessionProvider } from "next-auth/react";

/**
 * AuthProvider — wraps the application with NextAuth's SessionProvider.
 *
 * This is required for:
 * 1. CSRF token management (prevents MissingCSRF errors on OAuth signIn)
 * 2. Client-side session access via useSession()
 * 3. Proper signIn/signOut function behavior from next-auth/react
 *
 * The SessionProvider does NOT conflict with our custom session system.
 * Our custom cookies (session_id, refresh_token) handle the actual auth,
 * while NextAuth manages the OAuth flow and its own JWT session.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider
            // Don't refetch session on window focus — we use our own session system
            refetchOnWindowFocus={false}
            // Refresh interval disabled — our custom session handles this
            refetchInterval={0}
        >
            {children}
        </SessionProvider>
    );
}
