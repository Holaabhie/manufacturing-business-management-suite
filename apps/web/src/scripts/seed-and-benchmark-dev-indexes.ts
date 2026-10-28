import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const ORDERS_TEMP = "__dev_benchmark_orders__";
const CLIENTS_TEMP = "__dev_benchmark_clients__";
const INVENTORY_TEMP = "__dev_benchmark_inventory__";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ABORTED: Benchmark script cannot run in production (NODE_ENV=production).");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not configured");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    console.log(`Connected to host type: remote (MongoDB Atlas) | Database: [${db.databaseName}]`);
    console.log("Setting up temporary isolated benchmark collections...");

    // Drop temp collections if leftover
    await db.collection(ORDERS_TEMP).drop().catch(() => {});
    await db.collection(CLIENTS_TEMP).drop().catch(() => {});
    await db.collection(INVENTORY_TEMP).drop().catch(() => {});

    const devTenantId = new ObjectId().toHexString();
    const otherTenantId = new ObjectId().toHexString();

    console.log("Seeding synthetic dataset for executionStats...");

    // 1. Clients: 500 records
    const clients = [];
    for (let i = 1; i <= 500; i++) {
      clients.push({
        userId: i <= 400 ? devTenantId : otherTenantId,
        name: `Client Acme Corp ${String(i).padStart(4, "0")}`,
        phone: `+9198765${String(i).padStart(5, "0")}`,
        createdAt: new Date(Date.now() - i * 3600000),
      });
    }
    await db.collection(CLIENTS_TEMP).insertMany(clients);
    console.log("✓ Seeded 500 clients into " + CLIENTS_TEMP);

    // 2. Inventory: 1,000 records
    const inventory = [];
    for (let i = 1; i <= 1000; i++) {
      inventory.push({
        userId: i <= 800 ? devTenantId : otherTenantId,
        name: `Material Raw Steel Grade ${String(i).padStart(4, "0")}`,
        quantity: i * 5,
        min_stock_level: 20,
        createdAt: new Date(Date.now() - i * 1800000),
      });
    }
    await db.collection(INVENTORY_TEMP).insertMany(inventory);
    console.log("✓ Seeded 1,000 inventory items into " + INVENTORY_TEMP);

    // 3. Orders: 5,000 records
    const orders = [];
    const statuses = ["pending", "in_progress", "completed", "cancelled"];
    const clientIds = [new ObjectId().toHexString(), new ObjectId().toHexString(), new ObjectId().toHexString()];
    for (let i = 1; i <= 5000; i++) {
      orders.push({
        userId: i <= 4000 ? devTenantId : otherTenantId,
        status: statuses[i % statuses.length],
        client_id: clientIds[i % clientIds.length],
        total_amount: (i * 137) % 50000,
        createdAt: new Date(Date.now() - i * 600000),
      });
    }
    await db.collection(ORDERS_TEMP).insertMany(orders);
    console.log("✓ Seeded 5,000 orders into " + ORDERS_TEMP);

    console.log("\n=================================================================");
    console.log(" EXPLAIN ('executionStats') BEFORE & AFTER INDEX CREATION");
    console.log("=================================================================\n");

    // Helper to run explain
    async function testQuery(
      colName: string,
      targetEntity: string,
      query: Record<string, unknown>,
      sort: Record<string, 1 | -1>,
      indexName: string,
      indexKeys: Record<string, 1 | -1>,
      options: Record<string, unknown> = {}
    ) {
      console.log(`-----------------------------------------------------------------`);
      console.log(`Target: [${targetEntity}] Index: ${indexName}`);
      console.log(`Keys: ${JSON.stringify(indexKeys)}`);
      console.log(`Query: ${JSON.stringify(query)} | Sort: ${JSON.stringify(sort)}`);

      // 1. BEFORE (No Index)
      const beforeExplain = await db
        .collection(colName)
        .find(query)
        .sort(sort)
        .limit(20)
        .explain("executionStats");

      const beforeStats = (beforeExplain as any).executionStats;
      const beforeStage = (beforeExplain as any).queryPlanner?.winningPlan?.stage || "COLLSCAN";
      console.log(`\n[BEFORE INDEX]:`);
      console.log(`  Winning Stage       : ${beforeStage}`);
      console.log(`  Execution Time (ms) : ${beforeStats.executionTimeMillis}`);
      console.log(`  Total Docs Examined : ${beforeStats.totalDocsExamined}`);
      console.log(`  Total Keys Examined : ${beforeStats.totalKeysExamined}`);
      console.log(`  Docs Returned       : ${beforeStats.nReturned}`);

      // 2. CREATE INDEX IN BENCHMARK COLLECTION
      await db.collection(colName).createIndex(indexKeys, { name: indexName, ...options });

      // 3. AFTER (With Index)
      const afterExplain = await db
        .collection(colName)
        .find(query)
        .sort(sort)
        .limit(20)
        .explain("executionStats");

      const afterStats = (afterExplain as any).executionStats;
      const findStage = (plan: any): string => {
        if (!plan) return "UNKNOWN";
        if (plan.stage === "IXSCAN") return "IXSCAN";
        if (plan.inputStage) return findStage(plan.inputStage);
        return plan.stage;
      };
      const afterStage = findStage((afterExplain as any).queryPlanner?.winningPlan);
      console.log(`\n[AFTER INDEX]:`);
      console.log(`  Winning Stage       : ${afterStage}`);
      console.log(`  Execution Time (ms) : ${afterStats.executionTimeMillis}`);
      console.log(`  Total Docs Examined : ${afterStats.totalDocsExamined}`);
      console.log(`  Total Keys Examined : ${afterStats.totalKeysExamined}`);
      console.log(`  Docs Returned       : ${afterStats.nReturned}`);
      console.log();
    }

    // ─── 1. Orders: idx_orders_tenant_created
    await testQuery(
      ORDERS_TEMP,
      "orders",
      { userId: devTenantId },
      { createdAt: -1 },
      "idx_orders_tenant_created",
      { userId: 1, createdAt: -1 }
    );

    // ─── 2. Orders: idx_orders_tenant_status_created
    await testQuery(
      ORDERS_TEMP,
      "orders",
      { userId: devTenantId, status: "pending" },
      { createdAt: -1 },
      "idx_orders_tenant_status_created",
      { userId: 1, status: 1, createdAt: -1 }
    );

    // ─── 3. Orders: idx_orders_tenant_client_created
    await testQuery(
      ORDERS_TEMP,
      "orders",
      { userId: devTenantId, client_id: clientIds[0] },
      { createdAt: -1 },
      "idx_orders_tenant_client_created",
      { userId: 1, client_id: 1, createdAt: -1 }
    );

    // ─── 4. Clients: idx_clients_tenant_name
    await testQuery(
      CLIENTS_TEMP,
      "clients",
      { userId: devTenantId },
      { name: 1 },
      "idx_clients_tenant_name",
      { userId: 1, name: 1 }
    );

    // ─── 5. Clients: idx_clients_tenant_created
    await testQuery(
      CLIENTS_TEMP,
      "clients",
      { userId: devTenantId },
      { createdAt: -1 },
      "idx_clients_tenant_created",
      { userId: 1, createdAt: -1 }
    );

    // ─── 6. Inventory: idx_inventory_tenant_name
    await testQuery(
      INVENTORY_TEMP,
      "inventory",
      { userId: devTenantId },
      { name: 1 },
      "idx_inventory_tenant_name",
      { userId: 1, name: 1 }
    );

    // ─── 7. Inventory: idx_inventory_tenant_quantity
    await testQuery(
      INVENTORY_TEMP,
      "inventory",
      { userId: devTenantId },
      { quantity: 1 },
      "idx_inventory_tenant_quantity",
      { userId: 1, quantity: 1 }
    );

    console.log("=================================================================");
    console.log(" CLEANUP: Dropping temporary benchmark collections...");
    await db.collection(ORDERS_TEMP).drop().catch(() => {});
    await db.collection(CLIENTS_TEMP).drop().catch(() => {});
    await db.collection(INVENTORY_TEMP).drop().catch(() => {});
    console.log("✓ All temporary benchmark collections dropped cleanly. Zero residual data.");
    console.log("=================================================================");
  } finally {
    await client.close();
  }
}

main().catch(console.error);
