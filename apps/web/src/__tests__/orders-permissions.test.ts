/**
 * Orders RBAC & Permissions Unit/Integration Tests
 *
 * Verifies that:
 * 1. Default Staff without "orders.edit" permission receives 403 Forbidden on PUT /api/orders/[id].
 * 2. Staff granted custom permission "orders.edit: true" by Owner can successfully PUT /api/orders/[id].
 * 3. Owner/Admin can always edit orders without explicit custom permissions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { PUT as updateOrderHandler } from "@/app/api/orders/[id]/route";

const TENANT_ID = "507f191e810c19729de860ea";
const ORDER_ID = "507f191e810c19729de860eb";

let currentMockUser: any = {
  _id: new ObjectId(),
  email: "staff@example.com",
  role: "Staff",
  organizationId: TENANT_ID,
  userId: TENANT_ID,
  customPermissions: undefined,
};

const mockOrdersStore: any[] = [];

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: vi.fn(async () => currentMockUser),
  getDataOwnerId: vi.fn((user: any) => user?.organizationId || user?.userId || TENANT_ID),
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => ({
      async findOne(query: Record<string, any>) {
        if (name === "orders") {
          return mockOrdersStore.find((o) => o._id.toString() === query._id?.toString()) || null;
        }
        return null;
      },
      async updateOne(query: Record<string, any>, update: Record<string, any>) {
        if (name === "orders") {
          const idx = mockOrdersStore.findIndex((o) => o._id.toString() === query._id?.toString());
          if (idx !== -1) {
            if (update.$set) Object.assign(mockOrdersStore[idx], update.$set);
            return { matchedCount: 1, modifiedCount: 1 };
          }
        }
        return { matchedCount: 0, modifiedCount: 0 };
      },
    }),
  })),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  triggerNotification: vi.fn(async () => {}),
}));

describe("Orders [id] PUT Permission Enforcement", () => {
  beforeEach(() => {
    mockOrdersStore.length = 0;
    mockOrdersStore.push({
      _id: new ObjectId(ORDER_ID),
      userId: TENANT_ID,
      organizationId: TENANT_ID,
      product_name: "Original Widget",
      status: "pending",
    });
  });

  it("default Staff without custom permissions is blocked with 403 Forbidden", async () => {
    currentMockUser = {
      _id: new ObjectId(),
      email: "staff_default@example.com",
      role: "Staff",
      organizationId: TENANT_ID,
      userId: TENANT_ID,
      customPermissions: undefined,
    };

    const req = new Request(`http://localhost:3000/api/orders/${ORDER_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: "Staff Hacked Widget" }),
    });

    const res = await updateOrderHandler(req, {
      params: Promise.resolve({ id: ORDER_ID }),
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Forbidden: You do not have permission to edit orders");

    // Verify order was not modified in DB
    expect(mockOrdersStore[0].product_name).toBe("Original Widget");
  });

  it("Staff with custom 'orders.edit: true' can successfully edit order", async () => {
    currentMockUser = {
      _id: new ObjectId(),
      email: "staff_authorized@example.com",
      role: "Staff",
      organizationId: TENANT_ID,
      userId: TENANT_ID,
      customPermissions: {
        "orders.edit": true,
      },
    };

    const req = new Request(`http://localhost:3000/api/orders/${ORDER_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: "Staff Updated Widget" }),
    });

    const res = await updateOrderHandler(req, {
      params: Promise.resolve({ id: ORDER_ID }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify order was updated in DB
    expect(mockOrdersStore[0].product_name).toBe("Staff Updated Widget");
  });

  it("Owner/Admin can edit orders without explicit custom permissions", async () => {
    currentMockUser = {
      _id: new ObjectId(),
      email: "owner@example.com",
      role: "Owner",
      organizationId: TENANT_ID,
      userId: TENANT_ID,
      customPermissions: undefined,
    };

    const req = new Request(`http://localhost:3000/api/orders/${ORDER_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: "Owner Updated Widget" }),
    });

    const res = await updateOrderHandler(req, {
      params: Promise.resolve({ id: ORDER_ID }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockOrdersStore[0].product_name).toBe("Owner Updated Widget");
  });
});
