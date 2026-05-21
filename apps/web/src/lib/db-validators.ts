/**
 * IND Manager — GSTIN / PAN / Phone validation utilities
 *
 * India-specific validation with real checksum algorithms.
 * These are used in API routes and form validation.
 */

// ─── GSTIN Validation ────────────────────────────────────────────
// Format: 22AAAAA0000A1Z5
//   [0-1]  : State code (01-37)
//   [2-11] : PAN (10 chars)
//   [12]   : Entity number (1-9, A-Z)
//   [13]   : 'Z' by default
//   [14]   : Check digit (Luhn mod-36)

const GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const GSTIN_CHAR_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gstinCheckDigit(gstin14: string): string {
    let total = 0;
    for (let i = 0; i < 14; i++) {
        const charIndex = GSTIN_CHAR_MAP.indexOf(gstin14[i]);
        const factor = (i % 2 === 0) ? 1 : 2;
        const product = charIndex * factor;
        const quotient = Math.floor(product / 36);
        const remainder = product % 36;
        total += quotient + remainder;
    }
    const checkVal = (36 - (total % 36)) % 36;
    return GSTIN_CHAR_MAP[checkVal];
}

/**
 * Validate a 15-character GSTIN number.
 * Checks format, state code range, embedded PAN validity, and checksum.
 */
export function validateGSTIN(gstin: string): boolean {
    if (!gstin || typeof gstin !== "string") return false;
    const g = gstin.toUpperCase().trim();
    if (g.length !== 15) return false;
    if (!GSTIN_REGEX.test(g)) return false;

    // State code must be 01-37
    const stateCode = parseInt(g.substring(0, 2), 10);
    if (stateCode < 1 || stateCode > 37) return false;

    // Embedded PAN must be valid
    const embeddedPAN = g.substring(2, 12);
    if (!validatePAN(embeddedPAN)) return false;

    // Checksum verification
    const expectedCheck = gstinCheckDigit(g.substring(0, 14));
    return g[14] === expectedCheck;
}

// ─── PAN Validation ──────────────────────────────────────────────
// Format: ABCDE1234F
//   [0-2]  : Alphabetic series (AAA-ZZZ)
//   [3]    : Entity type (C=Company, P=Person, H=HUF, F=Firm, etc.)
//   [4]    : First letter of last name / entity name
//   [5-8]  : 4 sequential digits (0001-9999)
//   [9]    : Alphabetic check letter

const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPTK][A-Z][0-9]{4}[A-Z]$/;

/**
 * Validate a 10-character PAN number.
 * Checks format and entity type code validity.
 */
export function validatePAN(pan: string): boolean {
    if (!pan || typeof pan !== "string") return false;
    const p = pan.toUpperCase().trim();
    if (p.length !== 10) return false;
    return PAN_REGEX.test(p);
}

// ─── Phone Validation ────────────────────────────────────────────
// Accepts: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
// Indian mobile numbers start with 6, 7, 8, or 9

const PHONE_REGEX = /^(?:\+?91|0)?([6-9]\d{9})$/;

/**
 * Validate an Indian phone number.
 * Returns true for valid 10-digit mobile numbers.
 * Strips common prefixes (+91, 91, 0) before validation.
 */
export function validatePhone(phone: string): boolean {
    if (!phone || typeof phone !== "string") return false;
    const cleaned = phone.replace(/[\s\-()]/g, "");
    return PHONE_REGEX.test(cleaned);
}

/**
 * Normalize a phone number to +91XXXXXXXXXX format.
 * Returns null if the number is invalid.
 */
export function normalizePhone(phone: string): string | null {
    if (!phone || typeof phone !== "string") return null;
    const cleaned = phone.replace(/[\s\-()]/g, "");
    const match = cleaned.match(PHONE_REGEX);
    if (!match) return null;
    return `+91${match[1]}`;
}

// ─── GSTIN State Extraction ──────────────────────────────────────

const STATE_MAP: Record<string, string> = {
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
    "25": "Daman & Diu", // now part of Dadra & Nagar Haveli
    "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
};

/**
 * Extract state code and state name from a GSTIN.
 * Returns null if the GSTIN is invalid.
 */
export function extractStateFromGSTIN(
    gstin: string
): { stateCode: string; stateName: string } | null {
    if (!gstin || typeof gstin !== "string") return null;
    const g = gstin.toUpperCase().trim();
    if (g.length < 2) return null;

    const stateCode = g.substring(0, 2);
    const stateName = STATE_MAP[stateCode];
    if (!stateName) return null;

    return { stateCode, stateName };
}

// ─── IFSC Validation ─────────────────────────────────────────────
// Format: 4 alpha + 0 + 6 alphanumeric (e.g. SBIN0001234)

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Validate an 11-character IFSC code.
 */
export function validateIFSC(ifsc: string): boolean {
    if (!ifsc || typeof ifsc !== "string") return false;
    return IFSC_REGEX.test(ifsc.toUpperCase().trim());
}

// ─── Pincode Validation ──────────────────────────────────────────

/**
 * Validate a 6-digit Indian PIN code.
 * First digit cannot be 0.
 */
export function validatePincode(pincode: string): boolean {
    if (!pincode || typeof pincode !== "string") return false;
    return /^[1-9]\d{5}$/.test(pincode.trim());
}
