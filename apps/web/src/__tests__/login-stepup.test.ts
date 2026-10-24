import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import { POST as loginHandler } from "@/app/api/auth/login/route";

// ─── Test Identities & Mock DB ──────────────────────────────────────
const ADMIN_EMAIL = "admin_stepup@example.com";
const ADMIN_PASSWORD = "CorrectPassword123!";
const ADMIN_PHONE = "+919876543210";
let passwordHash = "";

let rateLimitsStore = new Map<string, any>();

const mockUser: any = {
  _id: "admin_user_001",
  email: ADMIN_EMAIL,
  phone: ADMIN_PHONE,
  role: "Admin",
  status: "active",
  failedLoginAttempts: 0,
};

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) => ({
      async findOne(query: Record<string, any>) {
        if (name === "users") {
          if (query.email === ADMIN_EMAIL) {
            return { ...mockUser, passwordHash };
          }
        }
        if (name === "rate_limits") {
          const entry = rateLimitsStore.get(query._id);
          if (entry && entry.expiresAt > new Date()) {
            return entry;
          }
          return null;
        }
        return null;
      },
      async updateOne(query: Record<string, any>, update: Record<string, any>, opts?: any) {
        if (name === "rate_limits") {
          const existing = rateLimitsStore.get(query._id) || { count: 0 };
          const count = update.$inc?.count ? existing.count + update.$inc.count : (update.$set?.count || 1);
          rateLimitsStore.set(query._id, {
            _id: query._id,
            count,
            expiresAt: update.$set?.expiresAt || new Date(Date.now() + 3600000),
          });
          return { matchedCount: 1, modifiedCount: 1 };
        }
        if (name === "users") {
          if (update.$set) Object.assign(mockUser, update.$set);
          return { matchedCount: 1, modifiedCount: 1 };
        }
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async findOneAndUpdate(query: Record<string, any>, update: Record<string, any>) {
        if (name === "rate_limits") {
          const existing = rateLimitsStore.get(query._id);
          if (existing && existing.expiresAt > new Date()) {
            existing.count += update.$inc?.count || 1;
            rateLimitsStore.set(query._id, existing);
            return existing;
          }
          return null;
        }
        return null;
      },
      async deleteOne(query: Record<string, any>) {
        if (name === "rate_limits") {
          rateLimitsStore.delete(query._id);
          return { deletedCount: 1 };
        }
        return { deletedCount: 1 };
      },
    }),
  })),
  isDbUnavailableError: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  createSession: vi.fn(async () => "mock-session-token"),
}));

vi.mock("@/lib/audit", () => ({
  logAuthEvent: vi.fn(),
  getClientIp: vi.fn((req: Request) => req?.headers?.get("x-real-ip") || "127.0.0.1"),
}));

vi.mock("@/lib/suspicious-login", () => ({
  detectSuspiciousLogin: vi.fn(async () => ({ action: "allow", reasons: [] })),
}));

// Mock verification service
const VALID_OTP = "123456";
vi.mock("@/services/verification.service", () => ({
  getVerificationService: vi.fn(() => ({
    async checkVerification(phone: string, code: string) {
      return { success: code === VALID_OTP };
    },
  })),
}));

