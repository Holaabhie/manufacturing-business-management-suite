import { getSessionUser, type UserDoc } from "@/lib/auth-session";
import { env } from "@/shared/config/env";
import type { WithId } from "mongodb";

export type PlatformAdminCheckResult =
    | { user: WithId<UserDoc>; error?: never; status?: never }
    | { user?: never; error: string; status: number };

/**
 * Checks whether an email is listed in PLATFORM_ADMIN_EMAILS.
 * Comma-separated, trimmed, case-insensitive.
 * Missing or empty env var = nobody is platform admin (fail closed).
 */
export function isPlatformAdminEmail(email: string): boolean {
    if (!email || typeof email !== "string") {
        return false;
    }

    const rawEnv =
        (typeof process !== "undefined" && process.env?.PLATFORM_ADMIN_EMAILS) ||
        env.PLATFORM_ADMIN_EMAILS ||
        "";

    const trimmedEnv = rawEnv.trim();
    if (!trimmedEnv) {
        return false;
    }

    const normalizedInput = email.trim().toLowerCase();
    if (!normalizedInput) {
        return false;
    }

    const allowlist = trimmedEnv
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    return allowlist.includes(normalizedInput);
}

/**
 * Resolves the session user via getSessionUser() and verifies platform admin status.
 * Drop-in compatible with requireAdmin() return shape.
 * - 401 if not logged in
 * - 403 if user email is not on the PLATFORM_ADMIN_EMAILS allowlist
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminCheckResult> {
    const user = await getSessionUser();

    if (!user) {
        return { error: "Unauthorized - Please log in", status: 401 };
    }

    if (!user.email || !isPlatformAdminEmail(user.email)) {
        return {
            error: "Forbidden - Platform admin access required",
            status: 403,
        };
    }

    return { user };
}
