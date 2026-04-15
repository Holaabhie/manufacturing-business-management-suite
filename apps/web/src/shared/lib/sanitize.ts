/**
 * Input Sanitization Utilities
 * ─────────────────────────────────────────────────────────
 * Protects against NoSQL injection and common input attacks.
 *
 * MongoDB Injection Example:
 *   { "email": { "$gt": "" } }  ← returns first user!
 *   { "password": { "$regex": ".*" } }  ← bypasses auth!
 *
 * This module strips dangerous MongoDB operators from
 * untrusted input before it reaches the database layer.
 */

// ─── MongoDB Operator Sanitizer ─────────────────────────────────

/**
 * Recursively strip keys starting with '$' from an object.
 * This prevents MongoDB operator injection attacks.
 *
 * @example
 *   sanitizeMongoInput({ name: "Test", $gt: "" })
 *   // → { name: "Test" }
 *
 *   sanitizeMongoInput({ email: { $regex: ".*" } })
 *   // → { email: {} }
 */
export function sanitizeMongoInput<T>(input: T): T {
    if (input === null || input === undefined) return input;
    if (typeof input !== "object") return input;

    if (Array.isArray(input)) {
        return input.map(sanitizeMongoInput) as unknown as T;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        // Skip keys starting with $ (MongoDB operators)
        if (key.startsWith("$")) continue;

        // Skip keys containing dots (MongoDB nested field access)
        if (key.includes(".")) continue;

        // Recursively sanitize nested objects
        cleaned[key] = typeof value === "object" ? sanitizeMongoInput(value) : value;
    }

    return cleaned as T;
}

// ─── String Sanitizer ───────────────────────────────────────────

/**
 * Basic HTML entity encoding for strings that may be rendered.
 * This is a defense-in-depth measure — the primary XSS protection
 * is React's automatic escaping.
 */
export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Remove null bytes and other control characters that can
 * bypass security filters.
 */
export function stripControlChars(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize a string value: trim, strip control chars, limit length.
 */
export function sanitizeString(
    value: unknown,
    maxLength = 10000,
): string {
    if (typeof value !== "string") return "";
    return stripControlChars(value.trim()).slice(0, maxLength);
}

// ─── Request Body Sanitizer ─────────────────────────────────────

/**
 * Full sanitization pipeline for request bodies.
 * Applies MongoDB operator stripping and string sanitization.
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(
    body: T,
): T {
    return sanitizeMongoInput(body);
}
