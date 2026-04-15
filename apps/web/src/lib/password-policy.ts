/**
 * Password Policy Engine
 *
 * Enforces enterprise-grade password requirements.
 * Can be configured per-organization via Organization.settings.
 */

export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    maxLength: number;
    /** Reject passwords containing user's email or name */
    rejectCommonPatterns: boolean;
}

/** Default policy — matches OWASP guidelines */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false, // optional for usability
    maxLength: 128,
    rejectCommonPatterns: true,
};

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
    strength: "weak" | "fair" | "good" | "strong";
    score: number; // 0-100
}

/** Common weak passwords (top subset for quick rejection) */
const COMMON_PASSWORDS = new Set([
    "password",
    "12345678",
    "123456789",
    "qwerty123",
    "password1",
    "admin123",
    "welcome1",
    "changeme",
    "letmein1",
    "trustno1",
    "baseball",
    "dragon12",
    "master12",
    "monkey12",
    "shadow12",
    "sunshine",
    "princess",
    "football",
    "computer",
    "internet",
    "abcdef12",
    "abc12345",
    "1234abcd",
    "password123",
    "admin1234",
    "welcome123",
    "qwerty1234",
]);

/**
 * Validate a password against the given policy.
 */
export function validatePassword(
    password: string,
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
    context?: { email?: string; fullName?: string }
): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < policy.minLength) {
        errors.push(`Must be at least ${policy.minLength} characters`);
    } else {
        score += 15;
    }

    if (password.length > policy.maxLength) {
        errors.push(`Must be at most ${policy.maxLength} characters`);
    }

    // Extra points for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character class checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (policy.requireUppercase && !hasUppercase) {
        errors.push("Must contain at least one uppercase letter (A-Z)");
    }
    if (policy.requireLowercase && !hasLowercase) {
        errors.push("Must contain at least one lowercase letter (a-z)");
    }
    if (policy.requireNumber && !hasNumber) {
        errors.push("Must contain at least one number (0-9)");
    }
    if (policy.requireSpecial && !hasSpecial) {
        errors.push("Must contain at least one special character (!@#$%...)");
    }

    // Score character variety
    if (hasUppercase) score += 15;
    if (hasLowercase) score += 10;
    if (hasNumber) score += 15;
    if (hasSpecial) score += 20;

    // Common pattern checks
    if (policy.rejectCommonPatterns) {
        const lower = password.toLowerCase();

        if (COMMON_PASSWORDS.has(lower)) {
            errors.push("This password is too common");
            score = Math.min(score, 10);
        }

        // Repeated characters (e.g., aaaa1111)
        if (/(.)\1{3,}/.test(password)) {
            errors.push("Avoid repeating characters");
            score -= 10;
        }

        // Sequential numbers (e.g., 123456)
        if (/(?:012|123|234|345|456|567|678|789|890){2,}/.test(password)) {
            errors.push("Avoid sequential numbers");
            score -= 10;
        }

        // Contains email or name
        if (context?.email) {
            const emailBase = context.email.split("@")[0]?.toLowerCase();
            if (emailBase && emailBase.length > 3 && lower.includes(emailBase)) {
                errors.push("Password should not contain your email");
                score -= 15;
            }
        }

        if (context?.fullName) {
            const nameParts = context.fullName
                .toLowerCase()
                .split(/\s+/)
                .filter((p) => p.length > 3);
            for (const part of nameParts) {
                if (lower.includes(part)) {
                    errors.push("Password should not contain your name");
                    score -= 15;
                    break;
                }
            }
        }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: "weak" | "fair" | "good" | "strong";
    if (score < 30) strength = "weak";
    else if (score < 55) strength = "fair";
    else if (score < 80) strength = "good";
    else strength = "strong";

    return {
        valid: errors.length === 0,
        errors,
        strength,
        score,
    };
}

/**
 * Quick boolean check — use in API routes.
 * Returns null if valid, or error string if invalid.
 */
export function checkPasswordOrError(
    password: string,
    context?: { email?: string; fullName?: string }
): string | null {
    const result = validatePassword(password, DEFAULT_PASSWORD_POLICY, context);
    if (result.valid) return null;
    return result.errors[0] || "Invalid password";
}
