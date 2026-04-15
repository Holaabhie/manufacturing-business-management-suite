import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/production/delay-prediction
 * 
 * Feature 5: Auto Delay Prediction (Smart Feature)
 * Rule-based calculation — no AI needed.
 * 
 * Logic:
 * 1. For each active production order, compare expected vs actual progress
 * 2. Calculate expected daily rate = expectedOutput / total days
 * 3. Calculate actual daily rate = producedQuantity / days elapsed
 * 4. If actual < expected * 0.7, flag as "at risk"
 * 5. If machine assigned to this production is idle/maintenance, escalate risk
 */
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = getDataOwnerId(user);

        const db = await getDb();

        // Get all active productions
        const activeProductions = await db
            .collection("productions")
            .find({
                userId: adminId,
                status: { $ne: "completed" },
            })
            .toArray();

        // Get machines for status check
        const machines = await db
            .collection("machines")
            .find({ adminId })
            .toArray();

        const machineStatusMap = new Map(
            machines.map((m: any) => [m._id.toString(), m.status || "idle"])
        );

        const now = new Date();
        const predictions: any[] = [];

        for (const prod of activeProductions) {
            const startDate = new Date(prod.createdAt);
            const deliveryDate = prod.deliveryDate
                ? new Date(prod.deliveryDate)
                : prod.targetCompletion
                    ? new Date(prod.targetCompletion)
                    : null;

            // Skip if no deadline to compare against
            if (!deliveryDate) continue;

            const totalDays = Math.max(
                1,
                (deliveryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const daysElapsed = Math.max(
                1,
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const daysRemaining = Math.max(
                0,
                (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            const expectedOutput = prod.expectedOutput || prod.orderQuantity || 1;
            const producedQty = prod.producedQuantity || 0;

            // Calculate rates
            const expectedDailyRate = expectedOutput / totalDays;
            const actualDailyRate = daysElapsed > 0 ? producedQty / daysElapsed : 0;
            const expectedProgressPercent = Math.min(
                100,
                Math.round((daysElapsed / totalDays) * 100)
            );
            const actualProgressPercent = prod.progressPercent || 0;

            // Projected completion
            const remainingQty = expectedOutput - producedQty;
            const projectedDaysToComplete =
                actualDailyRate > 0 ? remainingQty / actualDailyRate : Infinity;
            const projectedCompletionDate =
                projectedDaysToComplete !== Infinity
                    ? new Date(now.getTime() + projectedDaysToComplete * 24 * 60 * 60 * 1000)
                    : null;

            // Risk factors
            const riskFactors: string[] = [];
            let riskLevel = "safe" as string;

            // Factor 1: Progress behind schedule
            if (actualProgressPercent < expectedProgressPercent * 0.5) {
                riskFactors.push("Production significantly behind schedule");
                riskLevel = "critical";
            } else if (actualProgressPercent < expectedProgressPercent * 0.7) {
                riskFactors.push("Production behind schedule");
                riskLevel = riskLevel === "critical" ? "critical" : "warning";
            }

            // Factor 2: Slow production rate
            if (actualDailyRate < expectedDailyRate * 0.5 && daysElapsed > 1) {
                riskFactors.push(
                    `Production rate (${Math.round(actualDailyRate)}/day) is below expected (${Math.round(expectedDailyRate)}/day)`
                );
                riskLevel = "critical";
            } else if (actualDailyRate < expectedDailyRate * 0.7 && daysElapsed > 1) {
                riskFactors.push("Production rate below expected");
                riskLevel = riskLevel === "critical" ? "critical" : "warning";
            }

            // Factor 3: Machine idle/maintenance
            if (prod.machineId) {
                const machineStatus = machineStatusMap.get(prod.machineId);
                if (machineStatus === "maintenance") {
                    riskFactors.push(`Machine ${prod.machineName} is under maintenance`);
                    riskLevel = "critical" as string;
                } else if (machineStatus === "idle") {
                    riskFactors.push(`Machine ${prod.machineName} is idle`);
                    if (riskLevel !== "critical") riskLevel = "warning";
                }
            }

            // Factor 4: Deadline approaching with low progress
            if (daysRemaining < 2 && actualProgressPercent < 80) {
                riskFactors.push("Deadline approaching with low progress");
                riskLevel = "critical";
            } else if (daysRemaining < 5 && actualProgressPercent < 50) {
                riskFactors.push("Deadline approaching with incomplete work");
                riskLevel = riskLevel === "critical" ? "critical" : "warning";
            }

            // Factor 5: Projected completion after deadline
            if (
                projectedCompletionDate &&
                projectedCompletionDate.getTime() > deliveryDate.getTime()
            ) {
                const delayDays = Math.ceil(
                    (projectedCompletionDate.getTime() - deliveryDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                riskFactors.push(`Projected to be ${delayDays} day(s) late`);
                riskLevel = "critical";
            }

            // Only include orders that have risk
            if (riskFactors.length > 0) {
                predictions.push({
                    productionId: prod._id.toString(),
                    batchNumber: prod.batchNumber,
                    orderName: prod.orderProductName,
                    clientName: prod.clientName,
                    machineName: prod.machineName || "Unassigned",
                    machineStatus: prod.machineId
                        ? machineStatusMap.get(prod.machineId) || "unknown"
                        : "unassigned",
                    deliveryDate,
                    daysRemaining: Math.round(daysRemaining * 10) / 10,
                    expectedOutput,
                    producedQty,
                    expectedProgressPercent,
                    actualProgressPercent,
                    expectedDailyRate: Math.round(expectedDailyRate * 10) / 10,
                    actualDailyRate: Math.round(actualDailyRate * 10) / 10,
                    projectedCompletionDate,
                    riskLevel,
                    riskFactors,
                });
            }
        }

        // Sort: critical first, then warning
        predictions.sort((a, b) => {
            const levelOrder: Record<string, number> = { critical: 0, warning: 1, safe: 2 };
            return (levelOrder[a.riskLevel] ?? 2) - (levelOrder[b.riskLevel] ?? 2);
        });

        return NextResponse.json({
            predictions,
            summary: {
                totalAtRisk: predictions.length,
                critical: predictions.filter((p) => p.riskLevel === "critical").length,
                warning: predictions.filter((p) => p.riskLevel === "warning").length,
            },
            lastUpdated: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Error computing delay predictions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
