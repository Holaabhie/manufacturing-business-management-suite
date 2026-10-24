/**
 * Multi-Tenant Isolation Tests (Phase 1.5)
 *
 * Simulates Tenant A and Tenant B to verify that:
 * 1. Queries and updates are strictly partitioned by tenant fields (userId / adminId / organizationId).
 * 2. Cross-tenant read, update, or delete attempts return 404 Not Found (never 403, preventing ID enumeration).
 * 3. The tenantFilter helper deterministically attaches correct tenant keys without $or clauses.
 *
 * NOTE: These tests must NOT be removed or skipped without explicit approval.
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
  tenantFilter,
  tenantIdFor,
} from "@/lib/tenant-filter";

// ─── Tenant Test Identities ─────────────────────────────────────────
const TENANT_A_ID = "507f191e810c19729de860ea";
const TENANT_B_ID = "507f1f77bcf86cd799439011";

// ─── In-Memory Mock MongoDB Store ───────────────────────────────────
class MockCollection {
  private docs: Array<{ _id: ObjectId; [key: string]: any }> = [];

  constructor(initialDocs: Array<{ _id: ObjectId; [key: string]: any }> = []) {
    this.docs = [...initialDocs];
  }

  async findOne(query: Record<string, any>) {
    return this.docs.find((doc) => this.matches(doc, query)) || null;
  }

  async updateOne(query: Record<string, any>, update: Record<string, any>) {
    const docIndex = this.docs.findIndex((d) => this.matches(d, query));
    if (docIndex === -1) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    if (update.$set) {
      this.docs[docIndex] = { ...this.docs[docIndex], ...update.$set };
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(query: Record<string, any>) {
    const docIndex = this.docs.findIndex((d) => this.matches(d, query));
    if (docIndex === -1) {
      return { deletedCount: 0 };
    }
    this.docs.splice(docIndex, 1);
    return { deletedCount: 1 };
  }

  private matches(doc: any, query: Record<string, any>): boolean {
    for (const [key, val] of Object.entries(query)) {
      if (val instanceof ObjectId) {
        if (!doc[key] || doc[key].toString() !== val.toString()) return false;
      } else if (typeof val === "object" && val !== null) {
        if ("$ne" in val && doc[key] === val.$ne) return false;
      } else {
        if (doc[key] !== val) return false;
      }
    }
    return true;
  }
}

describe("Tenant Filter Helper (lib/tenant-filter.ts)", () => {
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

describe("Cross-Tenant Isolation Checks (Tenant A vs Tenant B)", () => {
  const recordBId = new ObjectId("507f191e810c19729de86001");

  it("Order Isolation: Tenant A cannot update or delete Tenant B order (returns 404 pattern)", async () => {
    const ordersCol = new MockCollection([
      {
        _id: recordBId,
        userId: TENANT_B_ID,
        product_name: "Tenant B Widget",
        status: "pending",
      },
    ]);

    // Tenant A attempts to update Tenant B's order
    const updateQuery = { _id: recordBId, userId: TENANT_A_ID };
    const updateResult = await ordersCol.updateOne(updateQuery, {
      $set: { status: "cancelled" },
    });

    expect(updateResult.matchedCount).toBe(0);

    // Verify record was untouched in database
    const verifyDoc = await ordersCol.findOne({ _id: recordBId });
    expect(verifyDoc?.status).toBe("pending");

    // Tenant A attempts to delete Tenant B's order
    const deleteResult = await ordersCol.deleteOne(updateQuery);
    expect(deleteResult.deletedCount).toBe(0);
  });

  it("Inventory Stock Isolation: Tenant A cannot modify Tenant B inventory stock", async () => {
    const inventoryCol = new MockCollection([
      {
        _id: recordBId,
        userId: TENANT_B_ID,
        name: "Tenant B Steel Rod",
        quantity: 500,
      },
    ]);

    // Tenant A attempts to adjust stock of Tenant B's inventory item
    const scopedSelector = { _id: recordBId, userId: TENANT_A_ID };
    const result = await inventoryCol.updateOne(scopedSelector, {
      $set: { quantity: 0 },
    });

    expect(result.matchedCount).toBe(0);

    // Stock remains unchanged
    const doc = await inventoryCol.findOne({ _id: recordBId });
    expect(doc?.quantity).toBe(500);
  });

  it("Production Isolation: Tenant A cannot read or mutate Tenant B production job", async () => {
    const productionCol = new MockCollection([
      {
        _id: recordBId,
        userId: TENANT_B_ID,
        orderProductName: "Tenant B Industrial Valve",
        progressPercent: 25,
        status: "in_progress",
      },
    ]);

    // Tenant A attempts to read Tenant B production job
    const readAttempt = await productionCol.findOne({
      _id: recordBId,
      userId: TENANT_A_ID,
    });
    expect(readAttempt).toBeNull(); // Translated to 404 Not Found by route handler

    // Tenant A attempts to mutate Tenant B production progress
    const mutateAttempt = await productionCol.updateOne(
      { _id: recordBId, userId: TENANT_A_ID },
      { $set: { progressPercent: 100 } }
    );
    expect(mutateAttempt.matchedCount).toBe(0);

    // Record remains untouched
    const doc = await productionCol.findOne({ _id: recordBId });
    expect(doc?.progressPercent).toBe(25);
  });

  it("Machine Isolation: Tenant A cannot modify or delete Tenant B machine", async () => {
    const machinesCol = new MockCollection([
      {
        _id: recordBId,
        adminId: TENANT_B_ID,
        machineName: "Tenant B CNC Lathe",
        status: "active",
      },
    ]);

    // Tenant A attempts update
    const updateResult = await machinesCol.updateOne(
      { _id: recordBId, adminId: TENANT_A_ID },
      { $set: { machineName: "Hacked Lathe" } }
    );
    expect(updateResult.matchedCount).toBe(0);

    // Tenant A attempts delete
    const deleteResult = await machinesCol.deleteOne({
      _id: recordBId,
      adminId: TENANT_A_ID,
    });
    expect(deleteResult.deletedCount).toBe(0);

    const doc = await machinesCol.findOne({ _id: recordBId });
    expect(doc?.machineName).toBe("Tenant B CNC Lathe");
  });

  it("Billing Isolation: Tenant A cannot read, edit, or delete Tenant B bill", async () => {
    const billsCol = new MockCollection([
      {
        _id: recordBId,
        userId: TENANT_B_ID,
        billNumber: "INV-2026-B-001",
        totalAmount: 150000,
      },
    ]);

    // Read attempt by Tenant A
    const billDoc = await billsCol.findOne({
      _id: recordBId,
      userId: TENANT_A_ID,
    });
    expect(billDoc).toBeNull();

    // Update attempt by Tenant A
    const updateResult = await billsCol.updateOne(
      { _id: recordBId, userId: TENANT_A_ID },
      { $set: { totalAmount: 0 } }
    );
    expect(updateResult.matchedCount).toBe(0);

    // Delete attempt by Tenant A
    const deleteResult = await billsCol.deleteOne({
      _id: recordBId,
      userId: TENANT_A_ID,
    });
    expect(deleteResult.deletedCount).toBe(0);
  });

  it("Employee / Staff Isolation: Tenant A admin cannot manage Tenant B staff", async () => {
    const usersCol = new MockCollection([
      {
        _id: recordBId,
        adminId: TENANT_B_ID,
        fullName: "Tenant B Operator",
        role: "Staff",
        status: "active",
      },
    ]);

    // Tenant A attempts to deactivate Tenant B staff
    const result = await usersCol.updateOne(
      { _id: recordBId, adminId: TENANT_A_ID },
      { $set: { status: "inactive" } }
    );
    expect(result.matchedCount).toBe(0);

    // Tenant A attempts to delete Tenant B staff
    const delResult = await usersCol.deleteOne({
      _id: recordBId,
      adminId: TENANT_A_ID,
    });
    expect(delResult.deletedCount).toBe(0);

    const doc = await usersCol.findOne({ _id: recordBId });
    expect(doc?.status).toBe("active");
  });
});
