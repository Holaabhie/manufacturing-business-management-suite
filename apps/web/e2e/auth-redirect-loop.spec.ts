import { test, expect } from "@playwright/test";

/**
 * Playwright E2E Suite: Auth Redirect Loop & Stale Cookie Resilience
 * ──────────────────────────────────────────────────────────────────
 * Verifies that:
 * 1. Logged-out visitor visiting / gets the static landing page.
 * 2. Visitor with expired/invalid session cookie gets the static landing page (no 302 bounce).
 * 3. Visitor with stale refresh_token cookie on /login renders login form without bounce loop.
 * 4. Visitor with ?logout=1 or ?error=1 on /login stays on /login even if session cookies linger.
 * 5. Unauthenticated visitor accessing /dashboard is safely redirected to /login.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

test.describe("Auth Redirect Loop & Stale Cookie Resilience", () => {
  test("1. Logged-out visitor visiting / renders static landing page", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("2. Visitor with expired/invalid session_id cookie stays on / without redirect loop", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "session_id",
        value: "deleted",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("3. Visitor with stale refresh_token on /login renders login without bouncing to /dashboard", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "refresh_token",
        value: "stale-refresh-uuid-12345678",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
  });

  test("4. Explicit /login?logout=1 does not redirect to /dashboard even if cookies exist", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "session_id",
        value: "sess-valid-uuid-format-123456789",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(`${BASE_URL}/login?logout=1`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
  });

  test("5. Unauthenticated visitor navigating to /dashboard is redirected to /login", async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
  });
});

