/**
 * Tenant Field Backfill Inspection Script (Dry-Run Only)
 * 
 * Inspects all core collections for missing, null, or type-mismatched tenant fields.
 * NEVER mutates data. Purely read-only diagnostic tool.
 */
import { getDb } from "@/lib/mongodb";
import { COLLECTION_TENANT_MAP } from "@/lib/tenant-filter";

export interface InspectionResult {
  collection: string;
  expectedField: string;
  expectedType: "string" | "objectId";
  totalDocuments: number;
  missingTenantField: number;
  nullTenantField: number;
  stringTypeCount: number;
  objectIdTypeCount: number;
  mismatchedTypeCount: number;
}

export async function checkTenantBackfillDryRun(): Promise<InspectionResult[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Could not connect to database");
  }

  const results: InspectionResult[] = [];

  for (const [colName, meta] of Object.entries(COLLECTION_TENANT_MAP)) {
    try {
      const col = db.collection(colName);
      const totalDocuments = await col.countDocuments({});
      if (totalDocuments === 0) continue;

      const missingTenantField = await col.countDocuments({
        [meta.field]: { $exists: false },
      });

      const nullTenantField = await col.countDocuments({
        [meta.field]: null,
      });

      const stringTypeCount = await col.countDocuments({
        [meta.field]: { $type: "string" },
      });

      const objectIdTypeCount = await col.countDocuments({
        [meta.field]: { $type: "objectId" },
      });

      const mismatchedTypeCount =
        meta.type === "string" ? objectIdTypeCount : stringTypeCount;

      results.push({
        collection: colName,
        expectedField: meta.field,
        expectedType: meta.type,
        totalDocuments,
        missingTenantField,
        nullTenantField,
        stringTypeCount,
        objectIdTypeCount,
        mismatchedTypeCount,
      });
    } catch (err: any) {
      console.warn(`Could not inspect collection ${colName}:`, err.message);
    }
  }

  return results;
}

// Self-invoking when run from CLI
if (require.main === module || process.argv.includes("--dry-run")) {
  console.log("Running Tenant Backfill Check (DRY-RUN ONLY - NO WRITES)...");
  checkTenantBackfillDryRun()
    .then((results) => {
      console.log("\n| Collection | Tenant Field | Expected Type | Total Docs | Missing | Null | Stored as String | Stored as ObjectId | Mismatched Type |");
      console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |");
      for (const r of results) {
        console.log(
          `| ${r.collection} | \`${r.expectedField}\` | ${r.expectedType} | ${r.totalDocuments} | ${r.missingTenantField} | ${r.nullTenantField} | ${r.stringTypeCount} | ${r.objectIdTypeCount} | ${r.mismatchedTypeCount} |`
        );
      }
      console.log("\n[DRY RUN COMPLETE] Zero documents were modified.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backfill dry-run failed:", err);
      process.exit(1);
    });
}
