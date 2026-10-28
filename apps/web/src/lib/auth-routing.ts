import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export const REFRESH_COOKIE_NAME = "refresh_token";

// ─── Admin-only routes that Staff cannot access ─────────────────
export const ADMIN_ONLY_ROUTES = [
  "/dashboard/analytics",
  "/dashboard/billing",
  "/dashboard/payments",
  "/dashboard/users",
  "/dashboard/audit",
  "/dashboard/upgrade",
  "/dashboard/machines",
  "/dashboard/clients",
  "/dashboard/assistant",
];

export interface RoutingRequest {
  nextUrl: {
    pathname: string;
    searchParams?: {
      has: (name: string) => boolean;
      get: (name: string) => string | null;
    };
  };
  auth?: {
    user?: {
      role?: string;
      company_setup_complete?: boolean;
    };
  } | null;
  cookies: { get: (name: string) => { value: string } | undefined };
  url: string;
}

/**
 * Validates whether a custom session ID cookie string is valid and active.
 * Empty strings, whitespace, "deleted", "undefined", or malformed tokens are treated as invalid.
 */
export function isValidSessionId(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed === "deleted" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed.length < 16
  ) {
    return false;
  }
  return true;
}

export function handleAuthRouting(req: RoutingRequest): Response | undefined {
  const { pathname, searchParams } = req.nextUrl;

  // Active authenticated sessions:
  // 1. NextAuth JWT session (verified user object)
  const hasNextAuth = Boolean(req.auth?.user);

  // 2. Custom session: must have a non-empty, valid-format session_id cookie
  const sessionCookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasCustomSession = isValidSessionId(sessionCookieVal);

  // Stale refresh_token alone is NOT an active login session.
  // Relying on refresh_token in middleware without session_id causes infinite bounce loops
  // between /login and /dashboard when the refresh token is expired or revoked.
  const isLoggedIn = hasNextAuth || hasCustomSession;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/admin/login" ||
    pathname === "/staff/login";

  // If user is explicitly logging out or on an auth page with error/logout query param,
  // never redirect to dashboard
  const isExplicitAuthFlow = Boolean(
    searchParams?.has("logout") ||
      searchParams?.has("error") ||
      searchParams?.has("logged_out")
  );

  // Redirect logged-in users away from landing page
  if (pathname === "/" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Redirect logged-in users away from login pages (unless explicit logout or error flow)
  if (isAuthPage && isLoggedIn && !isExplicitAuthFlow) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  // ─── Role-based route protection ──────────────────────────────
  // Block Staff users from accessing admin-only routes
  if (isLoggedIn && hasNextAuth && req.auth) {
    const userRole = req.auth.user?.role;
    if (userRole === "Staff") {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (isAdminRoute) {
        return Response.redirect(new URL("/access-denied", req.url));
      }
    }
    if (
      userRole === "Admin" &&
      req.auth.user?.company_setup_complete === false &&
      pathname.startsWith("/dashboard")
    ) {
      return Response.redirect(new URL("/setup", req.url));
    }
  }

  return undefined;
}
