import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { getCurrentFinancialYear } from "@/lib/utils/financial-year";

/**
 * GET /api/v1/reports/financial-years
 * Returns distinct financial_year values across the user's data (for the FY dropdown).
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const ownerId = getDataOwnerId(user);

        // Gather distinct FY values from all collections
        const [orderYears, prodYears, billYears, paymentYears] = await Promise.all([
            db.collection("orders").distinct("financial_year", { userId: ownerId }),
            db.collection("productions").distinct("financial_year", { userId: ownerId }),
            db.collection("bills").distinct("financial_year", { userId: ownerId }),
            db.collection("payments").distinct("financial_year", { userId: ownerId }),
        ]);

        // Deduplicate, filter nulls, sort descending
        const allYears = [...new Set([...orderYears, ...prodYears, ...billYears, ...paymentYears])]
            .filter(Boolean)
            .sort()
            .reverse();

        return NextResponse.json({
            financialYears: allYears,
            currentFY: getCurrentFinancialYear(),
        });
    } catch (error: any) {
        console.error("[reports/financial-years] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
