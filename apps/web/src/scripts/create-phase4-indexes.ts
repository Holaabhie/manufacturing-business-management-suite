/**
 * Phase 4 Index Creation & Optimization Script (PROPOSAL ONLY)
 * ───────────────────────────────────────────────────────────
 * Proposes and automates compound index creation for Orders, Clients, and Inventory.
 *
 * SAFETY NOTICE:
 * - Defaults to DRY-RUN mode.
 * - Does NOT execute index creation unless --apply flag is explicitly provided.
 * - Uses { background: true } by default to prevent blocking operational database queries.
 *
 * Usage:
 *   npx tsx apps/web/src/scripts/create-phase4-indexes.ts --dry-run
 *   npx tsx apps/web/src/scripts/create-phase4-indexes.ts --apply (requires explicit confirmation)
 */

export interface IndexDefinition {
  collection: string;
  name: string;
  keys: Record<string, 1 | -1>;
  options: {
    background: boolean;
    name: string;
    sparse?: boolean;
  };
  rationale: string;
}

export const PROPOSED_INDEXES: IndexDefinition[] = [
  // ─── Orders Collection ─────────────────────────────────────────
  {
    collection: "orders",
    name: "idx_orders_tenant_created",
    keys: { userId: 1, createdAt: -1 },
    options: { background: true, name: "idx_orders_tenant_created" },
    rationale: "Accelerates default tenant-isolated order listing sorted by creation date descending.",
  },
  {
    collection: "orders",
    name: "idx_orders_tenant_status_created",
    keys: { userId: 1, status: 1, createdAt: -1 },
    options: { background: true, name: "idx_orders_tenant_status_created" },
    rationale: "Optimizes status-filtered tabs (e.g. pending, in_progress, completed) within tenant.",
  },
  {
    collection: "orders",
    name: "idx_orders_tenant_client_created",
    keys: { userId: 1, client_id: 1, createdAt: -1 },
    options: { background: true, name: "idx_orders_tenant_client_created", sparse: true },
    rationale: "Speeds up client detail order histories and statement reconciliation.",
  },
  {
    collection: "orders",
    name: "idx_orders_tenant_product",
    keys: { userId: 1, product_name: 1 },
    options: { background: true, name: "idx_orders_tenant_product" },
    rationale: "Provides prefix scan for product name searches within tenant orders.",
  },

  // ─── Clients Collection ────────────────────────────────────────
  {
    collection: "clients",
    name: "idx_clients_tenant_name",
    keys: { userId: 1, name: 1 },
    options: { background: true, name: "idx_clients_tenant_name" },
    rationale: "Eliminates in-memory sort for tenant client listings sorted alphabetically.",
  },
  {
    collection: "clients",
    name: "idx_clients_tenant_phone",
    keys: { userId: 1, phone: 1 },
    options: { background: true, name: "idx_clients_tenant_phone", sparse: true },
    rationale: "Instant phone-number lookup during WhatsApp notification dispatch and customer search.",
  },
  {
    collection: "clients",
    name: "idx_clients_tenant_created",
    keys: { userId: 1, createdAt: -1 },
    options: { background: true, name: "idx_clients_tenant_created" },
    rationale: "Optimizes recent client onboarding views and audits.",
  },

  // ─── Inventory Collection ──────────────────────────────────────
  {
    collection: "inventory",
    name: "idx_inventory_tenant_name",
    keys: { userId: 1, name: 1 },
    options: { background: true, name: "idx_inventory_tenant_name" },
    rationale: "Accelerates inventory alphabetized item tables and material selection dropdowns.",
  },
  {
    collection: "inventory",
    name: "idx_inventory_tenant_lowstock",
    keys: { userId: 1, quantity: 1, min_stock_level: 1 },
    options: { background: true, name: "idx_inventory_tenant_lowstock" },
    rationale: "Optimizes dashboard low-stock warning queries and reorder forecast computations.",
  },
  {
    collection: "inventory",
    name: "idx_inventory_tenant_created",
    keys: { userId: 1, createdAt: -1 },
    options: { background: true, name: "idx_inventory_tenant_created" },
    rationale: "Supports chronologically sorted inventory audits.",
  },
];

export async function runIndexProposal(args: string[] = process.argv.slice(2)): Promise<void> {
  const isApply = args.includes("--apply");
  const isDryRun = args.includes("--dry-run") || !isApply;

  console.log("=================================================================");
  console.log(` PHASE 4 INDEX PLAN — MODE: ${isDryRun ? "DRY-RUN (Proposal Only)" : "LIVE APPLY"}`);
  console.log("=================================================================\n");

  for (const idx of PROPOSED_INDEXES) {
    console.log(`[Collection: ${idx.collection}]`);
    console.log(`  Index Name : ${idx.name}`);
    console.log(`  Keys       : ${JSON.stringify(idx.keys)}`);
    console.log(`  Options    : background=${idx.options.background}${idx.options.sparse ? ", sparse=true" : ""}`);
    console.log(`  Rationale  : ${idx.rationale}\n`);
  }

  if (isDryRun) {
    console.log("-----------------------------------------------------------------");
    console.log("DRY-RUN COMPLETE: No changes were made to the database.");
    console.log("To apply in production after maintenance review, run with --apply.");
    console.log("-----------------------------------------------------------------");
    return;
  }

  console.log("Connecting to database to apply indexes in background...");
  try {
    const { getDb } = await import("@/lib/mongodb");
    const db = await getDb();

    for (const idx of PROPOSED_INDEXES) {
      console.log(`Creating index ${idx.name} on ${idx.collection}...`);
      await db.collection(idx.collection).createIndex(idx.keys, idx.options);
      console.log(`✓ Index ${idx.name} successfully established.`);
    }
    console.log("\nAll Phase 4 compound indexes applied successfully.");
  } catch (error) {
    console.error("Index creation failed:", error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (typeof require !== "undefined" && require.main === module) {
  runIndexProposal().catch(console.error);
}
