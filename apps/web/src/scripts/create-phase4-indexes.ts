/**
 * Phase 3b Index Creation & Optimization Plan (PROPOSAL & DRY-RUN)
 * ───────────────────────────────────────────────────────────
 * Proposes optimized compound indexes for Orders, Clients, and Inventory.
 *
 * NOTE ON MONGODB 4.2+:
 * `{ background: true }` has been removed. In MongoDB 4.2 and higher, the
 * background option is deprecated and ignored. All index builds obtain an exclusive
 * lock only at the beginning and end of the build, allowing concurrent read/write
 * operations throughout the build process automatically.
 *
 * SAFETY NOTICE:
 * - Defaults to DRY-RUN mode.
 * - Does NOT execute index creation unless --apply flag is explicitly provided.
 *
 * Usage:
 *   npx tsx apps/web/src/scripts/create-phase4-indexes.ts --dry-run
 *   npx tsx apps/web/src/scripts/create-phase4-indexes.ts --apply
 */

import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

export interface IndexDefinition {
  collection: string;
  name: string;
  keys: Record<string, 1 | -1>;
  options: {
    name: string;
    sparse?: boolean;
  };
  rationale: string;
}

export const PROPOSED_INDEXES: IndexDefinition[] = [
  // ─── Orders Collection (Max 3) ─────────────────────────────────
  {
    collection: "orders",
    name: "idx_orders_tenant_created",
    keys: { userId: 1, createdAt: -1 },
    options: { name: "idx_orders_tenant_created" },
    rationale: "Accelerates default tenant-isolated order listing sorted by creation date descending.",
  },
  {
    collection: "orders",
    name: "idx_orders_tenant_status_created",
    keys: { userId: 1, status: 1, createdAt: -1 },
    options: { name: "idx_orders_tenant_status_created" },
    rationale: "Optimizes status-filtered tabs (e.g. pending, in_progress, completed) sorted by newest first.",
  },
  {
    collection: "orders",
    name: "idx_orders_tenant_client_created",
    keys: { userId: 1, client_id: 1, createdAt: -1 },
    options: { name: "idx_orders_tenant_client_created" },
    rationale: "Speeds up client detail order histories and statement ledger reconciliation without sparse penalty.",
  },

  // ─── Clients Collection (Max 2) ────────────────────────────────
  {
    collection: "clients",
    name: "idx_clients_tenant_name",
    keys: { userId: 1, name: 1 },
    options: { name: "idx_clients_tenant_name" },
    rationale: "Eliminates in-memory sort for tenant client listings sorted alphabetically (A-Z).",
  },
  {
    collection: "clients",
    name: "idx_clients_tenant_created",
    keys: { userId: 1, createdAt: -1 },
    options: { name: "idx_clients_tenant_created" },
    rationale: "Optimizes recent client onboarding views and audits.",
  },

  // ─── Inventory Collection (Max 2) ──────────────────────────────
  {
    collection: "inventory",
    name: "idx_inventory_tenant_name",
    keys: { userId: 1, name: 1 },
    options: { name: "idx_inventory_tenant_name" },
    rationale: "Accelerates inventory alphabetized item tables and lightweight option dropdowns.",
  },
  {
    collection: "inventory",
    name: "idx_inventory_tenant_quantity",
    keys: { userId: 1, quantity: 1 },
    options: { name: "idx_inventory_tenant_quantity" },
    rationale: "Accelerates sorting inventory by quantity ascending or descending.",
  },
  // ─── Idempotency Keys Collection (Max 2) ────────────────────────
  {
    collection: "idempotency_keys",
    name: "idx_idempotency_key_user",
    keys: { key: 1, userId: 1 },
    options: { name: "idx_idempotency_key_user" },
    rationale: "Enforces uniqueness of idempotency keys per user/tenant to prevent duplicate submissions.",
  },
  {
    collection: "idempotency_keys",
    name: "idx_idempotency_expires",
    keys: { expiresAt: 1 },
    options: { name: "idx_idempotency_expires" },
    rationale: "TTL index to automatically purge idempotency records after 24 hours.",
  },
];

export async function runIndexProposal(args: string[] = process.argv.slice(2)): Promise<void> {
  const isApply = args.includes("--apply");
  const isDryRun = args.includes("--dry-run") || !isApply;

  console.log("=================================================================");
  console.log(` PHASE 3b INDEX PLAN — MODE: ${isDryRun ? "DRY-RUN (Proposal Only)" : "LIVE APPLY"}`);
  console.log(" Note: { background: true } omitted (ignored in MongoDB 4.2+)");
  console.log("=================================================================\n");

  const collections = ["orders", "clients", "inventory", "idempotency_keys"];
  
  const collectionStats: Record<string, { count: number; hostType: string }> = {
    orders: { count: 0, hostType: "unknown" },
    clients: { count: 0, hostType: "unknown" },
    inventory: { count: 0, hostType: "unknown" },
    idempotency_keys: { count: 0, hostType: "unknown" },
  };

  const uri = process.env.MONGODB_URI;
  let detectedHostType = "not_configured";
  if (uri) {
    detectedHostType = uri.includes("localhost") || uri.includes("127.0.0.1") ? "local" : "remote (Atlas/Cloud)";
  }

  if (uri && !isDryRun) {
    let client: MongoClient | null = null;
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000, connectTimeoutMS: 2000 });
      await client.connect();
      const db = client.db();
      for (const col of collections) {
        try {
          const count = await db.collection(col).estimatedDocumentCount();
          collectionStats[col] = { count, hostType: detectedHostType };
        } catch {
          // fallback
        }
      }
    } catch (e: unknown) {
      console.warn("Could not connect to inspect live counts:", (e as Error).message);
    } finally {
      if (client) {
        await client.close().catch(() => {});
      }
    }
  }

  for (const col of collections) {
    const stats = collectionStats[col];
    console.log(`-----------------------------------------------------------------`);
    console.log(` COLLECTION: [${col}] (Estimated Documents: ${stats?.count ?? "N/A"})`);
    console.log(`-----------------------------------------------------------------`);

    const colIndexes = PROPOSED_INDEXES.filter((i) => i.collection === col);
    for (const idx of colIndexes) {
      console.log(`  * Index Name : ${idx.name}`);
      console.log(`    Keys       : ${JSON.stringify(idx.keys)}`);
      console.log(`    Options    : ${idx.options.sparse ? "sparse=true" : "none"}`);
      console.log(`    Rationale  : ${idx.rationale}`);
      console.log();
    }
  }

  if (isDryRun) {
    console.log("=================================================================");
    console.log("DRY-RUN COMPLETE: 0 indexes created. No mutations executed.");
    console.log(`Total Proposed Indexes: ${PROPOSED_INDEXES.length}`);
    console.log("To apply in production after maintenance review, run with --apply.");
    console.log("=================================================================");
    process.exit(0);
  }

  console.log("Connecting to database to apply indexes...");
  try {
    const { getDb } = await import("@/lib/mongodb");
    const db = await getDb();

    for (const idx of PROPOSED_INDEXES) {
      console.log(`Creating index ${idx.name} on ${idx.collection}...`);
      await db.collection(idx.collection).createIndex(idx.keys, idx.options);
      console.log(`✓ Index ${idx.name} successfully established.`);
    }
    console.log("\nAll Phase 3b compound indexes applied successfully.");
  } catch (error) {
    console.error("Index creation failed:", error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (
  (typeof require !== "undefined" && require.main === module) ||
  (typeof process !== "undefined" && process.argv[1]?.includes("create-phase4-indexes"))
) {
  runIndexProposal().catch(console.error);
}
