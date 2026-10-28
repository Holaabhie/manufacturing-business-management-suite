import { describe, it, expect } from "vitest";
import { handleAuthRouting, ADMIN_ONLY_ROUTES, REFRESH_COOKIE_NAME } from "@/lib/auth-routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

function createMockRequest(options: {
  pathname: string;
  cookies?: Record<string, string>;
  auth?: any;
  url?: string;
  searchParams?: Record<string, string>;
}) {
  const url = options.url || `http://localhost:3000${options.pathname}`;
  const cookiesMap = new Map<string, any>(
    Object.entries(options.cookies || {}).map(([k, v]) => [k, { value: v }])
  );
  const sp = new URLSearchParams(options.searchParams || {});

  return {
    nextUrl: {
      pathname: options.pathname,
      searchParams: {
        has: (name: string) => sp.has(name),
        get: (name: string) => sp.get(name),
      },
    },
    auth: options.auth ?? null,
    cookies: {
      get: (name: string) => cookiesMap.get(name),
    },
    url,
  };
}

describe("Landing Page & Middleware Auth Routing", () => {
  describe("Landing Route (/) Static vs Authenticated Behavior", () => {
    it("allows logged-out visitors to access landing page (returns undefined, no redirect)", () => {
      const req = createMockRequest({ pathname: "/" });
      const res = handleAuthRouting(req);
      expect(res).toBeUndefined();
    });

    it("redirects logged-in user with session_id cookie from / to /dashboard", () => {
      const req = createMockRequest({
        pathname: "/",
        cookies: { [SESSION_COOKIE_NAME]: "valid-session-guid" },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.status).toBe(302);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects logged-in user with NextAuth session from / to /dashboard", () => {
      const req = createMockRequest({
        pathname: "/",
        auth: { user: { id: "u-123", role: "Owner" } },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.status).toBe(302);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("does NOT redirect user with only a refresh_token (prevents stale token redirect loop)", () => {
      const req = createMockRequest({
        pathname: "/",
        cookies: { [REFRESH_COOKIE_NAME]: "valid-refresh-token-123456789" },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeUndefined();
    });

    it("does NOT redirect visitor with expired/invalid session_id cookie (empty or whitespace)", () => {
      const emptyReq = createMockRequest({
        pathname: "/",
        cookies: { [SESSION_COOKIE_NAME]: "" },
      });
      expect(handleAuthRouting(emptyReq)).toBeUndefined();

      const whitespaceReq = createMockRequest({
        pathname: "/",
        cookies: { [SESSION_COOKIE_NAME]: "   " },
      });
      expect(handleAuthRouting(whitespaceReq)).toBeUndefined();
    });

    it("does NOT redirect visitor with 'deleted' session_id cookie (post-logout cookie state)", () => {
      const req = createMockRequest({
        pathname: "/",
        cookies: { [SESSION_COOKIE_NAME]: "deleted" },
      });
      expect(handleAuthRouting(req)).toBeUndefined();
    });

    it("does NOT redirect visitor with short malformed session_id cookie", () => {
      const req = createMockRequest({
        pathname: "/",
        cookies: { [SESSION_COOKIE_NAME]: "short" },
      });
      expect(handleAuthRouting(req)).toBeUndefined();
    });
  });

  describe("Redirect Loop Prevention & Stale Cookie Resilience", () => {
    it("(1) expired/invalid session_id cookie on /login does NOT redirect to /dashboard", () => {
      for (const invalidVal of ["", "deleted", "undefined", "null", "short-val"]) {
        const req = createMockRequest({
          pathname: "/login",
          cookies: { [SESSION_COOKIE_NAME]: invalidVal },
        });
        const res = handleAuthRouting(req);
        // Must stay on /login (no redirect) so user can log in without bounce loop
        expect(res).toBeUndefined();
      }
    });

    it("(2) stale refresh_token alone on /login does NOT redirect to /dashboard", () => {
      const req = createMockRequest({
        pathname: "/login",
        cookies: { [REFRESH_COOKIE_NAME]: "stale-refresh-token-xyz-12345678" },
      });
      const res = handleAuthRouting(req);
      // Stale refresh token without session_id must not bounce to /dashboard
      expect(res).toBeUndefined();
    });

    it("(3) after logout when cookies are cleared, user can access /login without bounce loop", () => {
      const postLogoutReq = createMockRequest({
        pathname: "/login",
        cookies: {}, // cookies cleared by destroySession()
      });
      const res = handleAuthRouting(postLogoutReq);
      expect(res).toBeUndefined();
    });

    it("(4) visiting /login with explicit logout or error searchParams never redirects to /dashboard", () => {
      const validSessionId = "sess-12345678-abcd-1234-abcd-1234567890ab";
      for (const param of ["logout", "error", "logged_out"]) {
        const req = createMockRequest({
          pathname: "/login",
          cookies: { [SESSION_COOKIE_NAME]: validSessionId },
          searchParams: { [param]: "1" },
        });
        const res = handleAuthRouting(req);
        // Must stay on /login
        expect(res).toBeUndefined();
      }
    });
  });

  describe("Public Marketing Pages (Static Access)", () => {
    const marketingRoutes = ["/about", "/privacy", "/terms", "/refund", "/contact"];

    marketingRoutes.forEach((route) => {
      it(`allows unauthenticated access to marketing page ${route}`, () => {
        const req = createMockRequest({ pathname: route });
        const res = handleAuthRouting(req);
        expect(res).toBeUndefined();
      });
    });
  });

  describe("Login Pages Redirection", () => {
    it("allows logged-out visitors to access /login", () => {
      const req = createMockRequest({ pathname: "/login" });
      const res = handleAuthRouting(req);
      expect(res).toBeUndefined();
    });

    it("redirects logged-in users from /login to /dashboard", () => {
      const req = createMockRequest({
        pathname: "/login",
        cookies: { [SESSION_COOKIE_NAME]: "sess-valid-uuid-12345678-abcdef" },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects logged-in users from /admin/login and /staff/login to /dashboard", () => {
      for (const route of ["/admin/login", "/staff/login"]) {
        const req = createMockRequest({
          pathname: route,
          cookies: { [SESSION_COOKIE_NAME]: "sess-valid-uuid-12345678-abcdef" },
        });
        const res = handleAuthRouting(req);
        expect(res).toBeDefined();
        expect(res?.headers.get("location")).toBe("http://localhost:3000/dashboard");
      }
    });
  });

  describe("Dashboard Protection", () => {
    it("blocks unauthenticated access to /dashboard and redirects to /login", () => {
      const req = createMockRequest({ pathname: "/dashboard" });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.status).toBe(302);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("blocks unauthenticated access to deep dashboard subroutes (/dashboard/orders)", () => {
      const req = createMockRequest({ pathname: "/dashboard/orders" });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("allows authenticated access to /dashboard", () => {
      const req = createMockRequest({
        pathname: "/dashboard",
        cookies: { [SESSION_COOKIE_NAME]: "sess-active-valid-token-1234" },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeUndefined();
    });
  });

  describe("Role-Based Access Control", () => {
    it("blocks Staff from accessing admin-only routes", () => {
      for (const adminRoute of ADMIN_ONLY_ROUTES) {
        const req = createMockRequest({
          pathname: adminRoute,
          auth: { user: { id: "staff-1", role: "Staff" } },
        });
        const res = handleAuthRouting(req);
        expect(res).toBeDefined();
        expect(res?.headers.get("location")).toBe("http://localhost:3000/access-denied");
      }
    });

    it("redirects Admin with incomplete company setup to /setup", () => {
      const req = createMockRequest({
        pathname: "/dashboard",
        auth: { user: { id: "admin-1", role: "Admin", company_setup_complete: false } },
      });
      const res = handleAuthRouting(req);
      expect(res).toBeDefined();
      expect(res?.headers.get("location")).toBe("http://localhost:3000/setup");
    });
  });
});
