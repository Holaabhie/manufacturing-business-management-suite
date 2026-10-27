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

// In-memory mock collection records
const mockDbStore: Record<string, any[]> = {
  clients: [],
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
      if (!regex.test(String(doc[key] ?? ""))) return false;
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
    async findOne(query: Record<string, any>) {
      const docs = mockDbStore[name] || [];
      const found = docs.find((d) => matchesQuery(d, query));
      return found ? { ...found } : null;
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

// Route handler import
import { GET as getClientsList } from "@/app/api/v1/clients/route";

describe("Phase 3b Route Handler Verification: Pagination, Tenants, Sort & Regex", () => {
  beforeEach(() => {
    // Reset seed data
    mockDbStore.clients = [
      {
        _id: new ObjectId("607f191e810c19729de86001"),
        userId: TENANT_A_ID,
        name: "Acme Tenant A1",
        email: "a1@acme.com",
        phone: "+91-9876543210",
        createdAt: new Date("2026-01-01"),
      },
      {
        _id: new ObjectId("607f191e810c19729de86002"),
        userId: TENANT_A_ID,
        name: "Acme Tenant A2 .* Special",
        email: "a2@acme.com",
        phone: "+91-9876543211",
        createdAt: new Date("2026-01-02"),
      },
      {
        _id: new ObjectId("607f191e810c19729de86003"),
        userId: TENANT_B_ID,
        name: "Beta Tenant B1",
        email: "b1@beta.com",
        phone: "+91-9123456780",
        createdAt: new Date("2026-01-03"),
      },
      {
        _id: new ObjectId("607f191e810c19729de86004"),
        userId: TENANT_B_ID,
        name: "Beta Tenant B2",
        email: "b2@beta.com",
        phone: "+91-9123456781",
        createdAt: new Date("2026-01-04"),
      },
      {
        _id: new ObjectId("607f191e810c19729de86005"),
        userId: TENANT_B_ID,
        name: "Beta Tenant B3",
        email: "b3@beta.com",
        phone: "+91-9123456782",
        createdAt: new Date("2026-01-05"),
      },
    ];

    // Default to Tenant A session
    currentMockUser = {
      _id: new ObjectId(TENANT_A_ID),
      email: "admin@tenanta.com",
      role: "Owner",
      organizationId: TENANT_A_ID,
    };
  });

  // (a) Two tenants isolation on actual route handlers
  it("(a) Tenant Isolation: Tenant A sees ONLY Tenant A data and count; Tenant B data is never leaked", async () => {
    // 1. Request as Tenant A
    const reqA = new NextRequest("http://localhost:3000/api/v1/clients?page=1&limit=25");
    const resA = await getClientsList(reqA, {} as any);

    expect(resA.status).toBe(200);
    const bodyA = await resA.json();

    expect(bodyA.success).toBe(true);
    expect(bodyA.data).toHaveLength(2);
    expect(bodyA.pagination.total).toBe(2);
    expect(resA.headers.get("X-Total-Count")).toBe("2");
    expect(bodyA.data.map((c: any) => c.name)).toEqual(["Acme Tenant A1", "Acme Tenant A2 .* Special"]);
    // Confirm zero Tenant B leakage
    expect(bodyA.data.some((c: any) => c.userId === TENANT_B_ID)).toBe(false);

    // 2. Switch session to Tenant B
    currentMockUser = {
      _id: new ObjectId(TENANT_B_ID),
      email: "admin@tenantb.com",
      role: "Owner",
      organizationId: TENANT_B_ID,
    };

    const reqB = new NextRequest("http://localhost:3000/api/v1/clients?page=1&limit=25");
    const resB = await getClientsList(reqB, {} as any);

    expect(resB.status).toBe(200);
    const bodyB = await resB.json();

    expect(bodyB.success).toBe(true);
    expect(bodyB.data).toHaveLength(3);
    expect(bodyB.pagination.total).toBe(3);
    expect(resB.headers.get("X-Total-Count")).toBe("3");
    expect(bodyB.data.map((c: any) => c.name)).toEqual(["Beta Tenant B1", "Beta Tenant B2", "Beta Tenant B3"]);
    // Confirm zero Tenant A leakage
    expect(bodyB.data.some((c: any) => c.userId === TENANT_A_ID)).toBe(false);
  });

  // (b) limit=1000 causes rejection with 400 Bad Request
  it("(b) Limit Threshold: limit=1000 is rejected with 400 Bad Request", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/clients?page=1&limit=1000");
    const res = await getClientsList(req, {} as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/<=100|less than or equal to 100/i);
  });

  // (c) sort=<non-whitelisted> causes rejection with 400 Bad Request
  it("(c) Whitelist Enforcement: non-whitelisted sort field is rejected with 400 Bad Request", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/clients?sort=password_hash");
    const res = await getClientsList(req, {} as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Invalid sort field 'password_hash'");
  });

  // (d) q=".*" searches for literal ".*" and does not act as wildcard
  it("(d) Regex Sanitization: q='.*' is searched as literal string and does not match all items", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/clients?q=.*");
    const res = await getClientsList(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Only "Acme Tenant A2 .* Special" contains literal ".*"
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Acme Tenant A2 .* Special");
    // "Acme Tenant A1" was NOT matched
    expect(body.data.some((c: any) => c.name === "Acme Tenant A1")).toBe(false);
  });
});
