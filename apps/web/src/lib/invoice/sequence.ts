/**
 * Invoice Number Sequence Generator
 * ───────────────────────────────────
 * Sequential invoice numbering with financial year reset.
 * Uses MongoDB counter collection for atomic increment.
 *
 * Format: INV-2025-26-0001
 *   - INV prefix
 *   - Financial year (April–March)
 *   - 4-digit zero-padded sequential number
 *   - Resets to 1 on new financial year (April 1)
 */

import { getCurrentFinancialYear } from "./utils";

// ─── MongoDB Counter Interface ────────────────────────────────

interface InvoiceCounter {
    _id: string;          // "invoice_counter_2025-26"
    financialYear: string;
    lastNumber: number;
    updatedAt: Date;
}

// ─── Sequence Generator ───────────────────────────────────────

/**
 * Generate the next sequential invoice number.
 * Atomic operation using MongoDB's findOneAndUpdate with $inc.
 *
 * @param prefix - Invoice prefix (default: "INV")
 * @param date - Date to determine financial year (default: now)
 * @returns Promise<string> - e.g. "INV-2025-26-0001"
 */
export async function generateSequentialInvoiceNumber(
    prefix: string = "INV",
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `invoice_counter_${fy}`;

    try {
        // Dynamic import to avoid issues when mongoose isn't connected
        const mongoose = await import("mongoose");
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("MongoDB not connected");
        }

        const collection = db.collection<InvoiceCounter>("invoice_counters");

        // Atomic increment — creates doc if not exists
        const result = await collection.findOneAndUpdate(
            { _id: counterId },
            {
                $inc: { lastNumber: 1 },
                $set: { financialYear: fy, updatedAt: new Date() },
                $setOnInsert: { _id: counterId },
            },
            {
                upsert: true,
                returnDocument: "after",
            },
        );

        const seqNumber = result?.lastNumber ?? 1;
        const paddedSeq = seqNumber.toString().padStart(4, "0");

        return `${prefix}-${fy}-${paddedSeq}`;
    } catch (error) {
        console.warn("[invoice/sequence] MongoDB counter failed, using fallback:", error);
        return generateFallbackInvoiceNumber(prefix, date);
    }
}

/**
 * Fallback: timestamp-based invoice number when DB is unavailable.
 * Not truly sequential but unique.
 */
function generateFallbackInvoiceNumber(
    prefix: string = "INV",
    date?: Date,
): string {
    const fy = getCurrentFinancialYear(date);
    const d = date || new Date();
    const timestamp = d.getTime().toString().slice(-6);
    return `${prefix}-${fy}-${timestamp}`;
}

/**
 * Get the current counter value without incrementing.
 * Useful for displaying "next invoice number" preview.
 */
export async function peekNextInvoiceNumber(
    prefix: string = "INV",
    date?: Date,
): Promise<string> {
    const fy = getCurrentFinancialYear(date);
    const counterId = `invoice_counter_${fy}`;

    try {
        const mongoose = await import("mongoose");
        const db = mongoose.connection.db;

        if (!db) {
            return `${prefix}-${fy}-0001`;
        }

        const collection = db.collection<InvoiceCounter>("invoice_counters");
        const doc = await collection.findOne({ _id: counterId });

        const nextNumber = (doc?.lastNumber ?? 0) + 1;
        const paddedSeq = nextNumber.toString().padStart(4, "0");

        return `${prefix}-${fy}-${paddedSeq}`;
    } catch {
        return `${prefix}-${fy}-0001`;
    }
}
