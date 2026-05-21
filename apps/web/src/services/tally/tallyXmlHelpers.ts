/**
 * Tally XML Helpers
 * ─────────────────────────────────────────────────────────
 * Utility functions for generating valid Tally Prime XML.
 * Includes date formatting, XML escaping, GST state mapping,
 * and unit conversion.
 */

/**
 * Converts ISO date string to Tally date format.
 * "2026-05-19" → "20260519"
 */
export function formatTallyDate(isoDate: string): string {
    if (!isoDate) return "";
    const cleaned = isoDate.split("T")[0]; // strip time if present
    return cleaned.replace(/-/g, "");
}

/**
 * Escapes special XML characters to prevent injection/malformed XML.
 */
export function escapeXml(str: string): string {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Formats a number to 2-decimal string for Tally amounts.
 * No currency symbol, no locale formatting.
 */
export function formatAmount(amount: number): string {
    return (amount ?? 0).toFixed(2);
}

/**
 * Determines GST type from invoice amounts.
 * If igstAmount > 0 → interstate (IGST only).
 * Otherwise → intrastate (CGST + SGST).
 */
export function determineGSTType(igstAmount: number): "IGST" | "CGST_SGST" {
    return igstAmount > 0 ? "IGST" : "CGST_SGST";
}

/**
 * Maps common IND Manager units to Tally-recognized unit symbols.
 */
export function mapUnitToTally(unit: string): string {
    const map: Record<string, string> = {
        pcs: "NOS",
        nos: "NOS",
        pieces: "NOS",
        numbers: "NOS",
        kg: "KGS",
        kgs: "KGS",
        kilogram: "KGS",
        kilograms: "KGS",
        g: "GMS",
        gm: "GMS",
        gms: "GMS",
        gram: "GMS",
        grams: "GMS",
        l: "LTR",
        ltr: "LTR",
        litre: "LTR",
        litres: "LTR",
        liter: "LTR",
        liters: "LTR",
        ml: "MLS",
        mls: "MLS",
        m: "MTR",
        mtr: "MTR",
        meter: "MTR",
        meters: "MTR",
        metre: "MTR",
        metres: "MTR",
        cm: "CMS",
        ft: "FTS",
        feet: "FTS",
        foot: "FTS",
        in: "INS",
        inch: "INS",
        inches: "INS",
        box: "BOX",
        boxes: "BOX",
        bag: "BAG",
        bags: "BAG",
        roll: "ROL",
        rolls: "ROL",
        pair: "PRS",
        pairs: "PRS",
        ton: "TON",
        tons: "TON",
        tonne: "TON",
        tonnes: "TON",
        set: "SET",
        sets: "SET",
        sqm: "SQM",
        sqft: "SQF",
        dozen: "DZN",
        dzn: "DZN",
    };

    const normalized = (unit || "pcs").toLowerCase().trim();
    return map[normalized] || "NOS"; // Default to NOS
}

/**
 * Maps 2-digit Indian GST state codes to Tally state names.
 * Complete mapping for all 37 Indian states and Union Territories.
 */
export function getTallyStateName(stateCode: string): string {
    const stateMap: Record<string, string> = {
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
        "28": "Andhra Pradesh",
        "29": "Karnataka",
        "30": "Goa",
        "31": "Lakshadweep",
        "32": "Kerala",
        "33": "Tamil Nadu",
        "34": "Puducherry",
        "35": "Andaman & Nicobar Islands",
        "36": "Telangana",
        "37": "Andhra Pradesh (New)",
        "38": "Ladakh",
    };

    return stateMap[stateCode] || "Other Territory";
}

/**
 * Derives PAN number from a GSTIN.
 * GSTIN format: 2-digit state code + 10-char PAN + 1 entity + Z + check digit
 * PAN = characters at index 2–11 (0-indexed).
 */
export function derivePanFromGstin(gstin: string): string {
    if (!gstin || gstin.length < 12) return "";
    return gstin.substring(2, 12);
}
