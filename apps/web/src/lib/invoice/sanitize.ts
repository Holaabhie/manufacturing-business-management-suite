/**
 * Invoice Input Sanitization & Validation
 * ─────────────────────────────────────────
 * GSTIN, PAN, HSN regex validators + HTML escape for Handlebars inputs.
 */

// ─── GSTIN Validation ─────────────────────────────────────────

/**
 * Validate GSTIN (Goods and Services Tax Identification Number).
 * Format: 2-digit state code + 10-char PAN + 1 entity code + Z + 1 check digit
 * Example: 27AABCA1234F1ZP
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGSTIN(gstin: string): boolean {
    if (!gstin || typeof gstin !== "string") return false;
    return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Extract state code from GSTIN (first 2 digits).
 */
export function extractStateCode(gstin: string): string | null {
    if (!validateGSTIN(gstin)) return null;
    return gstin.trim().substring(0, 2);
}

// ─── PAN Validation ───────────────────────────────────────────

/**
 * Validate PAN (Permanent Account Number).
 * Format: 5 alpha + 4 digits + 1 alpha
 * Example: AABCA1234F
 */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function validatePAN(pan: string): boolean {
    if (!pan || typeof pan !== "string") return false;
    return PAN_REGEX.test(pan.trim().toUpperCase());
}

// ─── HSN Code Validation ──────────────────────────────────────

/**
 * Validate HSN Code (4, 6, or 8 digit numeric).
 */
const HSN_REGEX = /^[0-9]{4}([0-9]{2})?([0-9]{2})?$/;

export function validateHSN(hsnCode: string): boolean {
    if (!hsnCode || typeof hsnCode !== "string") return false;
    return HSN_REGEX.test(hsnCode.trim());
}

// ─── HTML Escaping ────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS in Handlebars templates.
 */
export function escapeHtml(str: string): string {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Strip all HTML tags from user-provided strings.
 */
export function stripHtmlTags(str: string): string {
    if (!str || typeof str !== "string") return "";
    return str.replace(/<[^>]*>/g, "");
}

// ─── Sanitize Invoice Input ───────────────────────────────────

/**
 * Sanitize text fields: strip HTML tags and trim whitespace.
 */
export function sanitizeText(str: string): string {
    if (!str || typeof str !== "string") return "";
    return stripHtmlTags(str).trim();
}

// ─── Indian State Codes Map ───────────────────────────────────

export const INDIAN_STATE_CODES: Record<string, string> = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
};

export function getStateName(stateCode: string): string | null {
    return INDIAN_STATE_CODES[stateCode] || null;
}
