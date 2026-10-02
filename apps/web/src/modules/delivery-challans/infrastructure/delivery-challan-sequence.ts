/**
 * Delivery Challan Number Sequence Generator
 * ──────────────────────────────────────────
 * Sequential delivery challan numbering with financial year reset.
 * Uses MongoDB counter collection for atomic increment.
 * Tenant-scoped and race-safe.
 *
 * Format: DC-2026-27-0001
 */

import { getCurrentFinancialYear } from "@/lib/invoice/utils";
import { getDb } from "@/lib/mongodb";

interface DeliveryChallanCounter {
    _id: string; // `${tenantId}_${fy}`
    tenantId: string;
    financialYear: string;
    lastNumber: number;
    updatedAt: Date;
}

const PREFIX = "DC-";

/**
 * Generate the next sequential delivery challan number atomically per tenant.
 */
export async function generateSequentialChallanNumber(
    tenantId: string,
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `${tenantId}_${fy}`;

    try {
        const db = await getDb();
        const collection = db.collection<DeliveryChallanCounter>("delivery_challan_counters");

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
        console.warn("[challan-sequence] MongoDB atomic counter failed, using fallback:", error);
        return generateFallbackChallanNumber(PREFIX, fy, date);
    }
}

/**
 * Fallback: timestamp-based unique challan number if atomic counter fails.
 */
function generateFallbackChallanNumber(
    prefix: string,
    fy: string,
    date?: Date,
): string {
    const d = date || new Date();
    const timestamp = d.getTime().toString().slice(-6);
    return `${prefix}${fy}-${timestamp}`;
}

/**
 * Peek at the next challan number without incrementing counter.
 */
export async function peekNextChallanNumber(
    tenantId: string,
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `${tenantId}_${fy}`;

    try {
        const db = await getDb();
        const collection = db.collection<DeliveryChallanCounter>("delivery_challan_counters");
        const doc = await collection.findOne({ _id: counterId });

        const nextNumber = (doc?.lastNumber ?? 0) + 1;
        const paddedSeq = nextNumber.toString().padStart(4, "0");

        return `${PREFIX}${fy}-${paddedSeq}`;
    } catch {
        return `${PREFIX}${fy}-0001`;
    }
}
