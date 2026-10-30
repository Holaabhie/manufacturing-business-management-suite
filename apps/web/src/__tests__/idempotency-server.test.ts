import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withIdempotency } from "@/lib/with-idempotency";

interface MockIdempotencyDoc {
  key: string;
  userId: string;
  method: string;
  path: string;
  requestHash: string | null;
  statusCode: number;
  responseBody: Record<string, unknown>;
  status: "processing" | "completed";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mockStore: { idempotency_keys: MockIdempotencyDoc[] } = {
  idempotency_keys: [],
};

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => {
      if (name !== "idempotency_keys") throw new Error(`Unexpected collection: ${name}`);
      return {
        createIndex: vi.fn(async () => "index_created"),
        findOne: vi.fn(async (query: { key: string; userId: string }) => {
          const found = mockStore.idempotency_keys.find(
            (d) => d.key === query.key && d.userId === query.userId
          );
          return found ? { ...found } : null;
        }),
        insertOne: vi.fn(async (doc: MockIdempotencyDoc) => {
          const duplicate = mockStore.idempotency_keys.find(
            (d) => d.key === doc.key && d.userId === doc.userId
          );
          if (duplicate) {
            const err = new Error("E11000 duplicate key error");
            (err as any).code = 11000;
            throw err;
          }
          mockStore.idempotency_keys.push({ ...doc });
          return { insertedId: "mock_id" };
        }),
        updateOne: vi.fn(
          async (
            query: { key: string; userId: string },
            update: { $set: Partial<MockIdempotencyDoc> }
          ) => {
            const idx = mockStore.idempotency_keys.findIndex(
              (d) => d.key === query.key && d.userId === query.userId
            );
            if (idx !== -1) {
              mockStore.idempotency_keys[idx] = {
                ...mockStore.idempotency_keys[idx],
                ...update.$set,
              };
              return { matchedCount: 1, modifiedCount: 1 };
            }
            return { matchedCount: 0, modifiedCount: 0 };
          }
        ),
        deleteOne: vi.fn(async (query: { key: string; userId: string }) => {
          const initialLen = mockStore.idempotency_keys.length;
          mockStore.idempotency_keys = mockStore.idempotency_keys.filter(
            (d) => !(d.key === query.key && d.userId === query.userId)
          );
          return { deletedCount: initialLen - mockStore.idempotency_keys.length };
        }),
      };
    },
  })),
}));

