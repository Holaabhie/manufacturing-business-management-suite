import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

// ─── Tenant Test Identities ─────────────────────────────────────────
const TENANT_A_ID = "507f191e810c19729de860ea";
const TENANT_B_ID = "507f1f77bcf86cd799439011";

let currentMockUser = {
  _id: new ObjectId(TENANT_A_ID),
  email: "admin@tenanta.com",
  role: "Owner",
  organizationId: TENANT_A_ID,
};

// In-memory mock collections
const mockDbStore: Record<string, any[]> = {
  purchase_orders: [],
  vendors: [],
  vendor_bills: [],
};

function matchesQuery(doc: any, query: Record<string, any>): boolean {
  for (const [key, val] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(val)) {
      const orMatched = val.some((subQuery) => matchesQuery(doc, subQuery));
      if (!orMatched) return false;
    } else if (key === "$and" && Array.isArray(val)) {
      const andMatched = val.every((subQuery) => matchesQuery(doc, subQuery));
      if (!andMatched) return false;
    } else if (val instanceof ObjectId) {
      if (!doc[key] || doc[key].toString() !== val.toString()) return false;
    } else if (typeof val === "object" && val !== null && "$regex" in val) {
      const regex = new RegExp(val.$regex, val.$options || "");
      // Support nested key like "vendor.name"
      const docVal = key.includes(".")
        ? key.split(".").reduce((o, i) => o?.[i], doc)
        : doc[key];
      if (!regex.test(String(docVal ?? ""))) return false;
    } else {
      if (doc[key]?.toString() !== val?.toString()) return false;
    }
  }
  return true;
}

function createMockCollection(name: string) {
  return {
    async countDocuments(query: Record<string, any> = {}) {
      const docs = mockDbStore[name] || [];
      return docs.filter((d) => matchesQuery(d, query)).length;
    },
    find(query: Record<string, any> = {}) {
      let docs = (mockDbStore[name] || []).filter((d) => matchesQuery(d, query));
      let skipVal = 0;
      let limitVal = docs.length;

      return {
        sort(sortObj: Record<string, number>) {
          const entries = Object.entries(sortObj);
          if (entries.length > 0) {
            const sortKey = entries[0][0];
            const sortDir = entries[0][1];
            docs.sort((a, b) => {
              if (a[sortKey] < b[sortKey]) return -1 * sortDir;
              if (a[sortKey] > b[sortKey]) return 1 * sortDir;
              return 0;
            });
          }
          return this;
        },
        skip(s: number) {
          skipVal = s;
          return this;
        },
        limit(l: number) {
          limitVal = l;
          return this;
        },
        async toArray() {
          return docs.slice(skipVal, skipVal + limitVal);
        },
      };
    },
  };
}

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

vi.mock("@/lib/require-role", () => ({
  requireRole: vi.fn(async () => ({ user: currentMockUser })),
  requireAdmin: vi.fn(async () => ({ user: currentMockUser })),
}));

vi.mock("@/modules/purchasing", () => ({
  getPurchasingService: vi.fn(() => ({
    findAllOrders: vi.fn(),
    findAllVendors: vi.fn(),
  })),
}));

vi.mock("@/modules/vendor-bills", () => ({
  getVendorBillTenantUserId: vi.fn(() => TENANT_A_ID),
  getVendorBillService: vi.fn(() => ({
    getSummary: vi.fn(async () => ({
      total_bills: 10,
      total_amount: 50000,
      paid_amount: 30000,
      pending_amount: 20000,
      overdue_amount: 5000,
      draft_bills: 1,
    })),
  })),
}));

// Route handlers
import { GET as getPurchaseOrders } from "@/app/api/purchasing/route";
import { GET as getVendors } from "@/app/api/purchasing/vendors/route";
import { GET as getVendorBills } from "@/app/api/vendor-bills/route";

