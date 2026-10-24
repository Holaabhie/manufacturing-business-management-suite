import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as sendOtpHandler } from "@/app/api/auth/send-otp/route";
import { performance } from "perf_hooks";

// ─── Mock DB ────────────────────────────────────────────────────────
const mockUsers = [
  {
    phone: "+919876543210",
    phone_number: "+919876543210",
    status: "active",
  },
];

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => ({
      async findOne(query: Record<string, any>) {
        if (name === "users") {
          const candidates = query?.$or?.flatMap((c: any) => c.phone?.$in || c.phone_number?.$in || []) || [];
          return mockUsers.find((u) => candidates.includes(u.phone)) || null;
        }
        return null;
      },
      async updateOne() {
        return { matchedCount: 1, modifiedCount: 1 };
      },
    }),
  })),
}));

// Mock rate limiting to never throttle during tests
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitMongo: vi.fn(async () => ({ limited: false, retryAfterMs: 0 })),
  getHashedRateLimitKey: vi.fn(() => "test-hashed-key"),
  getClientIpFromRequest: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => ({ status: 429 })),
  RATE_LIMITS: {
    otpIp: { windowMs: 60000, maxRequests: 100 },
    otpPhone: { windowMs: 60000, maxRequests: 100 },
    otpCooldown: { windowMs: 60000, maxRequests: 100 },
  },
}));

// Mock verification service with an intentionally high network latency (250ms)
const mockStartVerification = vi.fn(async () => {
  // Simulate slow external SMS provider API (Twilio / Gateway network hop)
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { status: "pending" };
});

vi.mock("@/services/verification.service", () => ({
  getVerificationService: vi.fn(() => ({
    startVerification: mockStartVerification,
  })),
}));

describe("OTP Timing Side-Channel Defense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures response latency is uniform regardless of whether account exists", async () => {
    const existingPhone = "+919876543210";
    const nonExistingPhone = "+919123456789";

    // 1. Measure Existing User Latency
    const reqExisting = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: existingPhone, purpose: "login" }),
    });

    const startExisting = performance.now();
    const resExisting = await sendOtpHandler(reqExisting);
    const durationExisting = performance.now() - startExisting;

    expect(resExisting.status).toBe(200);

    // 2. Measure Non-Existing User Latency
    const reqNonExisting = new Request("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: nonExistingPhone, purpose: "login" }),
    });

    const startNonExisting = performance.now();
    const resNonExisting = await sendOtpHandler(reqNonExisting);
    const durationNonExisting = performance.now() - startNonExisting;

    expect(resNonExisting.status).toBe(200);

    // 3. Verification:
    // Even though the SMS provider has a 250ms latency, the response returned immediately
    // because dispatch is scheduled via after().
    expect(durationExisting).toBeLessThan(100); // Should be well below 250ms
    expect(durationNonExisting).toBeLessThan(100);

    // Latency differential should be minimal (typically < 30ms jitter)
    const diff = Math.abs(durationExisting - durationNonExisting);
    expect(diff).toBeLessThan(50);
  });
});