describe("Login Backstop & Step-Up OTP Verification", () => {
  beforeEach(async () => {
    rateLimitsStore.clear();
    mockUser.failedLoginAttempts = 0;
    mockUser.lockedUntil = undefined;
    passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  });

  it("normal login succeeds with correct password when backstop is not triggered", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, loginType: "admin" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("triggers backstop after 30 failed attempts, returning 429 stepUp: otp challenge for correct password", async () => {
    // 1. Simulate 30 failed login attempts across distributed IPs (wrong password)
    for (let i = 0; i < 30; i++) {
      const failReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": `10.0.0.${i + 1}` },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPassword!", loginType: "admin" }),
      });
      const failRes = await loginHandler(failReq);
      expect(failRes.status).toBe(401);
    }

    // 2. Now user enters CORRECT password without OTP: should return 429 stepUp: "otp"
    const reqNoOtp = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.100" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, loginType: "admin" }),
    });

    const resStepUp = await loginHandler(reqNoOtp);
    expect(resStepUp.status).toBe(429);
    const jsonStepUp = await resStepUp.json();
    expect(jsonStepUp.stepUp).toBe("otp");
    expect(jsonStepUp.hasPhone).toBe(true);
    expect(jsonStepUp.phoneHint).toBe("***3210");
  }, 20000);

  it("rejects login if password is WRONG, even if correct OTP is provided (OTP cannot bypass password)", async () => {
    // Trip backstop via 30 distributed failed attempts
    for (let i = 0; i < 30; i++) {
      await loginHandler(new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": `10.0.1.${i + 1}` },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPassword!", loginType: "admin" }),
      }));
    }

    // Attempt with WRONG password + CORRECT OTP
    const reqWrongPw = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.101" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: "StillWrongPassword!",
        otp: VALID_OTP,
        loginType: "admin",
      }),
    });

    const res = await loginHandler(reqWrongPw);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.message).toContain("Invalid email or password");
  }, 20000);

  it("rejects login if password is CORRECT but OTP is WRONG", async () => {
    // Trip backstop via 30 distributed failed attempts
    for (let i = 0; i < 30; i++) {
      await loginHandler(new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": `10.0.2.${i + 1}` },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPassword!", loginType: "admin" }),
      }));
    }

    // Attempt with CORRECT password + WRONG OTP
    const reqWrongOtp = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.102" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        otp: "999999",
        loginType: "admin",
      }),
    });

    const res = await loginHandler(reqWrongOtp);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.message).toContain("Invalid or expired OTP code");
  }, 20000);

  it("successfully logs in when BOTH password AND OTP are correct, and resets the backstop counter", async () => {
    // Trip backstop via 30 distributed failed attempts
    for (let i = 0; i < 30; i++) {
      await loginHandler(new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": `10.0.3.${i + 1}` },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPassword!", loginType: "admin" }),
      }));
    }

    // Attempt with CORRECT password + CORRECT OTP
    const reqSuccess = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.103" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        otp: VALID_OTP,
        loginType: "admin",
      }),
    });

    const res = await loginHandler(reqSuccess);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify backstop counter was RESET: subsequent login with just password succeeds
    const nextReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.103" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, loginType: "admin" }),
    });

    const nextRes = await loginHandler(nextReq);
    expect(nextRes.status).toBe(200);
  }, 20000);

  it("returns hasPhone: false ONLY AFTER password is correct, never on wrong password", async () => {
    // 1. Temporarily remove phone from account
    mockUser.phone = undefined;

    // 2. Trip backstop via 30 distributed failed attempts
    for (let i = 0; i < 30; i++) {
      await loginHandler(new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": `10.0.4.${i + 1}` },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPassword!", loginType: "admin" }),
      }));
    }

    // 3. Attempt with WRONG password when backstop is triggered on account without phone:
    // MUST return 401 Unauthorized — MUST NOT leak hasPhone: false or 429
    const reqWrong = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.104" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: "WrongPasswordAgain!", loginType: "admin" }),
    });
    const resWrong = await loginHandler(reqWrong);
    expect(resWrong.status).toBe(401);
    const jsonWrong = await resWrong.json();
    expect(jsonWrong.hasPhone).toBeUndefined();
    expect(jsonWrong.stepUp).toBeUndefined();

    // 4. Attempt with CORRECT password on account without phone:
    // Returns 429 stepUp: "otp" with hasPhone: false (only AFTER password is verified)
    const reqCorrect = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "192.168.1.104" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, loginType: "admin" }),
    });
    const resCorrect = await loginHandler(reqCorrect);
    expect(resCorrect.status).toBe(429);
    const jsonCorrect = await resCorrect.json();
    expect(jsonCorrect.stepUp).toBe("otp");
    expect(jsonCorrect.hasPhone).toBe(false);
    expect(jsonCorrect.phoneHint).toBeNull();
  }, 20000);
});