describe("Server-side Idempotency Verification (withIdempotency & idempotency_keys)", () => {
  beforeEach(() => {
    mockStore.idempotency_keys = [];
    vi.clearAllMocks();
  });

  const validKey1 = "123e4567-e89b-42d3-a456-426614174000";
  const validKey2 = "987fcdeb-51a2-43f7-9876-ba0987654321";

  it("executes handler on first request and caches the snapshot in idempotency_keys collection", async () => {
    let handlerExecutionCount = 0;
    const testHandler = withIdempotency(
      async (req: NextRequest) => {
        handlerExecutionCount++;
        const body = await req.json();
        return NextResponse.json({ success: true, paymentId: "pay_101", amount: body.amount }, { status: 201 });
      },
      { getUserId: async () => "tenant_user_1" }
    );

    const req = new NextRequest("http://localhost:3000/api/v1/payments/record", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": validKey1,
      },
      body: JSON.stringify({ amount: 5000, mode: "Cash" }),
    });

    const res = await testHandler(req, {} as any);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.paymentId).toBe("pay_101");
    expect(data.amount).toBe(5000);
    expect(handlerExecutionCount).toBe(1);

    // Verify persisted record in collection
    expect(mockStore.idempotency_keys.length).toBe(1);
    expect(mockStore.idempotency_keys[0].key).toBe(validKey1);
    expect(mockStore.idempotency_keys[0].status).toBe("completed");
    expect(mockStore.idempotency_keys[0].statusCode).toBe(201);
  });

  it("returns cached response on duplicate request with same key without re-running payment handler (prevents double-charge)", async () => {
    let handlerExecutionCount = 0;
    const testHandler = withIdempotency(
      async (req: NextRequest) => {
        handlerExecutionCount++;
        const body = await req.json();
        return NextResponse.json({ success: true, paymentId: "pay_102", amount: body.amount }, { status: 200 });
      },
      { getUserId: async () => "tenant_user_1" }
    );

    const makeRequest = () =>
      new NextRequest("http://localhost:3000/api/v1/payments/record", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": validKey1,
        },
        body: JSON.stringify({ amount: 7500 }),
      });

    // Request 1
    const res1 = await testHandler(makeRequest(), {} as any);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.paymentId).toBe("pay_102");
    expect(handlerExecutionCount).toBe(1);

    // Request 2 (Duplicate click)
    const res2 = await testHandler(makeRequest(), {} as any);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.paymentId).toBe("pay_102");
    expect(data2._idempotent).toBe(true);
    // Handler MUST NOT have run a second time
    expect(handlerExecutionCount).toBe(1);
  });

  it("blocks concurrent in-flight requests with 409 IDEMPOTENCY_CONCURRENT", async () => {
    let resolveFirstHandler: (value: any) => void;
    const firstHandlerWait = new Promise((resolve) => {
      resolveFirstHandler = resolve;
    });

    const testHandler = withIdempotency(
      async (req: NextRequest) => {
        await firstHandlerWait;
        return NextResponse.json({ success: true, done: true });
      },
      { getUserId: async () => "tenant_user_1" }
    );

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/v1/payments/record", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": validKey1,
        },
        body: JSON.stringify({ amount: 1000 }),
      });

    // Start first request (holds in "processing" state)
    const promise1 = testHandler(makeReq(), {} as any);

    // Give microtask tick to let createIdempotencyKey execute
    await new Promise((r) => setTimeout(r, 10));

    // Second request while first is still processing
    const res2 = await testHandler(makeReq(), {} as any);
    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.code).toBe("IDEMPOTENCY_CONCURRENT");

    // Resolve first request
    resolveFirstHandler!({});
    const res1 = await promise1;
    expect(res1.status).toBe(200);
  });

  it("cleans up key if handler throws an error, allowing safe retry", async () => {
    let shouldFail = true;
    const testHandler = withIdempotency(
      async () => {
        if (shouldFail) {
          throw new Error("Downstream payment gateway timeout");
        }
        return NextResponse.json({ success: true, retried: true });
      },
      { getUserId: async () => "tenant_user_1" }
    );

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/v1/payments/record", {
        method: "POST",
        headers: { "idempotency-key": validKey1 },
        body: JSON.stringify({ amount: 100 }),
      });

    // Attempt 1 fails
    await expect(testHandler(makeReq(), {} as any)).rejects.toThrow("Downstream payment gateway timeout");
    expect(mockStore.idempotency_keys.length).toBe(0); // Cleaned up

    // Attempt 2 succeeds
    shouldFail = false;
    const res2 = await testHandler(makeReq(), {} as any);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.retried).toBe(true);
    expect(mockStore.idempotency_keys.length).toBe(1);
    expect(mockStore.idempotency_keys[0].status).toBe("completed");
  });

  it("handles different idempotency keys independently", async () => {
    let count = 0;
    const testHandler = withIdempotency(
      async () => {
        count++;
        return NextResponse.json({ count });
      },
      { getUserId: async () => "tenant_user_1" }
    );

    const reqA = new NextRequest("http://localhost:3000/api/v1/payments/record", {
      method: "POST",
      headers: { "idempotency-key": validKey1 },
      body: JSON.stringify({}),
    });
    const reqB = new NextRequest("http://localhost:3000/api/v1/payments/record", {
      method: "POST",
      headers: { "idempotency-key": validKey2 },
      body: JSON.stringify({}),
    });

    const resA = await testHandler(reqA, {} as any);
    const resB = await testHandler(reqB, {} as any);

    expect((await resA.json()).count).toBe(1);
    expect((await resB.json()).count).toBe(2);
    expect(mockStore.idempotency_keys.length).toBe(2);
  });
});