describe("Phase 4 Pagination & Server-side Hardening: Purchasing & Vendor Bills", () => {
  beforeEach(() => {
    currentMockUser = {
      _id: new ObjectId(TENANT_A_ID),
      email: "admin@tenanta.com",
      role: "Owner",
      organizationId: TENANT_A_ID,
    };

    // Seed purchase orders
    mockDbStore.purchase_orders = [
      {
        _id: new ObjectId("607f191e810c19729de87001"),
        userId: TENANT_A_ID,
        poNumber: "PO-2026-A1",
        vendorName: "Steel Vendor A",
        status: "Pending",
        totalAmount: 12000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: new ObjectId("607f191e810c19729de87002"),
        userId: TENANT_A_ID,
        poNumber: "PO-2026-A2 [Special.*]",
        vendorName: "Copper Vendor A",
        status: "Ordered",
        totalAmount: 8500,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        _id: new ObjectId("607f191e810c19729de87003"),
        userId: TENANT_B_ID,
        poNumber: "PO-2026-B1",
        vendorName: "Steel Vendor B",
        status: "Pending",
        totalAmount: 90000,
        createdAt: "2026-01-03T00:00:00.000Z",
      },
    ];

    // Seed vendors
    mockDbStore.vendors = [
      {
        _id: new ObjectId("607f191e810c19729de88001"),
        userId: TENANT_A_ID,
        name: "Acme Industrial Supplies",
        contactPerson: "Rajesh Sharma",
        phone: "+91-9876543210",
        email: "rajesh@acme.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: new ObjectId("607f191e810c19729de88002"),
        userId: TENANT_B_ID,
        name: "Zenith Metals B",
        contactPerson: "Tenant B Rep",
        phone: "+91-9123456789",
        email: "tenantb@zenith.com",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    // Seed vendor bills
    mockDbStore.vendor_bills = [
      {
        _id: new ObjectId("607f191e810c19729de89001"),
        userId: TENANT_A_ID,
        bill_number: "BILL-2026-001",
        vendor: { name: "Acme Industrial Supplies" },
        status: "pending",
        total_amount: 12000,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: new ObjectId("607f191e810c19729de89002"),
        userId: TENANT_B_ID,
        bill_number: "BILL-2026-B01",
        vendor: { name: "Zenith Metals B" },
        status: "pending",
        total_amount: 55000,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];
  });

  describe("1. Multi-Tenant Isolation Enforcement", () => {
    it("Purchase orders: Tenant A strictly cannot see Tenant B purchase orders", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing?page=1&limit=25");
      const res = await getPurchaseOrders(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data.every((po: any) => po.userId === TENANT_A_ID)).toBe(true);
      expect(body.data.some((po: any) => po.poNumber === "PO-2026-B1")).toBe(false);
    });

    it("Vendors: Tenant A strictly cannot see Tenant B vendors", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing/vendors?page=1&limit=25");
      const res = await getVendors(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].userId).toBe(TENANT_A_ID);
      expect(body.data[0].name).toBe("Acme Industrial Supplies");
    });

    it("Vendor Bills: Tenant A strictly cannot see Tenant B vendor bills", async () => {
      const req = new NextRequest("http://localhost:3000/api/vendor-bills?page=1&limit=25");
      const res = await getVendorBills(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].userId).toBe(TENANT_A_ID);
      expect(body.bills.every((b: any) => b.userId === TENANT_A_ID)).toBe(true);
    });
  });

  describe("2. Parameter Validation & Security (limit=1000 & invalid sort)", () => {
    it("Purchase orders: Rejects limit=1000 with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing?limit=1000");
      const res = await getPurchaseOrders(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("Purchase orders: Rejects non-whitelisted sort field with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing?sort=passwordHash");
      const res = await getPurchaseOrders(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Invalid sort field");
    });

    it("Vendors: Rejects non-whitelisted sort field with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing/vendors?sort=__proto__");
      const res = await getVendors(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("Vendor Bills: Rejects non-whitelisted sort field with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/vendor-bills?sort=dropDatabase");
      const res = await getVendorBills(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Invalid sort field");
    });
  });

  describe("3. Regex Sanitization (escapeRegex ReDoS protection)", () => {
    it("Purchase orders: Escapes special characters without ReDoS or regex errors", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing?page=1&limit=25&q=Special.*");
      const res = await getPurchaseOrders(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].poNumber).toContain("Special.*");
    });
  });

  describe("4. 500-Item Cap & Truncation Headers for Legacy/Unpaginated Requests", () => {
    it("Purchase orders: Unpaginated request returns 500 cap with truncation headers", async () => {
      const req = new NextRequest("http://localhost:3000/api/purchasing");
      const res = await getPurchaseOrders(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Total-Count")).toBe("2");
      expect(res.headers.get("X-Truncated")).toBe("false");
      expect(body.data).toHaveLength(2);
    });

    it("Vendor Bills: Unpaginated request preserves backwards-compatible .bills and .summary", async () => {
      const req = new NextRequest("http://localhost:3000/api/vendor-bills");
      const res = await getVendorBills(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Total-Count")).toBe("1");
      expect(Array.isArray(body.bills)).toBe(true);
      expect(body.summary).toBeDefined();
      expect(body.summary.total_amount).toBe(50000);
    });
  });
});
