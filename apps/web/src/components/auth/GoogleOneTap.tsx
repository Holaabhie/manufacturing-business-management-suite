"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Google One Tap — Seamless sign-in prompt.
 *
 * Loads the GSI client script and initializes One Tap.
 * When the user taps, the credential is sent to our
 * /api/auth/google-one-tap endpoint for server-side verification.
 */

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: (callback?: (notification: any) => void) => void;
                    cancel: () => void;
                    renderButton: (parent: HTMLElement, config: any) => void;
                };
            };
        };
    }
}

interface GoogleOneTapProps {
    /** Called when sign-in completes successfully */
    onSuccess?: () => void;
}

export function GoogleOneTap({ onSuccess }: GoogleOneTapProps) {
    const router = useRouter();
    const initialized = useRef(false);

    const handleCredentialResponse = useCallback(
        async (response: { credential: string }) => {
            try {
                const res = await fetch("/api/auth/google-one-tap", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential: response.credential }),
                });

                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || "Sign-in failed");
                    return;
                }

                toast.success("Signed in successfully!");
                onSuccess?.();
                router.push("/dashboard");
            } catch {
                toast.error("Google sign-in failed. Please try again.");
            }
        },
        [router, onSuccess]
    );

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        let timeoutId: NodeJS.Timeout;

        const initializeOneTap = () => {
            if (!window.google?.accounts?.id) return;

            // Initialize only once per window
            if (!(window as any).__googleOneTapInitialized) {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    auto_select: true,
                    cancel_on_tap_outside: true,
                    itp_support: true,
                    use_fedcm_for_prompt: false, // Attempt to fallback to iframe
                });
                (window as any).__googleOneTapInitialized = true;
            }

            // Prompt only once per window to prevent FedCM collision
            if (!(window as any).__googleOneTapPrompted) {
                (window as any).__googleOneTapPrompted = true;
                
                timeoutId = setTimeout(() => {
                    window.google?.accounts?.id?.prompt((notification: any) => {
                        if (notification.isNotDisplayed()) {
                            console.debug("[OneTap] Not displayed:", notification.getNotDisplayedReason());
                            (window as any).__googleOneTapPrompted = false;
                        }
                        if (notification.isSkippedMoment()) {
                            console.debug("[OneTap] Skipped:", notification.getSkippedReason());
                            (window as any).__googleOneTapPrompted = false;
                        }
                    });
                }, 300);
            }
        };

        if (window.google?.accounts?.id) {
            initializeOneTap();
        } else {
            // Prevent injecting the script twice
            if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                const script = document.createElement("script");
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = initializeOneTap;
                document.head.appendChild(script);
            } else {
                // If script is already injecting, poll until it's ready
                const checkInterval = setInterval(() => {
                    if (window.google?.accounts?.id) {
                        clearInterval(checkInterval);
                        initializeOneTap();
                    }
                }, 100);
                timeoutId = setTimeout(() => clearInterval(checkInterval), 5000);
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            // We intentionally DO NOT reset the global flags here. 
            // Google's FedCM promise cannot be synchronously aborted. 
            // Resetting the flag would cause the next StrictMode mount to trigger 
            // a second prompt() while the first is still outstanding.
        };
    }, [handleCredentialResponse]);

    // One Tap is a floating prompt — no visible element needed
    return null;
}
