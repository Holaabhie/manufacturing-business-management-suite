/**
 * Tally Response Parser
 * ─────────────────────────────────────────────────────────
 * Parses Tally Prime XML import responses.
 * Tally's import response for these requests is a bare <RESPONSE>
 * with NO <ENVELOPE> wrapper.
 *
 * Extracts:
 * - CREATED, ALTERED, DELETED, ERRORS, EXCEPTIONS (plural tag)
 * - LINEERROR, FAULTSTRING
 *
 * Classification:
 * - CREATED > 0 || ALTERED > 0 => "success"
 * - ERRORS > 0 || LINEERROR present => "permanent_error" (with LINEERROR text)
 * - EXCEPTIONS > 0 (with no detail) => "permanent_error" with errorCode "TALLY_REJECTED_NO_DETAIL"
 * - Anything else => "permanent_error"
 */

export type TallyOutcome = "success" | "permanent_error";

export interface ParsedTallyResponse {
    raw: string;
    created: number;
    altered: number;
    deleted: number;
    errors: number;
    exceptions: number;
    lineErrors: string[];
    faultString?: string;
    outcome: TallyOutcome;
    errorCode?: string;
    errorMessage?: string;
}

/**
 * Extracts numeric value of an XML tag, returning 0 if not found.
 */
function extractTagNumber(xml: string, tag: string): number {
    const regex = new RegExp(`<${tag}>\\s*(\\d+)\\s*<\\/${tag}>`, "i");
    const match = xml.match(regex);
    return match && match[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Extracts all occurrences of a string tag.
 */
function extractAllTags(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const results: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
        if (match[1]) {
            const cleaned = match[1].trim().replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
            results.push(cleaned);
        }
    }
    return results;
}

/**
 * Parses raw Tally response XML string and classifies outcome.
 */
export function parseTallyResponse(rawXml: string): ParsedTallyResponse {
    const raw = rawXml || "";

    const created = extractTagNumber(raw, "CREATED");
    const altered = extractTagNumber(raw, "ALTERED");
    const deleted = extractTagNumber(raw, "DELETED");
    const errors = extractTagNumber(raw, "ERRORS");
    const exceptions = extractTagNumber(raw, "EXCEPTIONS");

    const lineErrors = extractAllTags(raw, "LINEERROR");
    const faultStrings = extractAllTags(raw, "FAULTSTRING");
    const faultString = faultStrings.length > 0 ? faultStrings[0] : undefined;

    // Classification
    if (created > 0 || altered > 0) {
        return {
            raw,
            created,
            altered,
            deleted,
            errors,
            exceptions,
            lineErrors,
            faultString,
            outcome: "success",
        };
    }

    if (errors > 0 || lineErrors.length > 0) {
        const errorText = lineErrors.length > 0
            ? lineErrors.join("; ")
            : faultString || `Tally reported ${errors} error(s)`;

        return {
            raw,
            created,
            altered,
            deleted,
            errors,
            exceptions,
            lineErrors,
            faultString,
            outcome: "permanent_error",
            errorCode: "TALLY_LINE_ERROR",
            errorMessage: errorText,
        };
    }

    if (exceptions > 0) {
        const detail = faultString || (lineErrors.length > 0 ? lineErrors.join("; ") : "");
        if (detail) {
            return {
                raw,
                created,
                altered,
                deleted,
                errors,
                exceptions,
                lineErrors,
                faultString,
                outcome: "permanent_error",
                errorCode: "TALLY_EXCEPTION",
                errorMessage: detail,
            };
        }

        return {
            raw,
            created,
            altered,
            deleted,
            errors,
            exceptions,
            lineErrors,
            faultString,
            outcome: "permanent_error",
            errorCode: "TALLY_REJECTED_NO_DETAIL",
            errorMessage: "Tally rejected the import with EXCEPTIONS but gave no detailed reason",
        };
    }

    // Fallback if 0 created/altered and no error/exception tags found
    return {
        raw,
        created,
        altered,
        deleted,
        errors,
        exceptions,
        lineErrors,
        faultString,
        outcome: "permanent_error",
        errorCode: "TALLY_NO_CHANGES",
        errorMessage: "Tally import response indicated zero masters/vouchers were created or altered",
    };
}
