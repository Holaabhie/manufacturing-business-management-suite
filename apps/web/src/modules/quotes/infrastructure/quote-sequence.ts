/**
 * Quotation Number Sequence Generator
 * ──────────────────────────────────────
 * Sequential quote numbering with financial year reset.
 * Uses MongoDB counter collection for atomic increment.
 * Tenant-scoped and race-safe.
 *
 * Format: QT-2025-26-0001 (or using CompanyProfile.quotation_prefix)
 */

import { getCurrentFinancialYear } from "@/lib/invoice/utils";
import { getDb } from "@/lib/mongodb";

interface QuotationCounter {
    _id: string; // `${tenantId}_${fy}`
    tenantId: string;
    financialYear: string;
    lastNumber: number;
    updatedAt: Date;
}

/**
 * Fetch company's quotation prefix from CompanyProfile if available.
 * Defaults to "QT-" if none configured.
 */
export async function getQuotationPrefix(tenantId: string): Promise<string> {
    try {
        const db = await getDb();
        const profile = await db.collection("companyprofiles").findOne({
            $or: [
                { organizationId: tenantId },
                { userId: tenantId },
            ]
        });

        if (profile?.quotation_prefix && typeof profile.quotation_prefix === "string" && profile.quotation_prefix.trim().length > 0) {
            const trimmed = profile.quotation_prefix.trim();
            return trimmed.endsWith("-") || trimmed.endsWith("/") ? trimmed : `${trimmed}-`;
        }
    } catch {
        // Fallback on error
    }
    return "QT-";
}

/**
 * Generate the next sequential quote number atomically per tenant.
 */
export async function generateSequentialQuotationNumber(
    tenantId: string,
    customPrefix?: string,
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `${tenantId}_${fy}`;
    const prefix = customPrefix || await getQuotationPrefix(tenantId);

    try {
        const db = await getDb();
        const collection = db.collection<QuotationCounter>("quotation_counters");

        const result = await collection.findOneAndUpdate(
            { _id: counterId },
            {
                $inc: { lastNumber: 1 },
                $set: { tenantId, financialYear: fy, updatedAt: new Date() },
                $setOnInsert: { _id: counterId },
            },
            {
                upsert: true,
                returnDocument: "after",
            }
        );

        const seqNumber = result?.lastNumber ?? 1;
        const paddedSeq = seqNumber.toString().padStart(4, "0");

        return `${prefix}${fy}-${paddedSeq}`;
    } catch (error) {
        console.warn("[quote-sequence] MongoDB atomic counter failed, using fallback:", error);
        return generateFallbackQuotationNumber(prefix, fy, date);
    }
}

/**
 * Fallback: timestamp-based unique quote number if atomic counter fails.
 */
function generateFallbackQuotationNumber(
    prefix: string,
    fy: string,
    date?: Date,
): string {
    const d = date || new Date();
    const timestamp = d.getTime().toString().slice(-6);
    return `${prefix}${fy}-${timestamp}`;
}

/**
 * Peek at the next quote number without incrementing counter.
 */
export async function peekNextQuotationNumber(
    tenantId: string,
    customPrefix?: string,
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `${tenantId}_${fy}`;
    const prefix = customPrefix || await getQuotationPrefix(tenantId);

    try {
        const db = await getDb();
        const collection = db.collection<QuotationCounter>("quotation_counters");
        const doc = await collection.findOne({ _id: counterId });

        const nextNumber = (doc?.lastNumber ?? 0) + 1;
        const paddedSeq = nextNumber.toString().padStart(4, "0");

        return `${prefix}${fy}-${paddedSeq}`;
    } catch {
        return `${prefix}${fy}-0001`;
    }
}
