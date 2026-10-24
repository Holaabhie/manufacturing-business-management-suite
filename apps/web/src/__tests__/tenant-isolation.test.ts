/**
 * Multi-Tenant Isolation Integration Tests (Phase 1.5 - A2 Verification)
 *
 * Calls the ACTUAL Next.js route handlers directly (importing GET/PUT/PATCH/DELETE)
 * with mocked MongoDB and Session stores to verify that:
 * 1. An authenticated Tenant A CANNOT read, mutate, stock-adjust, or delete Tenant B's data.
 * 2. Cross-tenant access returns 404 Not Found (never 403, preventing ID enumeration).
 * 3. Matched records are never modified across tenant boundaries.
 *
 * NOTE: These tests must NOT be removed or skipped without explicit approval.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { tenantFilter, tenantIdFor } from "@/lib/tenant-filter";

// ─── Tenant Test Identities ─────────────────────────────────────────
const TENANT_A_ID = "507f191e810c19729de860ea";
const TENANT_B_ID = "507f1f77bcf86cd799439011";

// ─── Dynamic Session & DB State ─────────────────────────────────────
let currentMockUser = {
  _id: new ObjectId(TENANT_A_ID),
  email: "admin@tenanta.com",
  role: "Owner",
  organizationId: TENANT_A_ID,
};

// In-memory collection records
const mockDbStore: Record<string, any[]> = {
  inventory: [],
  machines: [],
  bills: [],
  clients: [],
  productions: [],
  activity: [],
  orders: [],
  users: [],
};

// Helper to match queries
function matchesQuery(doc: any, query: Record<string, any>): boolean {
  for (const [key, val] of Object.entries(query)) {
    if (val instanceof ObjectId) {
      if (!doc[key] || doc[key].toString() !== val.toString()) return false;
    } else if (typeof val === "object" && val !== null) {
      if ("$ne" in val && doc[key]?.toString() === val.$ne?.toString()) return false;
    } else {
      if (doc[key]?.toString() !== val?.toString()) return false;
    }
  }
  return true;
}

function createMockCollection(name: string) {
  return {
    async findOne(query: Record<string, any>) {
      const docs = mockDbStore[name] || [];
      const found = docs.find((d) => matchesQuery(d, query));
      return found ? { ...found } : null;
    },
    async updateOne(query: Record<string, any>, update: Record<string, any>) {
      const docs = mockDbStore[name] || [];
      const idx = docs.findIndex((d) => matchesQuery(d, query));
      if (idx === -1) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (update.$set) {
        mockDbStore[name][idx] = { ...mockDbStore[name][idx], ...update.$set };
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async deleteOne(query: Record<string, any>) {
      const docs = mockDbStore[name] || [];
      const idx = docs.findIndex((d) => matchesQuery(d, query));
      if (idx === -1) {
        return { deletedCount: 0 };
      }
      mockDbStore[name].splice(idx, 1);
      return { deletedCount: 1 };
    },
    async insertOne(doc: any) {
      const newDoc = { _id: new ObjectId(), ...doc };
      mockDbStore[name].push(newDoc);
      return { insertedId: newDoc._id };
    },
  };
}

// ─── Module Mocks ───────────────────────────────────────────────────
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => createMockCollection(name),
  })),
  isDbUnavailableError: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: vi.fn(async () => currentMockUser),
  getDataOwnerId: vi.fn((user: any) => user?._id?.toString() || user?.organizationId || TENANT_A_ID),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  triggerNotification: vi.fn(async () => {}),
}));

// ─── Actual Route Handler Imports ───────────────────────────────────
import { PATCH as updateInventoryStock } from "@/app/api/inventory/[id]/stock/route";
import { PUT as updateMachine, DELETE as deleteMachine } from "@/app/api/machines/[id]/route";
import { GET as getBill, PUT as updateBill, DELETE as deleteBill } from "@/app/api/billing/[id]/route";
import { DELETE as deleteClient } from "@/app/api/clients/[id]/route";
import { PUT as updateOrder, DELETE as deleteOrder } from "@/app/api/orders/[id]/route";
import { PUT as updateUser } from "@/app/api/users/[id]/route";
import { POST as updateProductionProgress } from "@/app/api/production/progress/update/route";

describe("Tenant Filter Helper Unit Tests (lib/tenant-filter.ts)", () => {
  it("maps known collections to correct tenant field names", () => {
    expect(tenantIdFor("clients").field).toBe("userId");
    expect(tenantIdFor("inventory").field).toBe("userId");
    expect(tenantIdFor("orders").field).toBe("userId");
    expect(tenantIdFor("productions").field).toBe("userId");
    expect(tenantIdFor("bills").field).toBe("userId");
    expect(tenantIdFor("payments").field).toBe("userId");
    expect(tenantIdFor("machines").field).toBe("adminId");
    expect(tenantIdFor("users").field).toBe("adminId");
    expect(tenantIdFor("auditlogs").field).toBe("organizationId");
  });

  it("produces scoped query filters with zero $or clauses", () => {
    const query = { _id: new ObjectId(TENANT_B_ID) };
    const filtered = tenantFilter(TENANT_A_ID, "clients", query);

    expect(filtered).toEqual({
      _id: query._id,
      userId: TENANT_A_ID,
    });
    expect((filtered as any).$or).toBeUndefined();
  });

  it("handles collections with adminId tenant keys", () => {
    const query = { status: "active" };
    const filtered = tenantFilter(TENANT_A_ID, "machines", query);

    expect(filtered).toEqual({
      status: "active",
      adminId: TENANT_A_ID,
    });
    expect((filtered as any).$or).toBeUndefined();
  });

  it("defaults unmapped collections safely to userId", () => {
    const filtered = tenantFilter(TENANT_A_ID, "unknown_table", {});
    expect(filtered).toEqual({
      userId: TENANT_A_ID,
    });
  });
});

describe("Actual Route Handlers: Cross-Tenant Isolation Enforcement", () => {
  const itemBId = new ObjectId("607f191e810c19729de86001");
  const machineBId = new ObjectId("607f191e810c19729de86002");
  const billBId = new ObjectId("607f191e810c19729de86003");
  const clientBId = new ObjectId("607f191e810c19729de86004");
  const orderBId = new ObjectId("607f191e810c19729de86005");
  const userBId = new ObjectId("607f191e810c19729de86006");
  const productionBId = new ObjectId("607f191e810c19729de86007");

  beforeEach(() => {
    // Reset DB with records owned strictly by Tenant B
    mockDbStore.inventory = [
      {
        _id: itemBId,
        userId: TENANT_B_ID,
        name: "Tenant B Aluminum Ingot",
        quantity: 250,
        unit: "kg",
        min_stock_level: 10,
      },
    ];

    mockDbStore.machines = [
      {
        _id: machineBId,
        adminId: TENANT_B_ID,
        machineName: "Tenant B Milling Machine",
        status: "active",
      },
    ];

    mockDbStore.bills = [
      {
        _id: billBId,
        userId: TENANT_B_ID,
        billNumber: "BILL-TB-999",
        totalAmount: 50000,
        status: "pending",
      },
    ];

    mockDbStore.clients = [
      {
        _id: clientBId,
        userId: TENANT_B_ID,
        name: "Tenant B VIP Client",
      },
    ];

    mockDbStore.orders = [
      {
        _id: orderBId,
        userId: TENANT_B_ID,
        product_name: "Tenant B Industrial Valve",
        status: "pending",
      },
    ];

    mockDbStore.users = [
      {
        _id: userBId,
        adminId: TENANT_B_ID,
        fullName: "Tenant B Operator",
        role: "Staff",
        status: "active",
      },
    ];

    mockDbStore.productions = [
      {
        _id: productionBId,
        userId: TENANT_B_ID,
        orderProductName: "Tenant B Valve Batch",
        producedQty: 10,
        status: "in_progress",
      },
    ];

    mockDbStore.activity = [];

    // Authenticated caller is Tenant A
    currentMockUser = {
      _id: new ObjectId(TENANT_A_ID),
      email: "admin@tenanta.com",
      role: "Owner",
      organizationId: TENANT_A_ID,
    };
  });

  it("Inventory Route Handler: Tenant A PATCH /stock on Tenant B item returns 404 and does not modify stock", async () => {
    const req = new Request("http://localhost:3000/api/inventory/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deduct", quantity: 50 }),
    });

    const response = await updateInventoryStock(req, {
      params: Promise.resolve({ id: itemBId.toString() }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Inventory item not found");

    // Verify Tenant B's stock was NEVER changed
    expect(mockDbStore.inventory[0].quantity).toBe(250);
  });

  it("Machines Route Handler: Tenant A PUT on Tenant B machine returns 404 and does not update", async () => {
    const req = new Request("http://localhost:3000/api/machines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineName: "Attacker Malicious Machine" }),
    });

    const response = await updateMachine(req, {
      params: Promise.resolve({ id: machineBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.machines[0].machineName).toBe("Tenant B Milling Machine");
  });

  it("Machines Route Handler: Tenant A DELETE on Tenant B machine returns 404 and does not delete", async () => {
    const req = new Request("http://localhost:3000/api/machines", {
      method: "DELETE",
    });

    const response = await deleteMachine(req, {
      params: Promise.resolve({ id: machineBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.machines.length).toBe(1);
    expect(mockDbStore.machines[0]._id.toString()).toBe(machineBId.toString());
  });

  it("Billing Route Handler: Tenant A GET /api/billing/[id] on Tenant B bill returns 404", async () => {
    const req = new Request("http://localhost:3000/api/billing", { method: "GET" });

    const response = await getBill(req as any, {
      params: Promise.resolve({ id: billBId.toString() }),
    });

    expect(response.status).toBe(404);
  });

  it("Billing Route Handler: Tenant A PUT /api/billing/[id] on Tenant B bill returns 404", async () => {
    const req = new Request("http://localhost:3000/api/billing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAmount: 0 }),
    });

    const response = await updateBill(req as any, {
      params: Promise.resolve({ id: billBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.bills[0].totalAmount).toBe(50000);
  });

  it("Billing Route Handler: Tenant A DELETE /api/billing/[id] on Tenant B bill returns 404", async () => {
    const req = new Request("http://localhost:3000/api/billing", { method: "DELETE" });

    const response = await deleteBill(req as any, {
      params: Promise.resolve({ id: billBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.bills.length).toBe(1);
  });

  it("Clients Route Handler: Tenant A DELETE on Tenant B client returns 404 and does not delete", async () => {
    const req = new Request("http://localhost:3000/api/clients", { method: "DELETE" });

    const response = await deleteClient(req, {
      params: Promise.resolve({ id: clientBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.clients.length).toBe(1);
  });

  it("Orders Route Handler: Tenant A PUT on Tenant B order returns 404 and does not update", async () => {
    const req = new Request("http://localhost:3000/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const response = await updateOrder(req, {
      params: Promise.resolve({ id: orderBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.orders[0].status).toBe("pending");
  });

  it("Orders Route Handler: Tenant A DELETE on Tenant B order returns 404 and does not delete", async () => {
    const req = new Request("http://localhost:3000/api/orders", { method: "DELETE" });

    const response = await deleteOrder(req, {
      params: Promise.resolve({ id: orderBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.orders.length).toBe(1);
  });

  it("Users Route Handler: Tenant A PUT on Tenant B user returns 404 and does not update role", async () => {
    const req = new Request("http://localhost:3000/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Admin" }),
    });

    const response = await updateUser(req, {
      params: Promise.resolve({ id: userBId.toString() }),
    });

    expect(response.status).toBe(404);
    expect(mockDbStore.users[0].role).toBe("Staff");
  });

  it("Production Progress Route Handler: Tenant A POST on Tenant B production returns 404", async () => {
    const req = new Request("http://localhost:3000/api/production/progress/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productionId: productionBId.toString(), producedQty: 50 }),
    });

    const response = await updateProductionProgress(req);

    expect(response.status).toBe(404);
    expect(mockDbStore.productions[0].producedQty).toBe(10);
  });
});

describe("Route Tenant Guard Checklist (A3 Guard)", () => {
  const fs = require("fs");
  const path = require("path");

  const auditedRoutes = [
    "inventory/[id]/stock/route.ts",
    "production/[id]/route.ts",
    "production/progress/update/route.ts",
    "machines/[id]/route.ts",
    "orders/[id]/route.ts",
    "billing/[id]/route.ts",
    "clients/[id]/route.ts",
    "users/[id]/route.ts",
  ];

  it("verifies that all audited mutating routes use tenantFilter for scoped operations", () => {
    for (const relPath of auditedRoutes) {
      const fullPath = path.resolve(__dirname, "../app/api", relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify tenantFilter is imported and invoked in each route
      expect(content).toContain("tenantFilter");
      expect(content).not.toMatch(/findOne\(\s*\{\s*_id:\s*new ObjectId\(id\)\s*\}\s*\)/);
    }
  });
});
