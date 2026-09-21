/**
 * Cloud URL Validation & Normalization
 * ─────────────────────────────────────────────────────────
 * Rule: http:// is allowed ONLY for localhost or 127.0.0.1;
 * every other host requires https://.
 * Reject anything else with a clear message.
 * Normalize trailing slashes.
 */

export function validateAndNormalizeCloudUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
        return { valid: false, error: "Cloud URL cannot be empty" };
    }

    let parsed: URL;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        return { valid: false, error: "Invalid URL format" };
    }

    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
        return { valid: false, error: "Only http:// and https:// protocols are supported" };
    }

    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    if (protocol === "http:" && !isLocal) {
        return {
            valid: false,
            error: `http:// is allowed only for localhost or 127.0.0.1; host "${hostname}" requires https://`,
        };
    }

    // Normalize: strip trailing slashes, strip default ports if any, preserve custom port
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "")}`;
    return { valid: true, normalized };
}
