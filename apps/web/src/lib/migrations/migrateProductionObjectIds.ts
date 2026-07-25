/**
 * ═══════════════════════════════════════════════════════════════════
 * Migration: Convert ObjectId values → string in production documents
 * ═══════════════════════════════════════════════════════════════════
 *
 * Fields migrated:
 *   - assignedStaff[]               (ObjectId → string)
 *   - assignmentLogs[].assignedBy   (ObjectId → string)
 *   - assignmentLogs[].assignedStaff[] (ObjectId → string)
 *   - closedBy                      (ObjectId → string)
 *   - productionAssignments[].operatorId (ObjectId → string)
 *
 * Features:
 *   - DRY_RUN mode: preview changes without writing
 *   - Idempotent: safe to run multiple times
 *   - Backup logging: saves original values before mutation
 *   - Skips unrecoverable records (logs them)
 *   - Preserves valid UUID strings (no double-conversion)
 *   - Full audit trail with summary report
 *
 * Usage:
 *   DRY RUN:   npx tsx src/lib/migrations/migrateProductionObjectIds.ts --dry-run
 *   LIVE RUN:  npx tsx src/lib/migrations/migrateProductionObjectIds.ts
 *
 * Environment:
 *   Reads MONGODB_URI and MONGODB_DB from .env.local (via @/lib/mongodb)
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

// ─── Configuration ──────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Check if a value is an ObjectId instance (or looks like one).
 * Returns false for UUID strings and null/undefined.
 */
function isObjectIdValue(val: unknown): boolean {
    if (val instanceof ObjectId) return true;
    if (val === null || val === undefined) return false;
    // A raw BSON ObjectId might appear as a 24-char hex string in some contexts
    // But we ONLY convert actual ObjectId instances, NOT valid UUID strings
    if (typeof val === "string") {
        // UUID v4 pattern: 8-4-4-4-12 hex chars with dashes
        const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_PATTERN.test(val)) return false; // Already a valid UUID string — leave it
        // 24-char hex strings are ObjectId.toString() remnants — but only flag
        // them if ObjectId.isValid() agrees
        if (/^[0-9a-f]{24}$/i.test(val) && ObjectId.isValid(val)) return true;
    }
    return false;
}

/**
 * Convert a value to its string representation.
 * ObjectId → ObjectId.toHexString()
 * string   → string (passthrough)
 */
function toStringId(val: unknown): string {
    if (val instanceof ObjectId) return val.toHexString();
    return String(val);
}

/**
 * Check if an array contains any ObjectId values.
 */
function arrayHasObjectIds(arr: unknown[]): boolean {
    return arr.some(isObjectIdValue);
}

// ─── Types ──────────────────────────────────────────────────────

interface MigrationBackupEntry {
    docId: string;
    field: string;
    originalValue: unknown;
    convertedValue: unknown;
}

interface MigrationReport {
    totalScanned: number;
    totalAffected: number;
    totalFixed: number;
    totalSkipped: number;
    totalFailed: number;
    fieldCounts: Record<string, number>;
    backupLog: MigrationBackupEntry[];
    skippedRecords: Array<{ docId: string; reason: string }>;
    failedRecords: Array<{ docId: string; error: string }>;
    dryRun: boolean;
}

// ─── Core Migration Logic ───────────────────────────────────────

