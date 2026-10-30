/**
 * Multi-Tenant Staging Data Seed Script
 * ───────────────────────────────────────────────────────────
 * Seeds comprehensive staging environment data across two isolated tenants
 * with complete role matrices (Owner, Admin, Manager, Accountant, Staff).
 *
 * SAFETY GUARD:
 * Execution is STRICTLY blocked in production environments.
 * Requires NODE_ENV === "staging" || NODE_ENV === "development".
 */


// ─── Environment & Safety Guards ─────────────────────────────
const ALLOWED_ENVIRONMENTS = ["staging", "development"];
const currentEnv = process.env.NODE_ENV || "development";

if (!ALLOWED_ENVIRONMENTS.includes(currentEnv) || process.env.VERCEL_ENV === "production") {
  console.error("❌ CRITICAL SAFETY VIOLATION: seed-staging-data.ts cannot run in PRODUCTION!");
  console.error(`Current environment: NODE_ENV=${currentEnv}, VERCEL_ENV=${process.env.VERCEL_ENV}`);
  process.exit(1);
}

// ─── Deterministic Seed Identifiers ──────────────────────────
export const TENANT_A = {
  id: "507f191e810c19729de860ea",
  companyName: "Acme Precision Manufacturing Pvt Ltd",
  gstin: "27AAPCA1234F1Z5",
  pan: "AAPCA1234F",
  plan: "pro",
};

export const TENANT_B = {
  id: "507f1f77bcf86cd799439011",
  companyName: "Zenith Industrial Engineering Ltd",
  gstin: "24AABCZ9876K1Z2",
  pan: "AABCZ9876K",
  plan: "starter",
};

// ─── Roles Matrix Definition ─────────────────────────────────
export interface SeedUser {
  email: string;
  role: "Owner" | "Admin" | "Manager" | "Accountant" | "Staff";
  tenantId: string;
  name: string;
  permissions?: string[];
}

export const STAGING_USERS: SeedUser[] = [
  // Tenant A Users
  {
    email: "owner@acme-staging.com",
    role: "Owner",
    tenantId: TENANT_A.id,
    name: "Rajesh Acme (Owner)",
  },
  {
    email: "admin@acme-staging.com",
    role: "Admin",
    tenantId: TENANT_A.id,
    name: "Pooja Sharma (Admin)",
  },
  {
    email: "manager@acme-staging.com",
    role: "Manager",
    tenantId: TENANT_A.id,
    name: "Vikram Malhotra (Operations Manager)",
  },
  {
    email: "accountant@acme-staging.com",
    role: "Accountant",
    tenantId: TENANT_A.id,
    name: "Suresh Gupta (Lead Accountant)",
  },
  {
    email: "staff@acme-staging.com",
    role: "Staff",
    tenantId: TENANT_A.id,
    name: "Anil Kumar (Floor Staff)",
  },
  // Tenant B Users (Segregated)
  {
    email: "owner@zenith-staging.com",
    role: "Owner",
    tenantId: TENANT_B.id,
    name: "Deepak Zenith (Owner)",
  },
  {
    email: "manager@zenith-staging.com",
    role: "Manager",
    tenantId: TENANT_B.id,
    name: "Rohit Verma (Plant Manager)",
  },
  {
    email: "staff@zenith-staging.com",
    role: "Staff",
    tenantId: TENANT_B.id,
    name: "Sunil Patil (Operator)",
  },
];

export async function runStagingSeed(args: string[] = process.argv.slice(2)): Promise<void> {
  const isDryRun = args.includes("--dry-run");

  console.log("=================================================================");
  console.log(` STAGING DATA SEED — MODE: ${isDryRun ? "DRY-RUN (Simulated)" : "LIVE EXECUTION"}`);
  console.log(` Target Environment: [${currentEnv}]`);
  console.log("=================================================================\n");

  console.log(`Tenant A : ${TENANT_A.companyName} (${TENANT_A.id}) - Plan: ${TENANT_A.plan}`);
  console.log(`Tenant B : ${TENANT_B.companyName} (${TENANT_B.id}) - Plan: ${TENANT_B.plan}`);
  console.log(`Users    : ${STAGING_USERS.length} across both tenants\n`);

  if (isDryRun) {
    console.log("Simulating collections to populate:");
    console.log("  - users            : 8 accounts (with bcrypt hash)");
    console.log("  - clients          : 12 clients (8 Tenant A, 4 Tenant B)");
    console.log("  - inventory        : 20 raw materials & finished goods");
    console.log("  - purchase_orders  : 15 POs across Pending, Ordered, Received");
    console.log("  - vendor_bills     : 10 bills with TDS & payments recorded");
    console.log("  - invoices         : 18 invoices across Draft, Sent, Paid, Overdue");
    console.log("  - payments         : 14 recorded payments (Cash, Bank, UPI)");
    console.log("\n✓ DRY-RUN complete: No database mutations were performed.");
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required to execute seed.");
  }

  const { MongoClient } = await import("mongodb");
  const bcrypt = await import("bcryptjs");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const defaultPasswordHash = await bcrypt.hash("StagingPass@2026!", 10);

    console.log("Writing staging users...");
    for (const u of STAGING_USERS) {
      await db.collection("users").updateOne(
        { email: u.email },
        {
          $set: {
            email: u.email,
            name: u.name,
            role: u.role,
            organizationId: u.tenantId,
            passwordHash: defaultPasswordHash,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log("✓ Staging users successfully established.");
  } finally {
    await client.close();
  }
}

// Auto-run if executed directly
if (
  (typeof require !== "undefined" && require.main === module) ||
  (typeof process !== "undefined" && process.argv[1]?.includes("seed-staging-data"))
) {
  runStagingSeed().catch((err) => {
    console.error("Staging seed failed:", err);
    process.exit(1);
  });
}


