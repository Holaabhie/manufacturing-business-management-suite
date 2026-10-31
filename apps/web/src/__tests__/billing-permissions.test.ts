/**
 * Billing Permissions Matrix & RBAC Tests
 *
 * Verifies permission-based authorization for all billing routes:
 * 1. GET /api/billing and GET /api/v1/billing (requires invoices.view)
 * 2. GET /api/billing/[id] and GET /api/v1/billing/[id] (requires invoices.view)
 * 3. POST /api/billing and POST /api/v1/billing (requires invoices.create)
 * 4. PUT /api/billing/[id] and PUT /api/v1/billing/[id] (dynamic: markPaid -> invoices.markPaid, send -> invoices.send, edit -> invoices.create)
 * 5. DELETE /api/billing/[id] and DELETE /api/v1/billing/[id] (requires invoices.delete)
 *
 * Role Matrix:
 * - Owner / Admin: Full bypass (200 / 201)
 * - Accountant: Full access via preset (200 / 201 across all operations)
 * - Manager: Read-only (GET: 200, mutations: 403)
 * - Staff (default): Blocked (all: 403)
 * - Staff (custom with invoices.view): Read-only (GET: 200, mutations: 403)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

import { GET as getBillsLegacy, POST as postBillLegacy } from "@/app/api/billing/route";
import { GET as getBillLegacy, PUT as putBillLegacy, DELETE as deleteBillLegacy } from "@/app/api/billing/[id]/route";
import { GET as getBillsV1, POST as postBillV1 } from "@/app/api/v1/billing/route";
import { GET as getBillV1, PUT as putBillV1, DELETE as deleteBillV1 } from "@/app/api/v1/billing/[id]/route";

const TENANT_ID = "507f191e810c19729de860ea";
const BILL_ID = "507f191e810c19729de860eb";
const emptyCtx: any = { params: Promise.resolve({}) };

let currentMockUser: any = null;
const mockBillsStore: any[] = [];

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: vi.fn(async () => currentMockUser),
  getDataOwnerId: vi.fn((user: any) => user?.organizationId || user?.userId || TENANT_ID),
}));

vi.mock("@/lib/with-idempotency", () => ({
  withIdempotency: (handler: any) => handler,
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => ({
      find: () => ({
        sort: () => ({
          toArray: async () => mockBillsStore,
        }),
        toArray: async () => mockBillsStore,
      }),
      async findOne(query: Record<string, any>) {
        if (name === "bills") {
          if (query._id) {
            return mockBillsStore.find((b) => b._id.toString() === query._id.toString()) || null;
          }
          if (query.billNumber) {
            return mockBillsStore.find((b) => b.billNumber === query.billNumber) || null;
          }
          return mockBillsStore[0] || null;
        }
        return null;
      },
      async insertOne(doc: Record<string, any>) {
        const _id = new ObjectId();
        const inserted = { _id, ...doc };
        mockBillsStore.push(inserted);
        return { insertedId: _id };
      },
      async updateOne(query: Record<string, any>, update: Record<string, any>) {
        const targetId = query._id?.toString() || BILL_ID;
        const bill = mockBillsStore.find((b) => b._id.toString() === targetId);
        if (bill && update.$set) {
          Object.assign(bill, update.$set);
          return { matchedCount: 1, modifiedCount: 1 };
        }
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async deleteOne(query: Record<string, any>) {
        const targetId = query._id?.toString() || BILL_ID;
        const idx = mockBillsStore.findIndex((b) => b._id.toString() === targetId);
        if (idx !== -1) {
          mockBillsStore.splice(idx, 1);
        }
        return { deletedCount: 1 };
      },
    }),
  })),
}));

vi.mock("@/modules/billing", () => ({
  getBillingService: vi.fn(() => ({
    findAll: async () => mockBillsStore,
    findById: async () => mockBillsStore[0] || { id: BILL_ID, billNumber: "INV-001" },
    create: async (_tenantId: string, data: any) => ({ id: BILL_ID, ...data }),
    update: async (_id: string, _tenantId: string, data: any) => ({ id: BILL_ID, ...data }),
    delete: async () => {},
  })),
}));

vi.mock("@/shared/middleware/rate-limiter", () => ({
  withRateLimit: (handler: any) => handler,
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  triggerNotification: vi.fn(async () => {}),
}));

describe("Billing RBAC & Granular Permission Matrix", () => {
  beforeEach(() => {
    mockBillsStore.length = 0;
    mockBillsStore.push({
      _id: new ObjectId(BILL_ID),
      id: BILL_ID,
      userId: TENANT_ID,
      billNumber: "INV-2026-001",
      billDate: "2026-04-01",
      clientName: "Acme Corp",
      totalAmount: 50000,
      status: "draft",
      created_at: new Date().toISOString(),
    });
  });

  function makeReq(url: string, method = "GET", body?: any): NextRequest {
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ─── 1. OWNER / ADMIN ROLE ───────────────────────────────────────
  describe("Owner / Admin Role", () => {
    it("Owner has full access to all billing routes", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Owner",
        organizationId: TENANT_ID,
      };

      // Legacy GET /api/billing
      const resGetLegacy = await getBillsLegacy();
      expect(resGetLegacy.status).toBe(200);

      // Legacy POST /api/billing
      const resPostLegacy = await postBillLegacy(makeReq("http://localhost:3000/api/billing", "POST", {
        billNumber: "INV-OWNER-1",
        totalAmount: 1000,
      }), emptyCtx);
      expect(resPostLegacy.status).toBe(200);

      // Legacy GET /api/billing/[id]
      const resGetIdLegacy = await getBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resGetIdLegacy.status).toBe(200);

      // Legacy PUT /api/billing/[id]
      const resPutLegacy = await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", {
        status: "paid",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resPutLegacy.status).toBe(200);

      // Legacy DELETE /api/billing/[id]
      const resDelLegacy = await deleteBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resDelLegacy.status).toBe(200);

      // v1 GET /api/v1/billing
      const resGetV1 = await getBillsV1(makeReq("http://localhost:3000/api/v1/billing"), emptyCtx);
      expect(resGetV1.status).toBe(200);

      // v1 POST /api/v1/billing
      const resPostV1 = await postBillV1(makeReq("http://localhost:3000/api/v1/billing", "POST", { totalAmount: 1000 }), emptyCtx);
      expect(resPostV1.status).toBe(201);

      // v1 PUT /api/v1/billing/[id]
      const resPutV1 = await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", { status: "paid" }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resPutV1.status).toBe(200);

      // v1 DELETE /api/v1/billing/[id]
      const resDelV1 = await deleteBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resDelV1.status).toBe(204);
    });
  });

  // ─── 2. ACCOUNTANT ROLE ──────────────────────────────────────────
  describe("Accountant Role", () => {
    it("Accountant has full billing access via role presets (Page + API end-to-end)", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Accountant",
        organizationId: TENANT_ID,
      };

      // GET /api/billing -> 200
      const getRes = await getBillsLegacy();
      expect(getRes.status).toBe(200);

      // POST /api/billing -> 200
      const postRes = await postBillLegacy(makeReq("http://localhost:3000/api/billing", "POST", {
        billNumber: "INV-ACC-1",
        totalAmount: 25000,
      }), emptyCtx);
      expect(postRes.status).toBe(200);

      // PUT /api/billing/[id] with status: "paid" -> 200
      const putRes = await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", {
        status: "paid",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(putRes.status).toBe(200);

      // DELETE /api/billing/[id] -> 200
      const delRes = await deleteBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(delRes.status).toBe(200);

      // v1 routes: GET -> 200, POST -> 201, PUT -> 200, DELETE -> 204
      expect((await getBillsV1(makeReq("http://localhost:3000/api/v1/billing"), emptyCtx)).status).toBe(200);
      expect((await postBillV1(makeReq("http://localhost:3000/api/v1/billing", "POST", { totalAmount: 200 }), emptyCtx)).status).toBe(201);
      expect((await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", { status: "sent" }), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(200);
      expect((await deleteBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(204);
    });
  });

  // ─── 3. MANAGER ROLE ─────────────────────────────────────────────
  describe("Manager Role (Read-Only on Invoices)", () => {
    it("Manager can view invoices (200) but cannot create, update, or delete (403)", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Manager",
        organizationId: TENANT_ID,
      };

      // GET /api/billing -> 200 OK (Manager has invoices.view: true)
      const getRes = await getBillsLegacy();
      expect(getRes.status).toBe(200);

      // GET /api/billing/[id] -> 200 OK
      const getIdRes = await getBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(getIdRes.status).toBe(200);

      // v1 GET /api/v1/billing -> 200 OK
      const getV1Res = await getBillsV1(makeReq("http://localhost:3000/api/v1/billing"), emptyCtx);
      expect(getV1Res.status).toBe(200);

      // POST /api/billing -> 403 Forbidden
      const postRes = await postBillLegacy(makeReq("http://localhost:3000/api/billing", "POST", {
        billNumber: "INV-MGR-FAIL",
        totalAmount: 12000,
      }), emptyCtx);
      expect(postRes.status).toBe(403);

      // v1 POST /api/v1/billing -> 403 Forbidden
      const postV1Res = await postBillV1(makeReq("http://localhost:3000/api/v1/billing", "POST", { totalAmount: 12000 }), emptyCtx);
      expect(postV1Res.status).toBe(403);

      // PUT /api/billing/[id] -> 403 Forbidden
      const putRes = await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", {
        status: "paid",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(putRes.status).toBe(403);

      // v1 PUT /api/v1/billing/[id] -> 403 Forbidden
      const putV1Res = await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", { status: "paid" }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(putV1Res.status).toBe(403);

      // DELETE /api/billing/[id] -> 403 Forbidden
      const delRes = await deleteBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(delRes.status).toBe(403);

      // v1 DELETE /api/v1/billing/[id] -> 403 Forbidden
      const delV1Res = await deleteBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(delV1Res.status).toBe(403);
    });
  });

  // ─── 4. STAFF DEFAULT ROLE ───────────────────────────────────────
  describe("Staff Default Role", () => {
    it("Default Staff is blocked (403) from all billing endpoints", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Staff",
        organizationId: TENANT_ID,
      };

      // GET /api/billing -> 403
      expect((await getBillsLegacy()).status).toBe(403);

      // GET /api/billing/[id] -> 403
      expect((await getBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);

      // POST /api/billing -> 403
      expect((await postBillLegacy(makeReq("http://localhost:3000/api/billing", "POST", {}), emptyCtx)).status).toBe(403);

      // PUT /api/billing/[id] -> 403
      expect((await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", { status: "paid" }), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);

      // DELETE /api/billing/[id] -> 403
      expect((await deleteBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);

      // v1 GET -> 403
      expect((await getBillsV1(makeReq("http://localhost:3000/api/v1/billing"), emptyCtx)).status).toBe(403);

      // v1 POST -> 403
      expect((await postBillV1(makeReq("http://localhost:3000/api/v1/billing", "POST", {}), emptyCtx)).status).toBe(403);

      // v1 PUT -> 403
      expect((await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", { status: "paid" }), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);

      // v1 DELETE -> 403
      expect((await deleteBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);
    });
  });

  // ─── 5. STAFF CUSTOM PERMISSIONS ─────────────────────────────────
  describe("Staff Custom Permissions", () => {
    it("Staff with invoices.view custom permission can view but not mutate", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Staff",
        organizationId: TENANT_ID,
        customPermissions: {
          "invoices.view": true,
        },
      };

      // GET /api/billing -> 200
      expect((await getBillsLegacy()).status).toBe(200);

      // v1 GET /api/v1/billing -> 200
      expect((await getBillsV1(makeReq("http://localhost:3000/api/v1/billing"), emptyCtx)).status).toBe(200);

      // POST -> 403
      expect((await postBillLegacy(makeReq("http://localhost:3000/api/billing", "POST", {}), emptyCtx)).status).toBe(403);

      // PUT -> 403
      expect((await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", { status: "paid" }), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);

      // DELETE -> 403
      expect((await deleteBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "DELETE"), {
        params: Promise.resolve({ id: BILL_ID }),
      })).status).toBe(403);
    });

    it("Fine-grained mutation keys: user with only invoices.markPaid can mark paid but not general edit", async () => {
      currentMockUser = {
        _id: new ObjectId(),
        role: "Staff",
        organizationId: TENANT_ID,
        customPermissions: {
          "invoices.view": true,
          "invoices.markPaid": true,
        },
      };

      // PUT with status: "paid" -> 200 OK
      const resPaid = await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", {
        status: "paid",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resPaid.status).toBe(200);

      // PUT with general edit (requires invoices.create) -> 403
      const resEdit = await putBillLegacy(makeReq(`http://localhost:3000/api/billing/${BILL_ID}`, "PUT", {
        notes: "Updated terms",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resEdit.status).toBe(403);
      const jsonEdit = await resEdit.json();
      expect(jsonEdit.error).toContain("invoices.create");

      // v1 PUT with status: "paid" -> 200 OK
      const resPaidV1 = await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", {
        status: "paid",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resPaidV1.status).toBe(200);

      // v1 PUT with general edit -> 403
      const resEditV1 = await putBillV1(makeReq(`http://localhost:3000/api/v1/billing/${BILL_ID}`, "PUT", {
        notes: "Updated terms",
      }), {
        params: Promise.resolve({ id: BILL_ID }),
      });
      expect(resEditV1.status).toBe(403);
    });
  });
});
