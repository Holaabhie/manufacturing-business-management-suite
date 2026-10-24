import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { verifyRazorpaySignature } from "@/lib/razorpay/server";
import { POST as verifyPaymentHandler } from "@/app/api/verify-payment/route";
import { NextRequest } from "next/server";

const TEST_SECRET = "test_razorpay_secret_key_123456";
process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

// ─── Test Identities ────────────────────────────────────────────────
const USER_A_ID = "507f191e810c19729de8600a";
const USER_B_ID = "507f191e810c19729de8600b";

let currentMockUser: any = {
  _id: new ObjectId(USER_A_ID),
  email: "usera@example.com",
};

const mockDbStore: Record<string, any[]> = {
  payments: [],
  users: [],
  subscriptions: [],
};

function matchesQuery(doc: any, query: Record<string, any>): boolean {
  for (const [key, val] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(val)) {
      const orMatched = val.some((subQuery) => matchesQuery(doc, subQuery));
      if (!orMatched) return false;
      continue;
    }

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
    async updateOne(query: Record<string, any>, update: Record<string, any>, options?: any) {
      const docs = mockDbStore[name] || [];
      let idx = docs.findIndex((d) => matchesQuery(d, query));
      if (idx === -1) {
        if (options?.upsert) {
          const inserted = { _id: new ObjectId(), ...(update.$set || {}), ...(update.$setOnInsert || {}) };
          docs.push(inserted);
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (update.$set) {
        docs[idx] = { ...docs[idx], ...update.$set };
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async findOneAndUpdate(query: Record<string, any>, update: Record<string, any>) {
      const docs = mockDbStore[name] || [];
      const idx = docs.findIndex((d) => matchesQuery(d, query));
      if (idx === -1) {
        return null;
      }
      if (update.$set) {
        docs[idx] = { ...docs[idx], ...update.$set };
      }
      return { ...docs[idx] };
    },
    async insertOne(doc: any) {
      const newDoc = { _id: new ObjectId(), ...doc };
      mockDbStore[name].push(newDoc);
      return { insertedId: newDoc._id };
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
}));

describe("Razorpay Signature Verification (crypto.timingSafeEqual)", () => {
  const orderId = "order_test_12345";
  const paymentId = "pay_test_67890";

  it("verifies matching HMAC-SHA256 signature successfully using timing-safe compare", () => {
    const validSignature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const result = verifyRazorpaySignature(orderId, paymentId, validSignature);
    expect(result).toBe(true);
  });

  it("rejects invalid signature without leaking timing", () => {
    const invalidSignature = "deadbeef".repeat(8);
    const result = verifyRazorpaySignature(orderId, paymentId, invalidSignature);
    expect(result).toBe(false);
  });

  it("safely rejects malformed or different-length signatures", () => {
    expect(verifyRazorpaySignature(orderId, paymentId, "short")).toBe(false);
    expect(verifyRazorpaySignature(orderId, paymentId, "")).toBe(false);
  });
});

describe("/api/verify-payment Endpoint Security", () => {
  const validOrderId = "order_sec_001";
  const validPaymentId = "pay_sec_001";
  const validSignature = crypto
    .createHmac("sha256", TEST_SECRET)
    .update(`${validOrderId}|${validPaymentId}`)
    .digest("hex");

  beforeEach(() => {
    mockDbStore.payments = [
      {
        _id: new ObjectId(),
        userId: USER_A_ID,
        razorpayOrderId: validOrderId,
        amount: 49900,
        currency: "INR",
        plan: "pro_monthly",
        status: "created",
      },
    ];

    mockDbStore.users = [
      {
        _id: new ObjectId(USER_A_ID),
        email: "usera@example.com",
        subscription_tier: "free",
        subscription_status: "inactive",
      },
      {
        _id: new ObjectId(USER_B_ID),
        email: "userb@example.com",
        subscription_tier: "free",
        subscription_status: "inactive",
      },
    ];

    mockDbStore.subscriptions = [];

    currentMockUser = {
      _id: new ObjectId(USER_A_ID),
      email: "usera@example.com",
    };
  });

  it("fails with 400 if orderId does not exist in payments database", async () => {
    const unknownOrderId = "order_unknown_999";
    const sig = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(`${unknownOrderId}|${validPaymentId}`)
      .digest("hex");

    const req = new NextRequest("http://localhost:3000/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: unknownOrderId,
        payment_id: validPaymentId,
        signature: sig,
      }),
    });

    const res = await verifyPaymentHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No order record exists");
  });

  it("fails with 403 when User B attempts to verify an order created by User A", async () => {
    // Current user is User B
    currentMockUser = {
      _id: new ObjectId(USER_B_ID),
      email: "userb@example.com",
    };

    const req = new NextRequest("http://localhost:3000/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: validOrderId,
        payment_id: validPaymentId,
        signature: validSignature,
      }),
    });

    const res = await verifyPaymentHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("does not belong to your account");
  });

  it("verifies valid signature and activates subscription for the owning user", async () => {
    const req = new NextRequest("http://localhost:3000/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: validOrderId,
        payment_id: validPaymentId,
        signature: validSignature,
      }),
    });

    const res = await verifyPaymentHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.subscription_activated).toBe(true);

    // Verify DB was updated
    const userA = mockDbStore.users.find((u) => u._id.toString() === USER_A_ID);
    expect(userA.subscription_tier).toBe("pro");
    expect(userA.subscription_status).toBe("active");
  });

  it("is idempotent: replaying the same payment verification does not double-extend or error", async () => {
    // First verification
    const req1 = new NextRequest("http://localhost:3000/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: validOrderId,
        payment_id: validPaymentId,
        signature: validSignature,
      }),
    });
    const res1 = await verifyPaymentHandler(req1);
    expect(res1.status).toBe(200);

    // Capture period end after first verification
    const userA = mockDbStore.users.find((u) => u._id.toString() === USER_A_ID);
    const firstPeriodEnd = userA.subscription_current_period_end;

    // Second verification attempt (replay attack or double submit)
    const req2 = new NextRequest("http://localhost:3000/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: validOrderId,
        payment_id: validPaymentId,
        signature: validSignature,
      }),
    });
    const res2 = await verifyPaymentHandler(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.idempotent).toBe(true);

    // Period end MUST NOT have changed
    expect(userA.subscription_current_period_end).toEqual(firstPeriodEnd);
  });
});
