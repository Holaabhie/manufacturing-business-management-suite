/**
 * Vendor Bill Number Sequence Generator
 * ──────────────────────────────────────────────────────────
 * Sequential vendor bill numbering with financial year reset.
 * Uses MongoDB `vendor_bill_counters` collection for atomic increment.
 * Tenant-scoped and race-safe.
 *
 * Format: VB-2026-27-0001
 */

import { getFinancialYear, getCurrentFinancialYear } from "@/lib/utils/financial-year";
import { getDb } from "@/lib/mongodb";

interface VendorBillCounter {
    _id: string; // `${tenantId}_${fy}`
    tenantId: string;
    financialYear: string;
    lastNumber: number;
    updatedAt: Date;
}

const PREFIX = "VB-";

/**
 * Generate the next sequential vendor bill number atomically per tenant & FY.
 */
export async function generateSequentialVendorBillNumber(
    tenantId: string,
    date?: Date | string
): Promise<string> {
    const fy = (date ? getFinancialYear(date) : null) || getCurrentFinancialYear();
    const counterId = `${tenantId}_${fy}`;

    try {
        const db = await getDb();
        const collection = db.collection<VendorBillCounter>("vendor_bill_counters");

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

        return `${PREFIX}${fy}-${paddedSeq}`;
    } catch (error) {
        console.warn("[vendor-bill-sequence] MongoDB atomic counter failed, using fallback:", error);
        return generateFallbackBillNumber(PREFIX, fy, date);
    }
}

/**
 * Fallback: timestamp-based unique bill number if atomic counter fails.
 */
function generateFallbackBillNumber(
    prefix: string,
    fy: string,
    date?: Date | string
): string {
    const d = date ? (typeof date === "string" ? new Date(date) : date) : new Date();
    const timestamp = d.getTime().toString().slice(-6);
    return `${prefix}${fy}-${timestamp}`;
}

/**
 * Peek at the next bill number without incrementing counter.
 */
export async function peekNextVendorBillNumber(
    tenantId: string,
    date?: Date | string
): Promise<string> {
    const fy = (date ? getFinancialYear(date) : null) || getCurrentFinancialYear();
    const counterId = `${tenantId}_${fy}`;

    try {
        const db = await getDb();
        const collection = db.collection<VendorBillCounter>("vendor_bill_counters");
        const doc = await collection.findOne({ _id: counterId });

        const nextNumber = (doc?.lastNumber ?? 0) + 1;
        const paddedSeq = nextNumber.toString().padStart(4, "0");

        return `${PREFIX}${fy}-${paddedSeq}`;
    } catch {
        return `${PREFIX}${fy}-0001`;
    }
}