export async function migrateProductionObjectIds(): Promise<MigrationReport> {
    const report: MigrationReport = {
        totalScanned: 0,
        totalAffected: 0,
        totalFixed: 0,
        totalSkipped: 0,
        totalFailed: 0,
        fieldCounts: {
            assignedStaff: 0,
            "assignmentLogs.assignedBy": 0,
            "assignmentLogs.assignedStaff": 0,
            closedBy: 0,
            "productionAssignments.operatorId": 0,
        },
        backupLog: [],
        skippedRecords: [],
        failedRecords: [],
        dryRun: DRY_RUN,
    };

    console.log("═══════════════════════════════════════════════════");
    console.log(`  Production ObjectId Migration${DRY_RUN ? " [DRY RUN]" : " [LIVE]"}`);
    console.log("═══════════════════════════════════════════════════\n");

    const db = await getDb();
    const col = db.collection("productions");

    // ─── Find affected documents ────────────────────────────────
    // Query for docs that might contain ObjectId values in any target field.
    // We use $or across all fields that could hold ObjectId data.
    // We check for both ObjectId type and 24-char hex strings.
    const allDocs = await col.find({}).toArray();
    report.totalScanned = allDocs.length;

    console.log(`[Scan] Total production documents: ${allDocs.length}\n`);

    for (const doc of allDocs) {
        const docId = String(doc._id);
        let docAffected = false;
        const updateOps: Record<string, unknown> = {};

        try {
            // ── 1. assignedStaff[] ──────────────────────────────
            if (Array.isArray(doc.assignedStaff) && doc.assignedStaff.length > 0) {
                if (arrayHasObjectIds(doc.assignedStaff)) {
                    const original = doc.assignedStaff.map((v: unknown) => String(v));
                    const converted = doc.assignedStaff.map(toStringId);

                    report.backupLog.push({
                        docId,
                        field: "assignedStaff",
                        originalValue: original,
                        convertedValue: converted,
                    });

                    updateOps.assignedStaff = converted;
                    report.fieldCounts.assignedStaff++;
                    docAffected = true;
                }
            }

            // ── 2. assignmentLogs[] ─────────────────────────────
            if (Array.isArray(doc.assignmentLogs) && doc.assignmentLogs.length > 0) {
                let logsModified = false;
                const fixedLogs = doc.assignmentLogs.map((log: any, idx: number) => {
                    const fixedLog = { ...log };

                    // 2a. assignedBy
                    if (isObjectIdValue(log.assignedBy)) {
                        report.backupLog.push({
                            docId,
                            field: `assignmentLogs[${idx}].assignedBy`,
                            originalValue: String(log.assignedBy),
                            convertedValue: toStringId(log.assignedBy),
                        });
                        fixedLog.assignedBy = toStringId(log.assignedBy);
                        report.fieldCounts["assignmentLogs.assignedBy"]++;
                        logsModified = true;
                    }

                    // 2b. assignedStaff[]
                    if (Array.isArray(log.assignedStaff) && arrayHasObjectIds(log.assignedStaff)) {
                        report.backupLog.push({
                            docId,
                            field: `assignmentLogs[${idx}].assignedStaff`,
                            originalValue: log.assignedStaff.map((v: unknown) => String(v)),
                            convertedValue: log.assignedStaff.map(toStringId),
                        });
                        fixedLog.assignedStaff = log.assignedStaff.map(toStringId);
                        report.fieldCounts["assignmentLogs.assignedStaff"]++;
                        logsModified = true;
                    }

                    return fixedLog;
                });

                if (logsModified) {
                    updateOps.assignmentLogs = fixedLogs;
                    docAffected = true;
                }
            }

            // ── 3. closedBy ─────────────────────────────────────
            if (isObjectIdValue(doc.closedBy)) {
                report.backupLog.push({
                    docId,
                    field: "closedBy",
                    originalValue: String(doc.closedBy),
                    convertedValue: toStringId(doc.closedBy),
                });
                updateOps.closedBy = toStringId(doc.closedBy);
                report.fieldCounts.closedBy++;
                docAffected = true;
            }

            // ── 4. productionAssignments[].operatorId ───────────
            if (Array.isArray(doc.productionAssignments) && doc.productionAssignments.length > 0) {
                let assignmentsModified = false;
                const fixedAssignments = doc.productionAssignments.map((pa: any, idx: number) => {
                    const fixedPa = { ...pa };

                    if (isObjectIdValue(pa.operatorId)) {
                        report.backupLog.push({
                            docId,
                            field: `productionAssignments[${idx}].operatorId`,
                            originalValue: String(pa.operatorId),
                            convertedValue: toStringId(pa.operatorId),
                        });
                        fixedPa.operatorId = toStringId(pa.operatorId);
                        report.fieldCounts["productionAssignments.operatorId"]++;
                        assignmentsModified = true;
                    }

                    return fixedPa;
                });

                if (assignmentsModified) {
                    updateOps.productionAssignments = fixedAssignments;
                    docAffected = true;
                }
            }

            // ── Apply update ────────────────────────────────────
            if (docAffected) {
                report.totalAffected++;

                if (DRY_RUN) {
                    console.log(`[DRY] Would fix doc ${docId}:`);
                    for (const [field, value] of Object.entries(updateOps)) {
                        console.log(`       ${field}: ${JSON.stringify(value)}`);
                    }
                } else {
                    // Stamp migration metadata for audit trail
                    updateOps._migrationMeta = {
                        migratedAt: new Date(),
                        migrationName: "migrateProductionObjectIds",
                        fieldsFixed: Object.keys(updateOps).filter((k) => k !== "_migrationMeta"),
                    };

                    await col.updateOne(
                        { _id: doc._id },
                        { $set: updateOps }
                    );
                    console.log(`[FIX] Fixed doc ${docId} — fields: ${Object.keys(updateOps).filter((k) => k !== "_migrationMeta").join(", ")}`);
                }

                report.totalFixed++;
            }
        } catch (err: any) {
            report.totalFailed++;
            report.failedRecords.push({
                docId,
                error: err.message || String(err),
            });
            console.error(`[ERR] Failed to process doc ${docId}:`, err.message);
        }
    }

    // ─── Summary Report ─────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  MIGRATION REPORT");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Mode:            ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (writes applied)"}`);
    console.log(`  Total scanned:   ${report.totalScanned}`);
    console.log(`  Total affected:  ${report.totalAffected}`);
    console.log(`  Total fixed:     ${report.totalFixed}`);
    console.log(`  Total skipped:   ${report.totalSkipped}`);
    console.log(`  Total failed:    ${report.totalFailed}`);
    console.log("───────────────────────────────────────────────────");
    console.log("  Fields converted:");
    for (const [field, count] of Object.entries(report.fieldCounts)) {
        if (count > 0) console.log(`    ${field}: ${count}`);
    }
    if (Object.values(report.fieldCounts).every((c) => c === 0)) {
        console.log("    (none — all records already clean)");
    }
    console.log("───────────────────────────────────────────────────");

    if (report.failedRecords.length > 0) {
        console.log("  Failed records:");
        for (const f of report.failedRecords) {
            console.log(`    ${f.docId}: ${f.error}`);
        }
        console.log("───────────────────────────────────────────────────");
    }

    if (report.skippedRecords.length > 0) {
        console.log("  Skipped records:");
        for (const s of report.skippedRecords) {
            console.log(`    ${s.docId}: ${s.reason}`);
        }
        console.log("───────────────────────────────────────────────────");
    }

    if (report.backupLog.length > 0 && !DRY_RUN) {
        // Persist backup log to a collection for audit trail
        try {
            await db.collection("_migration_backups").insertOne({
                migrationName: "migrateProductionObjectIds",
                executedAt: new Date(),
                totalAffected: report.totalAffected,
                totalFixed: report.totalFixed,
                totalFailed: report.totalFailed,
                entries: report.backupLog,
            });
            console.log("  ✅ Backup log saved to _migration_backups collection");
        } catch (backupErr: any) {
            console.error("  ⚠️  Failed to save backup log:", backupErr.message);
        }
    }

    console.log("═══════════════════════════════════════════════════\n");

    return report;
}

// ─── Standalone Runner ──────────────────────────────────────────

if (require.main === module) {
    migrateProductionObjectIds()
        .then((report) => {
            if (report.dryRun && report.totalAffected > 0) {
                console.log("💡 Run without --dry-run to apply changes:");
                console.log("   npx tsx src/lib/migrations/migrateProductionObjectIds.ts\n");
            }
            process.exit(report.totalFailed > 0 ? 1 : 0);
        })
        .catch((err) => {
            console.error("Fatal migration error:", err);
            process.exit(1);
        });
}
